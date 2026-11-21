import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  observeMarketplace,
  dealerMatch,
  facebookSource,
  markets,
  publicMediaUrl,
} from "./marketplace.js";

const time = () => new Date().toISOString();
const trim = (s, n) => (typeof s === "string" ? s.trim().slice(0, n) : "");
const amount = (n) => (Number.isSafeInteger(n) && n >= 0 ? n : null);
const counts = Object.fromEntries(
  ["films", "albums"].map((k) => [
    k,
    JSON.parse(
      readFileSync(
        new URL("../src/data/" + k + ".json", import.meta.url),
        "utf8",
      ),
    ).length,
  ]),
);
const reviewStates = ["New", "Shortlisted", "Dismissed"];
const agent = () => import("./codex-agent.js");
function bad(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
function modelFocus(stock) {
  const examples = stock.filter(
    (b) => (b.status === "Sold" || b.status === "Archive") && b.make && b.model,
  );
  const rows = (examples.length ? examples : stock).filter(
    (b) => b.make && b.model,
  );
  const names = new Map();
  for (const b of rows) {
    const name =
      b.make + " " + b.model.split(/\s+(?:L\d|K\d|M\d|SRAD|Import)\b/i)[0];
    names.set(name, (names.get(name) || 0) + 1);
  }
  return [...names].sort((a, b) => b[1] - a[1])[0]?.[0] || "Suzuki GSX-R750";
}
async function photoBytes(url, signal) {
  if (!publicMediaUrl(url)) return null;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(6500)]),
      redirect: "error",
      headers: { Accept: "image/webp,image/jpeg,image/png" },
    });
    const mime = response.headers.get("content-type")?.split(";")[0];
    if (
      !response.ok ||
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(mime) ||
      Number(response.headers.get("content-length")) > 3_000_000
    ) {
      await response.body?.cancel();
      return null;
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 3_000_000) return null;
      chunks.push(chunk);
    }
    return size ? { mime, bytes: Buffer.concat(chunks) } : null;
  } catch {
    return null;
  }
}
export function installSourcing(app, { db, list, limit }) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS sourcing_runs(id TEXT PRIMARY KEY,started TEXT NOT NULL,owner INTEGER NOT NULL,status TEXT NOT NULL,body TEXT NOT NULL); CREATE UNIQUE INDEX IF NOT EXISTS one_sourcing_run ON sourcing_runs(status) WHERE status='running'; CREATE TABLE IF NOT EXISTS sourcing_leads(id TEXT PRIMARY KEY,source TEXT NOT NULL UNIQUE,review TEXT NOT NULL,seen TEXT NOT NULL,body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sourcing_images(id TEXT PRIMARY KEY,mime TEXT NOT NULL,bytes BLOB NOT NULL)",
  );
  const active = new Map();
  let asking = false;
  function update(run, values) {
    Object.assign(run, values);
    db.prepare("UPDATE sourcing_runs SET status=?,body=? WHERE id=?").run(
      run.status,
      JSON.stringify(run),
      run.id,
    );
  }
  for (const old of db
    .prepare("SELECT * FROM sourcing_runs WHERE status='running'")
    .all()) {
    let alive = true;
    try {
      process.kill(old.owner, 0);
    } catch {
      alive = false;
    }
    if (!alive || Date.now() - new Date(old.started).valueOf() > 20 * 60000)
      update(JSON.parse(old.body), {
        status: "interrupted",
        message:
          "The server stopped during this search. Previously verified leads are saved.",
      });
  }
  const allLeads = () =>
    db
      .prepare(
        "SELECT l.*,i.id AS cached FROM sourcing_leads l LEFT JOIN sourcing_images i ON i.id=l.id ORDER BY l.seen DESC,coalesce(json_extract(l.body,'$.rank'),999),l.rowid",
      )
      .all()
      .map((row) => ({
        ...JSON.parse(row.body),
        id: row.id,
        reviewStatus: row.review,
        checkedAt: row.seen,
        preview: row.cached ? "/api/admin/sourcing/media/" + row.id : null,
      }));
  function saveLead(record, now) {
    const sourceUrl = facebookSource(record.sourceUrl);
    if (!sourceUrl || !trim(record.title, 180) || !trim(record.location, 140))
      return null;
    const id =
      db.prepare("SELECT id FROM sourcing_leads WHERE source=?").get(sourceUrl)
        ?.id || randomUUID();
    const media = (Array.isArray(record.media) ? record.media : [])
      .map((m) => ({ kind: m.kind, url: publicMediaUrl(m.url) }))
      .filter((m) => m.url && ["image", "video"].includes(m.kind))
      .slice(0, 32);
    const clean = {
      title: trim(record.title, 180),
      location: trim(record.location, 140),
      year: amount(record.year),
      priceAud: amount(record.priceAud),
      odometerKm: amount(record.odometerKm),
      sourceUrl,
      listedLabel: trim(record.listedLabel, 160),
      advertisedDate: trim(record.advertisedDate, 30),
      description: trim(record.description, 9000),
      evidence: trim(record.evidence, 700),
      notes: trim(record.notes, 550),
      rank: amount(record.rank),
      contact: trim(record.contact, 360),
      media,
      provenance:
        record.provenance === "web_search"
          ? "web_search"
          : "marketplace_connector",
    };
    db.prepare(
      "INSERT INTO sourcing_leads VALUES(?,?,?,?,?) ON CONFLICT(source) DO UPDATE SET seen=excluded.seen,body=excluded.body",
    ).run(id, sourceUrl, "New", now, JSON.stringify(clean));
    return { id, photo: media.find((m) => m.kind === "image")?.url };
  }
  async function search(run, controller) {
    const signal = controller.signal,
      stock = list();
    try {
      const direct = await observeMarketplace(
        { city: run.city, days: run.days, focus: run.focus, stock },
        { signal, onPhase: (message) => update(run, { message }) },
      );
      signal.throwIfAborted();
      const checkedAt = time();
      const verified = new Map(),
        images = [];
      for (const row of direct.candidates) {
        if (
          /\b(?:50|80|110|125|150)\s*cc\b/i.test(
            row.title + " " + row.description.slice(0, 140),
          ) &&
          !/\b(?:125|150|small|learner)/i.test(run.focus)
        )
          continue;
        const lead = {
          ...row,
          evidence: row.description.slice(0, 350),
          provenance: "marketplace_connector",
        };
        const saved = saveLead(lead, checkedAt);
        if (saved) {
          verified.set(row.sourceUrl, lead);
          images.push(saved);
        }
      }
      update(run, {
        coverage: direct.observation,
        searchUrl: direct.searchUrl,
        total: verified.size,
        message:
          verified.size +
          " verified ads saved. Codex is checking matches and public Facebook posts and videos.",
      });
      await Promise.all(
        images.map(async ({ id, photo }) => {
          if (
            !photo ||
            db.prepare("SELECT 1 FROM sourcing_images WHERE id=?").get(id)
          )
            return;
          const image = await photoBytes(photo, signal);
          if (image)
            db.prepare(
              "INSERT OR REPLACE INTO sourcing_images VALUES(?,?,?)",
            ).run(id, image.mime, image.bytes);
        }),
      );
      signal.throwIfAborted();
      if (["blocked", "rate_limited"].includes(direct.observation.status)) {
        update(run, {
          status: "partial",
          ended: time(),
          message:
            verified.size +
            " verified ads saved. Search stopped at Facebook’s access restriction.",
        });
        return;
      }
      const { sourceMotorcycles } = await agent();
      const recordReview = (suggestion, rank) => {
        const original = verified.get(facebookSource(suggestion.sourceUrl));
        if (!original) return;
        saveLead(
          {
            ...original,
            rank,
            notes: suggestion.notes,
            evidence: suggestion.evidence || original.evidence,
          },
          checkedAt,
        );
      };
      const result = await sourceMotorcycles(
        {
          location: run.location,
          days: run.days,
          focus: run.focus,
          checkedAt,
          models: stock.map((b) => ({
            make: b.make,
            model: b.model,
            year: b.year,
            category: b.category,
            status: b.status,
          })),
          marketplaceUrl: direct.searchUrl,
          marketplaceObservation: direct.observation,
          marketplaceCandidates: [...verified.values()],
        },
        {
          signal,
          onReviewed(leads) {
            signal.throwIfAborted();
            leads.forEach((lead, index) => recordReview(lead, index + 1));
            update(run, {
              message:
                leads.length +
                " motorcycle assessments saved. Checking public Facebook posts and reels.",
            });
          },
        },
      );
      signal.throwIfAborted();
      const additional = new Set();
      let ranked = 0;
      let agentReviewed = 0;
      for (const suggestion of result.leads || []) {
        const url = facebookSource(suggestion.sourceUrl);
        const original = verified.get(url);
        if (
          !url ||
          dealerMatch(
            {
              ...suggestion,
              sourceUrl: url,
              title: suggestion.title || "",
              location: suggestion.location || "",
            },
            stock,
          )
        )
          continue;
        if (suggestion.assessment === "codex") agentReviewed++;
        if (original) {
          recordReview(suggestion, ++ranked);
        } else if (suggestion.provenance === "web_search") {
          const saved = saveLead({ ...suggestion, rank: ++ranked }, checkedAt);
          if (saved) {
            additional.add(url);
            if (saved.photo) {
              const pic = await photoBytes(saved.photo, signal);
              if (pic)
                db.prepare(
                  "INSERT OR REPLACE INTO sourcing_images VALUES(?,?,?)",
                ).run(saved.id, pic.mime, pic.bytes);
            }
          }
        }
      }
      const total = verified.size + additional.size;
      const coverage =
        direct.observation.status === "accessible"
          ? direct.observation
          : result.marketplaceCoverage || direct.observation;
      update(run, {
        status:
          coverage.status === "accessible" &&
          !["rate_limited", "login_required", "blocked", "limited"].includes(
            result.supplementalCoverage?.status,
          )
            ? "complete"
            : "partial",
        ended: time(),
        total,
        coverage,
        supplementalCoverage: result.supplementalCoverage,
        message:
          total +
          " verified leads saved. " +
          (agentReviewed
            ? "Codex reviewed " + agentReviewed + " for showroom fit. "
            : "") +
          (ranked > agentReviewed
            ? ranked - agentReviewed + " assessed using model-family matching."
            : ""),
        searchSourceUrls: (result.searchSourceUrls || [])
          .map(facebookSource)
          .filter(Boolean)
          .slice(0, 20),
      });
    } catch (e) {
      const stopped = signal.aborted;
      update(run, {
        status: stopped ? "cancelled" : run.coverage ? "partial" : "failed",
        ended: time(),
        message: stopped
          ? "Search stopped. Previously verified leads are saved."
          : (run.total || 0) +
            " verified leads saved. " +
            trim(e.message || "Codex was unavailable.", 450),
      });
    } finally {
      active.delete(run.id);
    }
  }
  app.get("/api/admin/sourcing", (req, res) => {
    const row = db
      .prepare("SELECT body FROM sourcing_runs ORDER BY started DESC LIMIT 1")
      .get();
    res.json({
      markets: Object.entries(markets).map(([value, label]) => ({
        value,
        label,
      })),
      defaultFocus: modelFocus(list()),
      latest: row ? JSON.parse(row.body) : null,
      leads: allLeads(),
    });
  });
  app.get("/api/admin/sourcing/media/:id", (req, res) => {
    const row = db
      .prepare("SELECT * FROM sourcing_images WHERE id=?")
      .get(req.params.id);
    if (!row) bad("Photo unavailable.", 404);
    res.type(row.mime).send(Buffer.from(row.bytes));
  });
  app.post("/api/admin/sourcing/runs", (req, res) => {
    const { city, days, focus = "" } = req.body || {};
    if (
      !Object.hasOwn(markets, city) ||
      ![1, 7, 30].includes(days) ||
      typeof focus !== "string" ||
      focus.length > 90
    )
      bad(
        "Choose an Australian city, a date window and a model of up to 90 characters.",
      );
    if (db.prepare("SELECT id FROM sourcing_runs WHERE status='running'").get())
      bad("A search is already running.", 409);
    limit("sourcing:" + req.ip, 8, 3600000);
    const run = {
      id: randomUUID(),
      started: time(),
      status: "running",
      city,
      location: markets[city],
      days,
      focus: focus.trim() || modelFocus(list()),
      message: "Opening public Marketplace results.",
      total: 0,
    };
    db.prepare("INSERT INTO sourcing_runs VALUES(?,?,?,?,?)").run(
      run.id,
      run.started,
      process.pid,
      run.status,
      JSON.stringify(run),
    );
    const controller = new AbortController();
    active.set(run.id, controller);
    res.status(202).json({ id: run.id });
    void search(run, controller);
  });
  app.post("/api/admin/sourcing/runs/:id/cancel", (req, res) => {
    const controller = active.get(req.params.id);
    if (!controller) bad("This search is no longer running.", 409);
    controller.abort();
    res.json({ ok: true });
  });
  app.patch("/api/admin/sourcing/leads/:id", (req, res) => {
    if (!reviewStates.includes(req.body?.status)) bad("Invalid review status.");
    if (
      !db
        .prepare("UPDATE sourcing_leads SET review=? WHERE id=?")
        .run(req.body.status, req.params.id).changes
    )
      bad("Lead not found.", 404);
    res.json({ ok: true });
  });
  app.get("/api/admin/agent/status", async (req, res) => {
    try {
      res.json(await (await agent()).getAgentStatus());
    } catch {
      res.json({
        ready: false,
        message:
          "The server could not open the local Codex subscription agent.",
      });
    }
  });
  app.post("/api/admin/agent/ask", async (req, res) => {
    const question = trim(req.body?.question, 1201);
    if (!question || question.length > 1200)
      bad("Enter a question of up to 1,200 characters.");
    if (asking) bad("Codex is answering another showroom question.", 409);
    limit("ask:" + req.ip, 18, 3600000);
    asking = true;
    const controller = new AbortController();
    const close = () => {
      if (!res.writableEnded) controller.abort();
    };
    res.on("close", close);
    try {
      const stock = list(),
        leads = allLeads();
      const context = {
        company: {
          name: "L & S Motorsports",
          location: "Broadbeach, Gold Coast, Queensland, Australia",
        },
        listings: stock.map((b) => ({
          title: [b.year, b.make, b.model].filter(Boolean).join(" "),
          year: b.year,
          make: b.make,
          model: b.model,
          category: b.category,
          status: b.status,
          priceAud: b.price,
          odometerKm: b.km,
        })),
        metrics: {
          listingCount: stock.length,
          enquiryCount: db.prepare("SELECT count(*) AS n FROM enquiries").get()
            .n,
          pageViews30Days: db
            .prepare(
              "SELECT coalesce(sum(total),0) AS n FROM views WHERE day>=date('now','-29 days')",
            )
            .get().n,
          leads: leads.length,
          shortlisted: leads.filter((l) => l.reviewStatus === "Shortlisted")
            .length,
        },
        sourcing: leads.slice(0, 40).map((l) => ({
          title: l.title,
          location: l.location,
          priceAud: l.priceAud,
          advertisedDate: l.advertisedDate,
          sourceUrl: l.sourceUrl,
          reviewStatus: l.reviewStatus,
        })),
        routes: [
          { name: "Inventory", path: "/admin" },
          { name: "Analytics", path: "/admin/analytics" },
          { name: "Enquiries", path: "/admin/enquiries" },
          { name: "Sourcing", path: "/admin/sourcing" },
          { name: "Showroom Agent", path: "/admin/agent" },
        ],
        content: counts,
      };
      res.json(
        await (
          await agent()
        ).answerShowroom(question, context, { signal: controller.signal }),
      );
    } catch (error) {
      if (!controller.signal.aborted)
        bad(trim(error.message, 350) || "Codex was unavailable.", 503);
    } finally {
      asking = false;
      res.off("close", close);
    }
  });
}
