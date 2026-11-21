import { chromium } from "playwright-core";
import {
  advertisedContact,
  facebookSource,
  publicMediaUrl,
} from "./marketplace.js";

const fold = (text) =>
  (text || "")
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/[‐‑–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
const money = /(?:AUD\s*|AU|A)?\$\s*([\d,]+)(?:\.(\d\d))?/gi;
const dateWithMonth =
  /\b(?:\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/i;
const notForSale =
  /(?:\b(?:marked as sold|sold pending|parting out|swap only|wanted to buy|looking to buy|no longer (?:available|for sale)|sold out)\b|^\s*SOLD\b|\bgclsmotorsports\b|\bL\s*(?:&|and)\s*S\s+Motorsports\b)/i;
const stateName =
  /\b(?:Australia|Queensland|New South Wales|Victoria|Western Australia|South Australia|Tasmania|Northern Territory|Australian Capital Territory)\b/i;
const stateCode = /\b(?:QLD|NSW|VIC|WA|SA|TAS|NT|ACT|AU)\b/;
function australianLocation(description, locality, city) {
  const place = fold(locality),
    centre = fold(city.split(",")[0]);
  if (centre && place.includes(centre)) return true;
  if (stateName.test(locality) || stateCode.test(locality)) return true;
  const sentence =
    description.split(/[\n.!?]/).find((line) => fold(line).includes(place)) ||
    "";
  const index = sentence.toLowerCase().indexOf(locality.toLowerCase());
  if (index < 0) return false;
  const nearby = sentence.slice(
    Math.max(0, index - 14),
    index + locality.length + 35,
  );
  return stateName.test(nearby) || stateCode.test(nearby);
}
function restriction(value, status) {
  if (
    status === 429 ||
    /rate limit|too many requests|limit how often|you.re going too fast/i.test(
      value,
    )
  )
    return "rate_limited";
  if (
    status === 401 ||
    /\/login(?:[/?]|$)|you (?:must|need to) log in|log in to (?:continue|see this)/i.test(
      value,
    )
  )
    return "login_required";
  if (
    status === 403 ||
    /\/(?:checkpoint|challenge)(?:[/?]|$)|temporarily blocked|confirm you are human/i.test(
      value,
    )
  )
    return "blocked";
  return "";
}

function sourceDate(value, locationDate) {
  const text = (value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (
    /^\d{4}-\d{2}-\d{2}T/.test(text) &&
    /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)
  ) {
    const date = new Date(text);
    if (Number.isFinite(date.getTime())) return locationDate(date);
  }
  const human = text.match(dateWithMonth)?.[0];
  if (human) {
    const date = new Date(human + " 00:00 UTC");
    if (Number.isFinite(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return "";
}

// Only information attached to this exact post is eligible. Sidebars, comments and suggested posts
// often contain unrelated prices, locations and dates on the same Facebook page.
async function readPrimary(page, sourceUrl) {
  return page.evaluate((source) => {
    const meta = (key) =>
      document.querySelector('meta[property="' + key + '"]')?.content || "";
    const identity = (value) => {
      try {
        const url = new URL(value, location.href);
        return (
          url.pathname.replace(/\/$/, "") +
          (url.pathname.startsWith("/watch")
            ? "?v=" + url.searchParams.get("v")
            : "")
        );
      } catch {
        return "";
      }
    };
    const target = identity(source);
    const primaryLink = [
      ...document.querySelectorAll('[role="article"] a[href],article a[href]'),
    ].find(
      (a) =>
        identity(a.href) === target && !a.closest('[aria-label^="Comment"]'),
    );
    const article = primaryLink?.closest('[role="article"],article');
    const canonicalMatches = [
      meta("og:url"),
      document.querySelector("link[rel=canonical]")?.href,
    ].some((value) => value && identity(value) === target);
    if (!canonicalMatches && !article) return null;
    const seller = article?.querySelector(
      '[data-ad-preview="message"],[data-ad-comet-preview="message"]',
    );
    const parts = [
      seller?.innerText,
      canonicalMatches && meta("og:title"),
      canonicalMatches && meta("og:description"),
    ].filter(Boolean);
    const dates = [
      canonicalMatches && meta("article:published_time"),
      canonicalMatches && meta("video:release_date"),
      primaryLink?.querySelector("time")?.dateTime,
      primaryLink?.getAttribute("aria-label"),
      primaryLink?.getAttribute("title"),
      primaryLink?.innerText,
    ].filter(Boolean);
    if (canonicalMatches) {
      for (const script of document.querySelectorAll(
        'script[type="application/ld+json"]',
      )) {
        let doc;
        try {
          doc = JSON.parse(script.textContent);
        } catch {
          continue;
        }
        for (const item of Array.isArray(doc)
          ? doc
          : doc?.["@graph"] || [doc]) {
          if (
            !item ||
            ![
              "VideoObject",
              "SocialMediaPosting",
              "DiscussionForumPosting",
            ].includes(item["@type"])
          )
            continue;
          const link =
            item.url || item.mainEntityOfPage?.["@id"] || item["@id"];
          if (typeof link !== "string" || identity(link) !== target) continue;
          dates.push(item.datePublished || item.uploadDate);
          if (typeof item.articleBody === "string")
            parts.push(item.articleBody);
        }
      }
    }
    const media = [];
    if (canonicalMatches) {
      media.push(
        { kind: "image", url: meta("og:image:secure_url") || meta("og:image") },
        { kind: "video", url: meta("og:video:secure_url") || meta("og:video") },
      );
    }
    if (seller)
      for (const node of seller.querySelectorAll("img[src],video")) {
        if (node.tagName === "IMG" && node.naturalWidth >= 240)
          media.push({ kind: "image", url: node.currentSrc });
        if (node.tagName === "VIDEO") {
          if (node.poster) media.push({ kind: "image", url: node.poster });
          media.push({ kind: "video", url: node.currentSrc });
        }
      }
    return { description: parts.join("\n").slice(0, 9000), dates, media };
  }, sourceUrl);
}

export async function verifyFacebookOffers(
  rows,
  { signal, city, locationDate, dateEligible } = {},
) {
  const verified = new Map();
  let stopped = "";
  if (!rows.length) return { verified, stopped };
  let browser;
  const deadline = AbortSignal.timeout(28_000);
  const shouldStop = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const close = () => {
    browser?.close().catch(() => {});
  };
  shouldStop.addEventListener("abort", close, { once: true });
  try {
    shouldStop.throwIfAborted();
    browser = await chromium.launch(
      process.env.MARKETPLACE_BROWSER_PATH
        ? {
            executablePath: process.env.MARKETPLACE_BROWSER_PATH,
            timeout: 8000,
          }
        : { channel: "chromium", timeout: 8000 },
    );
    shouldStop.throwIfAborted();
    const context = await browser.newContext({
      locale: "en-AU",
      timezoneId: "Australia/Brisbane",
      serviceWorkers: "block",
    });
    await context.route("**/*", (route) => {
      let host;
      try {
        host = new URL(route.request().url()).hostname;
      } catch {
        return route.abort();
      }
      return /(?:^|\.)(?:facebook\.com|fbcdn\.net|fbsbx\.com)$/.test(host)
        ? route.continue()
        : route.abort();
    });
    const page = await context.newPage();
    for (const row of rows.slice(0, 4)) {
      shouldStop.throwIfAborted();
      const url = facebookSource(row.sourceUrl);
      if (!url || /\/gclsmotorsports\//i.test(url)) continue;
      const response = await page
        .goto(url, { timeout: 7000, waitUntil: "domcontentloaded" })
        .catch(() => null);
      if (!response) continue;
      stopped = restriction(page.url(), response.status());
      if (stopped) break;
      if (!response.ok() || facebookSource(page.url()) !== url) continue;
      stopped = restriction(
        await page.locator("body").innerText({ timeout: 2000 }),
        response.status(),
      );
      if (stopped) break;
      const post = await readPrimary(page, url);
      if (!post) continue;
      const copy = fold(post.description),
        title = fold(row.title),
        location = fold(row.location);
      if (
        title.length < 5 ||
        location.length < 3 ||
        !copy.includes(title) ||
        !copy.includes(location)
      )
        continue;
      if (!australianLocation(post.description, row.location, city)) continue;
      if (
        notForSale.test(post.description) ||
        !/\b(?:for sale|selling|asking|ono|negotiable|price drop|price reduced|sell my|up for grabs)\b/i.test(
          copy,
        )
      )
        continue;
      const advertisedDate = post.dates
        .map((value) => sourceDate(value, locationDate))
        .find(dateEligible);
      if (!advertisedDate) continue;
      const prices = [...post.description.matchAll(money)].map(
        (m) => Number(m[1].replaceAll(",", "")) + Number(m[2] || 0) / 100,
      );
      const priceAud =
        Number.isSafeInteger(row.priceAud) && prices.includes(row.priceAud)
          ? row.priceAud
          : null;
      const km = post.description.match(
        /\b(\d{1,3}(?:,\d{3})+|\d{3,7})\s*(?:km|kilometres)\b/i,
      );
      const year =
        Number.isInteger(row.year) &&
        new RegExp("\\b" + row.year + "\\b").test(copy)
          ? row.year
          : null;
      const contact = advertisedContact(post.description);
      const media = [
        ...new Map(
          post.media
            .map((item) => ({ kind: item.kind, url: publicMediaUrl(item.url) }))
            .filter((item) => item.url)
            .map((item) => [item.url, item]),
        ).values(),
      ].slice(0, 32);
      verified.set(url, {
        title: row.title,
        location: row.location,
        advertisedDate,
        priceAud,
        year,
        description: post.description,
        odometerKm: km ? Number(km[1].replaceAll(",", "")) : null,
        contact,
        media,
      });
    }
  } catch {
    signal?.throwIfAborted();
    stopped ||= "limited";
  } finally {
    shouldStop.removeEventListener("abort", close);
    await browser?.close().catch(() => {});
  }
  return { verified, stopped };
}
