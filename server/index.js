import express from "express";
import { DatabaseSync } from "node:sqlite";
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { adminPassword, dataDir } from "./password.js";
import { seeds } from "./seed.js";
import { facebookListings } from "./facebook-listings.js";
import { installSourcing } from "./sourcing.js";

const app = express();
const password = adminPassword();
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(resolve(dataDir, "showroom.sqlite"));
db.exec(
  "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS listings(id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS photos(id TEXT PRIMARY KEY, mime TEXT, bytes BLOB); CREATE TABLE IF NOT EXISTS views(listing TEXT, day TEXT, total INTEGER DEFAULT 1, PRIMARY KEY(listing, day)); CREATE TABLE IF NOT EXISTS enquiries(id TEXT PRIMARY KEY, created TEXT, body TEXT); CREATE TABLE IF NOT EXISTS setup(key TEXT PRIMARY KEY)",
);
function atomic(fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const value = fn();
    db.exec("COMMIT");
    return value;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
const save = db.prepare("INSERT OR REPLACE INTO listings VALUES (?,?)");
atomic(() => {
  const insert = db.prepare("INSERT OR IGNORE INTO listings VALUES (?,?)");
  for (const bike of [...seeds, ...facebookListings]) {
    insert.run(
      bike.id,
      JSON.stringify({
        revision: 1,
        created: "2020-09-19T00:00:00Z",
        ...bike,
      }),
    );
  }
  const yamaha = facebookListings.find(
    (bike) => bike.id === "1999-yamaha-yzf-r1",
  );
  const original = JSON.parse(
    db.prepare("SELECT body FROM listings WHERE id=?").get(yamaha.id).body,
  );
  if (original.revision === 1 && !original.photos.length) {
    save.run(
      yamaha.id,
      JSON.stringify({
        ...original,
        photos: yamaha.photos,
        credit: yamaha.credit,
      }),
    );
  }
});
const sessions = new Map();
const limits = new Map();
const sha = (value) => createHash("sha256").update(value).digest();
const now = () => new Date().toISOString();
const list = () =>
  db
    .prepare("SELECT body FROM listings ORDER BY rowid")
    .all()
    .map((row) => JSON.parse(row.body))
    .sort((a, b) => b.created.localeCompare(a.created));
const find = (id) => {
  const row = db.prepare("SELECT body FROM listings WHERE id=?").get(id);
  return row && JSON.parse(row.body);
};
function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
function string(value, label, max, required = true) {
  if (value == null && !required) return "";
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    fail("Check the " + label + " field.");
  return value.trim();
}
function number(value, label, min, max, optional = false) {
  if (optional && (value === "" || value == null)) return null;
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    fail("Enter a valid " + label + ".");
  return value;
}
function limit(key, count, ms) {
  let entry = limits.get(key);
  if (!entry || entry.until <= Date.now()) {
    entry = { n: 0, until: Date.now() + ms };
    limits.set(key, entry);
  }
  if (++entry.n > count)
    fail("Too many requests. Please try again later.", 429);
}
const cleanup = setInterval(() => {
  for (const [key, x] of limits) if (x.until <= Date.now()) limits.delete(key);
  for (const [key, end] of sessions)
    if (end <= Date.now()) sessions.delete(key);
}, 60000);
cleanup.unref();
function token(req) {
  return (req.headers.cookie || "")
    .split("; ")
    .find((c) => c.startsWith("ls_session="))
    ?.slice(11);
}
const authenticated = (req) => (sessions.get(token(req)) || 0) > Date.now();
const cookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
};
app.disable("x-powered-by");
app.use("/api", (req, res, next) => {
  res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  if (!["GET", "HEAD"].includes(req.method)) {
    if (
      req.headers.origin &&
      new URL(req.headers.origin).host !== req.headers.host
    )
      return res.status(403).json({ error: "Origin mismatch." });
    if (!req.is("application/json"))
      return res.status(415).json({ error: "JSON required." });
  }
  next();
});
app.use("/api", express.json({ limit: "12mb" }));
app.get("/api/session", (req, res) =>
  res.json({ authenticated: authenticated(req) }),
);
app.post("/api/login", (req, res) => {
  limit("login:" + req.ip, 12, 15 * 60000);
  const input = string(req.body.password, "password", 512);
  if (!timingSafeEqual(sha(input), sha(password)))
    fail("Incorrect admin password.", 401);
  const sid = randomBytes(32).toString("hex");
  sessions.set(sid, Date.now() + 8 * 3600000);
  res
    .cookie("ls_session", sid, { ...cookieOptions, maxAge: 8 * 3600000 })
    .json({ authenticated: true });
});
app.post("/api/logout", (req, res) => {
  sessions.delete(token(req));
  res.clearCookie("ls_session", cookieOptions).json({ ok: true });
});
const publicListings = () => list().filter((bike) => bike.status !== "Draft");
app.get("/api/listings", (req, res) => res.json(publicListings()));
app.get("/api/media/:id", (req, res) => {
  const row = db
    .prepare("SELECT mime,bytes FROM photos WHERE id=?")
    .get(req.params.id);
  if (!row) fail("Image not found.", 404);
  // Draft photos follow the same access rule as the listing.
  if (
    !authenticated(req) &&
    !list().some(
      (b) =>
        b.status !== "Draft" &&
        b.photos.includes("/api/media/" + req.params.id),
    )
  )
    fail("Image not found.", 404);
  res.type(row.mime).send(Buffer.from(row.bytes));
});
app.post("/api/listings/:id/view", (req, res) => {
  const bike = find(req.params.id);
  if (!bike || bike.status === "Draft") fail("Listing not found.", 404);
  limit("views:" + req.ip, 180, 60000);
  db.prepare(
    "INSERT INTO views(listing,day) VALUES(?,?) ON CONFLICT(listing,day) DO UPDATE SET total=total+1",
  ).run(bike.id, now().slice(0, 10));
  res.json({ ok: true });
});
app.post("/api/enquiries", (req, res) => {
  limit("enq:" + req.ip, 12, 3600000);
  const { type, listingId } = req.body;
  if (!["Motorcycle", "Sell or trade", "General"].includes(type))
    fail("Invalid enquiry type.");
  const bike = listingId && find(string(listingId, "listing", 100));
  if (type === "Motorcycle" && (!bike || bike.status === "Draft"))
    fail("Listing unavailable.", 404);
  const name = string(req.body.name, "name", 100),
    email = string(req.body.email, "email", 254),
    message = string(req.body.message, "message", 3000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Enter a valid email.");
  const record = {
    type,
    name,
    email,
    message,
    listingId: bike?.id || null,
    subject: bike
      ? [bike.year, bike.make, bike.model].filter(Boolean).join(" ")
      : type,
  };
  db.prepare("INSERT INTO enquiries VALUES (?,?,?)").run(
    randomUUID(),
    now(),
    JSON.stringify(record),
  );
  res.status(201).json({ ok: true });
});
app.use("/api/admin", (req, res, next) =>
  authenticated(req)
    ? next()
    : res.status(401).json({ error: "Please sign in to continue." }),
);
installSourcing(app, { db, list, limit });
app.get("/api/admin/listings", (req, res) => res.json(list()));
app.get("/api/admin/enquiries", (req, res) =>
  res.json(
    db
      .prepare("SELECT * FROM enquiries ORDER BY created DESC")
      .all()
      .map((r) => ({ ...JSON.parse(r.body), id: r.id, created: r.created })),
  ),
);
function photo(value, existing) {
  if (existing.includes(value)) return value;
  const match =
    typeof value === "string" &&
    value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) fail("Choose a JPEG, PNG or WebP photograph.");
  const bytes = Buffer.from(match[2], "base64");
  const valid =
    match[1] === "jpeg"
      ? bytes.subarray(0, 3).toString("hex") === "ffd8ff"
      : match[1] === "png"
        ? bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
        : bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP";
  if (!valid || bytes.length > 2 * 1024 * 1024)
    fail("Each photograph must be a valid image under 2 MB.");
  const id = randomUUID();
  db.prepare("INSERT INTO photos VALUES (?,?,?)").run(
    id,
    "image/" + match[1],
    bytes,
  );
  return "/api/media/" + id;
}
function writeBike(req, res) {
  const input = req.body;
  const bike = atomic(() => {
    const prev = req.params.id ? find(req.params.id) : null;
    if (req.params.id && !prev) fail("Listing not found.", 404);
    if (prev && prev.revision !== input.revision)
      fail("This listing changed. Reopen it to edit the latest version.", 409);
    const status = string(input.status, "status", 20);
    if (
      ![
        "Available",
        "Advertised",
        "Reserved",
        "Sold",
        "Archive",
        "Draft",
      ].includes(status)
    )
      fail("Invalid status.");
    const b = {
      id: prev?.id || randomUUID(),
      make: string(input.make, "make", 55),
      model: string(input.model, "model", 85),
      year: number(
        input.year,
        "year",
        1900,
        new Date().getFullYear() + 1,
        !!prev?.source && prev.year == null,
      ),
      cc: number(input.cc, "engine capacity", 1, 10000, true),
      km: number(input.km, "odometer", 0, 5000000, true),
      price: number(input.price, "price", 0, 10000000, true),
      category: string(input.category, "category", 50),
      description: string(input.description, "description", 4500),
      status,
      created: prev?.created || now(),
      revision: (prev?.revision || 0) + 1,
      source: prev?.source || "",
      sourceDate: prev?.sourceDate,
      checked: prev?.checked,
      credit: prev?.credit || "",
    };
    if (
      !Array.isArray(input.photos) ||
      input.photos.length > 5 ||
      (status !== "Draft" &&
        !(status === "Archive" && prev?.source) &&
        !input.photos.length)
    )
      fail("Add one to five photos to publish this listing.");
    b.photos = input.photos.map((v) => photo(v, prev?.photos || []));
    save.run(b.id, JSON.stringify(b));
    for (const old of prev?.photos || [])
      if (old.startsWith("/api/media/") && !b.photos.includes(old))
        db.prepare("DELETE FROM photos WHERE id=?").run(old.slice(11));
    return b;
  });
  res.status(req.params.id ? 200 : 201).json(bike);
}
app.post("/api/admin/listings", writeBike);
app.put("/api/admin/listings/:id", writeBike);
app.get("/api/admin/analytics", (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days))
    ? Number(req.query.days)
    : 30;
  const series = Array.from({ length: days }, (_, i) => ({
    day: new Date(Date.now() - (days - 1 - i) * 86400000)
      .toISOString()
      .slice(0, 10),
    views: 0,
    enquiries: 0,
  }));
  const buckets = new Map(series.map((x) => [x.day, x]));
  const rankings = new Map();
  for (const row of db
    .prepare("SELECT * FROM views WHERE day>=?")
    .all(series[0].day)) {
    if (!buckets.has(row.day)) continue;
    buckets.get(row.day).views += row.total;
    rankings.set(row.listing, (rankings.get(row.listing) || 0) + row.total);
  }
  for (const row of db
    .prepare("SELECT created FROM enquiries WHERE created>=?")
    .all(series[0].day)) {
    const bucket = buckets.get(row.created.slice(0, 10));
    if (bucket) bucket.enquiries++;
  }
  res.json({ series, rankings: Object.fromEntries(rankings) });
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Endpoint not found." }),
);
app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (status === 500) console.error(error);
  res.status(status).json({
    error:
      status === 500 ? "Something went wrong. Please retry." : error.message,
  });
});
const host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT || 5173);
const { createServer } = await import("node:http");
const server = createServer(app);
const dev = process.argv.includes("--dev");
process.env.NODE_ENV ||= dev ? "development" : "production";
const { default: next } = await import("next");
const site = next({
  dev,
  hostname: host,
  port,
  webpack: true,
  httpServer: server,
});
await site.prepare();
app.use(
  "/media",
  express.static(resolve("public/media"), { fallthrough: false }),
);
const handle = site.getRequestHandler();
app.use((req, res) => {
  // Next page/data requests share the same published inventory as the API.
  req.publicListings = publicListings;
  return handle(req, res);
});
server.listen(port, host, () =>
  console.log("L & S Motorsports running at http://" + host + ":" + port),
);
