import { chromium } from "playwright-core";

export const markets = {
  brisbane: "Brisbane, QLD",
  goldcoast: "Gold Coast, QLD",
  sydney: "Sydney, NSW",
  melbourne: "Melbourne, VIC",
  perth: "Perth, WA",
  adelaide: "Adelaide, SA",
  canberra: "Canberra, ACT",
  hobart: "Hobart, TAS",
  darwin: "Darwin, NT",
};
const sportBike =
  /\b(?:gsx[\s-]?r|yzf|cbr|cb[\s-]?500|ninja|zx[\s-]?\d|panigale|fireblade|daytona|s[\s-]?1000[\s-]?rr|rsv4|hayabusa|katana|vfr|vtr|tl[\s-]?1000|fzr|zxr|r[167]\b)/i;
const parts =
  /\b(?:wrecking|wanted|breaking for parts|parting out|looking to buy|for parts only)\b/i;
const accessoryTitle =
  /\b(?:fairings?|engine only|wheels?|tyres?|rearsets?|seats?|helmets?|exhaust|spares?|parts|manual|fuel tank|covers?|brake pads|levers?|calipers?|chain|stator|clutch|mirrors?|sprocket|swingarm|radiator|footrests?|gaskets?|windscreen|battery|damper|subframe|forks?|speedo|projector|muffler|rotors?|kit)\b/i;
const auState =
  /\b(?:QLD|NSW|VIC|WA|SA|ACT|TAS|NT|Queensland|New South Wales|Victoria|Western Australia|South Australia|Tasmania|Northern Territory|Australian Capital Territory)\b/i;
export function publicMediaUrl(input) {
  try {
    const u = new URL(input);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      /(?:^|\.)(?:fbcdn\.net|fbsbx\.com|facebook\.com)$/.test(u.hostname)
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function facebookSource(input) {
  try {
    const u = new URL(input);
    if (
      u.protocol !== "https:" ||
      !/^(?:www\.|m\.)?facebook\.com$/.test(u.hostname) ||
      u.username ||
      u.password ||
      u.port
    )
      return "";
    if (
      /^\/watch\/?$/.test(u.pathname) &&
      /^\d+$/.test(u.searchParams.get("v") || "")
    )
      return "https://www.facebook.com/watch/?v=" + u.searchParams.get("v");
    if (
      !/^\/(?:marketplace\/item\/\d+|reel\/\d+|(?:[^/]+\/)?videos\/(?:[^/]+\/)?\d+|(?:groups\/[^/]+|[^/]+)\/(?:posts|permalink)\/[\w.-]+)\/?$/.test(
        u.pathname,
      )
    )
      return "";
    return "https://www.facebook.com" + u.pathname.replace(/\/?$/, "/");
  } catch {
    return "";
  }
}
function access(text, url, code) {
  if (
    code === 429 ||
    /you.re going too fast|limit how often|too many requests|rate limit/i.test(
      text,
    )
  )
    return "rate_limited";
  if (
    code === 403 ||
    /\/checkpoint\/|\/challenge\//.test(url) ||
    /temporarily blocked|account has been restricted|confirm you are human|enter the characters you see/i.test(
      text,
    )
  )
    return "blocked";
  if (
    /\/login(?:[/?]|$)/.test(url) ||
    /you must log in|log in to continue|log in to see this/i.test(text)
  )
    return "login_required";
  return "";
}
const reasons = {
  rate_limited: "Facebook displayed a request limit. The search stopped.",
  blocked:
    "Facebook refused this request or displayed an access checkpoint. The search stopped.",
  login_required:
    "Facebook requested a login to see this content. The public search stopped.",
  limited: "Facebook did not expose enough public data to verify this search.",
};
function ageDays(label) {
  if (/\btoday\b|just now/i.test(label)) return 0;
  if (/\byesterday\b/i.test(label)) return 1;
  const m = label.match(/(\d+|an?|one)\s+(minute|hour|day|week|month)s? ago/i);
  return m
    ? (Number(m[1]) || 1) *
        { minute: 1 / 1440, hour: 1 / 24, day: 1, week: 7, month: 30 }[
          m[2].toLowerCase()
        ]
    : null;
}
function parsePrice(line = "") {
  const value = line.match(/(?:AU|A)?\$\s*([\d,]+)/i);
  return value ? Number(value[1].replaceAll(",", "")) : null;
}
export function advertisedContact(description) {
  const emails = description.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) || [];
  const phones = [
    ...description.matchAll(
      /(?:call|phone|contact|text|mobile)(?: me)?(?: on)?\s*[:\-]?\s*((?:\+61|0)(?:[ ()-]*\d){9})\b/gi,
    ),
  ].map((match) => match[1].trim());
  return [...new Set([...emails, ...phones])].slice(0, 4).join("\n");
}
export function dealerMatch(
  { sourceUrl, year, priceAud, title, location, description = "" },
  stock,
) {
  if (
    /gclsmotorsports|L\s*(?:&|and)\s*S Motorsports/i.test(
      sourceUrl + " " + description,
    )
  )
    return true;
  return stock.some(
    (b) =>
      (facebookSource(b.source) && facebookSource(b.source) === sourceUrl) ||
      (year &&
        b.year === year &&
        priceAud &&
        b.price === priceAud &&
        title.toLowerCase().includes(b.make.toLowerCase()) &&
        /gold coast|broadbeach/i.test(location)),
  );
}
export async function observeMarketplace(
  { city, days, focus, stock },
  { signal, onPhase } = {},
) {
  const url = new URL(
    "https://www.facebook.com/marketplace/" + city + "/search/",
  );
  url.searchParams.set("query", focus);
  url.searchParams.set("daysSinceListed", String(days));
  const result = {
    searchUrl: url.href,
    candidates: [],
    observation: {
      status: "unknown",
      message: "",
      dateFilterConfirmed: false,
      returnedCount: 0,
    },
  };
  const obs = result.observation;
  let browser;
  const close = () => {
    browser?.close().catch(() => {});
  };
  try {
    signal?.throwIfAborted();
    browser = await chromium.launch(
      process.env.MARKETPLACE_BROWSER_PATH
        ? { executablePath: process.env.MARKETPLACE_BROWSER_PATH }
        : { channel: "chromium" },
    );
    signal?.addEventListener("abort", close, { once: true });
    signal?.throwIfAborted();
    const context = await browser.newContext({
      locale: "en-AU",
      timezoneId: "Australia/Brisbane",
    });
    const page = await context.newPage();
    const response = await page.goto(url.href, {
      waitUntil: "domcontentloaded",
      timeout: 22000,
    });
    await page
      .locator('a[href*="/marketplace/item/"]')
      .first()
      .waitFor({ state: "attached", timeout: 5500 })
      .catch(() => {});
    const body = await page.locator("body").innerText();
    const blocked = access(body, page.url(), response?.status());
    if (blocked) {
      Object.assign(obs, { status: blocked, message: reasons[blocked] });
      return result;
    }
    const cards = await page
      .locator('a[href*="/marketplace/item/"]')
      .evaluateAll((links) =>
        links.map((a) => {
          // Before Facebook's layout CSS arrives, innerText can concatenate the
          // price, title and locality. Their individual DOM text nodes remain distinct.
          const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
          const fields = [];
          while (walker.nextNode()) {
            const value = walker.currentNode.textContent.trim();
            if (value) fields.push(value);
          }
          const lines = [
            ...new Set([
              ...fields,
              ...a.innerText.split("\n").map((x) => x.trim()),
            ]),
          ].filter(Boolean);
          return {
            url: a.href,
            lines,
            image: a.querySelector("img")?.currentSrc,
          };
        }),
      );
    const unique = new Map();
    for (const card of cards) {
      const sourceUrl = facebookSource(card.url);
      if (sourceUrl && !unique.has(sourceUrl)) unique.set(sourceUrl, card);
    }
    obs.returnedCount = unique.size;
    const dateFilterLabel =
      body.match(
        /date listed\s*[:·]?\s*((?:last|past)\s+(?:\d+\s+)?(?:hours?|days?))/i,
      )?.[1] || "";
    obs.dateFilterConfirmed = (
      days === 1
        ? /last 24 hours|past 24 hours|last day/i
        : new RegExp("(?:last|past) " + days + " days", "i")
    ).test(dateFilterLabel);
    if (!unique.size) {
      obs.status = /no (?:listings|results)|couldn.t find any results/i.test(
        body,
      )
        ? "accessible"
        : "limited";
      obs.message =
        obs.status === "accessible"
          ? "Facebook returned no results in this search."
          : reasons.limited;
      return result;
    }
    const area = body
      .split("\n")
      .map((x) => x.trim())
      .find((x) => /within \d+\s*(?:km|miles)/i.test(x))
      ?.replace(/^[·\s]+/, "");
    const marketLocation = body.match(/(?:^|\n)Location\s*\n([^\n]+)/i)?.[1];
    if (
      marketLocation?.includes(",") &&
      !marketLocation
        .toLowerCase()
        .includes(markets[city].split(",")[0].toLowerCase())
    ) {
      obs.status = "limited";
      obs.message =
        "Facebook displayed a different location from the selected Australian city.";
      return result;
    }
    obs.status = "accessible";
    obs.message =
      unique.size +
      " item links were visible around " +
      markets[city] +
      (area ? " (" + area + ")" : "") +
      ".";
    let visited = 0;
    for (const [sourceUrl, card] of unique) {
      signal?.throwIfAborted();
      const location =
        card.lines.find((s) => auState.test(s) && !/\$/.test(s)) || "";
      const title =
        card.lines.find(
          (s) => sportBike.test(s) && !/\$/.test(s) && !auState.test(s),
        ) || "";
      const priceAud = card.lines.map(parsePrice).find((n) => n > 0) || null;
      const year = Number(title.match(/\b(?:19|20)\d{2}\b/)?.[0]) || null;
      if (
        !location ||
        !title ||
        accessoryTitle.test(title) ||
        parts.test(title) ||
        !priceAud ||
        dealerMatch({ sourceUrl, year, priceAud, title, location }, stock)
      )
        continue;
      if (++visited > 8) break;
      onPhase?.(
        "Checking public ad " + visited + " near " + markets[city] + ".",
      );
      const detail = await page
        .goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 15000 })
        .catch(() => null);
      if (!detail) continue;
      await page
        .getByText(/Listed .* (?:ago|in) /i)
        .first()
        .waitFor({ timeout: 2200 })
        .catch(() => {});
      const bodyText = await page.locator("body").innerText();
      const stop = access(bodyText, page.url(), detail.status());
      if (stop) {
        obs.status = stop;
        obs.message = reasons[stop];
        break;
      }
      const descriptionHeading = page
        .getByText(/^seller.s description$/i)
        .first();
      const expand = descriptionHeading
        .locator("xpath=../..")
        .getByText(/^see more$/i)
        .first();
      const expanded =
        (await expand.isVisible().catch(() => false)) &&
        (await expand.click({ timeout: 1000 }).then(
          () => true,
          () => false,
        ));
      const ad = (
        expanded ? await page.locator("body").innerText() : bodyText
      ).split(/Seller information|Seller details|Today.s picks/i)[0];
      if (
        !ad
          .toLowerCase()
          .replace(/[\s-]/g, "")
          .includes(title.toLowerCase().replace(/[\s-]/g, "")) ||
        /\b(?:marked as sold|this listing is no longer available|this item has been sold|sold ·)\b/i.test(
          ad,
        )
      )
        continue;
      const listedLabel = ad.match(/(?:^|\n)(Listed [^\n]{3,120})/i)?.[1] || "";
      const age = ageDays(listedLabel);
      if (age != null ? age > days : !obs.dateFilterConfirmed) continue;
      const description = (
        ad.split(/seller.s description\s*\n|(?:^|\n)Description\s*\n/i)[1] || ""
      )
        .split(
          /\n\s*(?:See more|See less|Location is approximate|[^\n]* · Location is approximate)/i,
        )[0]
        .trim()
        .slice(0, 9000);
      if (
        !description ||
        parts.test(description.slice(0, 110)) ||
        dealerMatch(
          { sourceUrl, year, priceAud, title, location, description },
          stock,
        )
      )
        continue;
      const gallery = await page.evaluate(() => {
        const images = Array.from(
          document.querySelectorAll(
            '[aria-label^="View photo"] img[alt^="Product photo"]',
          ),
        );
        const adDescription = [
          ...document.querySelectorAll("span, h2, h3"),
        ].find(
          (node) =>
            node.childElementCount === 0 &&
            /^seller.s description$/i.test(node.textContent.trim()),
        );
        const main = adDescription?.closest('[role="main"], main');
        const videoNodes = main
          ? [...main.querySelectorAll("video")].filter(
              (node) =>
                node.compareDocumentPosition(adDescription) &
                Node.DOCUMENT_POSITION_FOLLOWING,
            )
          : [];
        return {
          image: document.querySelector('meta[property="og:image"]')?.content,
          gallery: images.slice(1, 30).map((img) => img.currentSrc || img.src),
          videos: [
            ...videoNodes.map((node) => node.currentSrc || node.src),
            document.querySelector('meta[property="og:video:secure_url"]')
              ?.content,
            document.querySelector('meta[property="og:video"]')?.content,
          ],
        };
      });
      const media = [
        ...new Set(
          [gallery.image || card.image, ...gallery.gallery]
            .map(publicMediaUrl)
            .filter(Boolean),
        ),
      ].map((url) => ({ kind: "image", url }));
      for (const url of new Set(
        gallery.videos.map(publicMediaUrl).filter(Boolean),
      ))
        media.push({ kind: "video", url });
      const odometer = description.match(
        /\b(\d{1,3}(?:,\d{3})+|\d{3,7})\s*(?:km|kilometres)\b/i,
      );
      const contact = advertisedContact(description);
      result.candidates.push({
        title,
        location,
        year,
        priceAud,
        listedLabel,
        sourceUrl,
        description,
        advertisedDate: null,
        odometerKm: odometer ? Number(odometer[1].replaceAll(",", "")) : null,
        media,
        contact,
        dateFilterConfirmed: obs.dateFilterConfirmed,
        dateWindowVerified:
          obs.dateFilterConfirmed || (age !== null && age <= days),
      });
    }
    obs.adsChecked = Math.min(visited, 8);
    if (
      obs.status === "accessible" &&
      obs.adsChecked > 0 &&
      !result.candidates.length
    ) {
      obs.status = "limited";
      obs.message +=
        " No individual ad with sufficient recent sale details was verified.";
    }
  } catch (e) {
    signal?.throwIfAborted();
    obs.status = "limited";
    obs.message = /Executable doesn't exist|browserType.launch/i.test(e.message)
      ? "Chromium could not start. Install the browser on the server with npx playwright-core install chromium, or set MARKETPLACE_BROWSER_PATH."
      : "The public Marketplace request did not finish. " +
        (result.candidates.length
          ? "Previously checked ads were retained."
          : "No direct ads were verified.");
  } finally {
    signal?.removeEventListener("abort", close);
    await browser?.close().catch(() => {});
  }
  return result;
}
