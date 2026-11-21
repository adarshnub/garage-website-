import React, { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "./routing";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ImagePlus,
  Inbox,
  KeyRound,
  Layers,
  LogOut,
  Plus,
  Save,
  ScanSearch,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api, bikeName, Message, money, Status, useResource } from "./shared";
import CustomSelect from "./CustomSelect";

const workspaceLinks = [
  { label: "Inventory", path: "/admin", icon: Layers },
  { label: "Enquiries", path: "/admin/enquiries", icon: Inbox },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Sourcing", path: "/admin/sourcing", icon: ScanSearch },
  { label: "Showroom Agent", path: "/admin/agent", icon: Sparkles },
];

function DealerBrand() {
  return (
    <Link to="/admin" className="dealer-brand">
      <img src="/media/ls-original.jpg" alt="" width={48} height={32} />
      <span>
        <strong>L&amp;S Motorsports</strong>
        <small>Dealer workspace</small>
      </span>
    </Link>
  );
}

export function Admin({ children }) {
  const [epoch, refresh] = useState(0);
  const { data: session, error } = useResource("session", epoch);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [logoutError, setLogoutError] = useState("");
  async function logout() {
    try {
      await api("logout", "POST");
      navigate("/admin");
      refresh((x) => x + 1);
    } catch (e) {
      setLogoutError(e.message);
    }
  }
  if (error || !session)
    return (
      <main className="wrap inner-page">
        <DealerBrand />
        <Message error={!!error}>{error || "Opening workspace…"}</Message>
      </main>
    );
  if (!session.authenticated)
    return <Login onLogin={() => refresh((x) => x + 1)} />;
  return (
    <div className="dealer-layout">
      <aside className="dealer-sidebar">
        <DealerBrand />
        <nav aria-label="Admin navigation">
          {workspaceLinks.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/admin"}
              className={
                path === "/admin" && /^\/admin\/(new|edit\/)/.test(pathname)
                  ? "active"
                  : ""
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="dealer-actions">
          <Link to="/">
            <ArrowUpRight size={16} /> <span>Showroom</span>
          </Link>
          <button type="button" onClick={logout}>
            <LogOut size={16} /> <span>Sign out</span>
          </button>
        </div>
      </aside>
      <main className="workspace dealer-content">
        {logoutError && <Message error>{logoutError}</Message>}
        {children}
      </main>
    </div>
  );
}
function Login({ onLogin }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    const password = new FormData(e.currentTarget).get("password");
    setBusy(true);
    setError("");
    try {
      await api("login", "POST", { password });
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="dealer-login">
      <div className="dealer-login-cover">
        <DealerBrand />
        <div>
          <h1>
            Dealer
            <br />
            workspace<span>.</span>
          </h1>
          <p>Manage inventory, enquiries and sourcing.</p>
        </div>
      </div>
      <form className="form login-form" onSubmit={submit}>
        <KeyRound size={26} />
        <h2>Staff sign in</h2>
        <label>
          Admin password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && <Message error>{error}</Message>}
        <button className="button" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
          <ArrowRight size={16} />
        </button>
        <Link className="text-link" to="/">
          <ChevronLeft size={15} />
          Back to showroom
        </Link>
      </form>
    </main>
  );
}
export function Inventory() {
  const { state } = useLocation();
  const { data, error } = useResource("admin/listings"),
    [q, setQ] = useState("");
  const filtered = data?.filter((b) =>
    (bikeName(b) + " " + b.status)
      .toLowerCase()
      .includes(q.trim().toLowerCase()),
  );
  return (
    <>
      <div className="heading-row">
        <div>
          <h1>
            Inventory<span>.</span>
          </h1>
          <p>Manage showroom listings, pricing and availability.</p>
        </div>
        <Link className="button" to="/admin/new">
          <Plus size={18} />
          Add listing
        </Link>
      </div>
      {state?.saved && <Message>Listing saved.</Message>}
      <div className="inventory-tools">
        <label>
          <Search size={17} />
          <input
            type="search"
            className="admin-search"
            aria-label="Search inventory"
            placeholder="Search by motorcycle or status"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        {data && (
          <small role="status">
            {filtered.length} of {data.length} listings
          </small>
        )}
      </div>
      {error ? (
        <Message error>{error}</Message>
      ) : !data ? (
        <Message>Loading inventory…</Message>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {["Motorcycle", "Status", "Asking price (AUD)", ""].map(
                  (v, i) => (
                    <th key={i}>{v}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="table-bike">
                      {b.photos[0] && <img alt="" src={b.photos[0]} />}
                      <div>
                        <b>
                          {b.make} {b.model}
                        </b>
                        <small>
                          {b.year ?? "Year unlisted"} · {b.category}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Status value={b.status} />
                  </td>
                  <td>{b.price != null ? money(b.price) : "—"}</td>
                  <td>
                    <Link
                      className="text-link"
                      to={"/admin/edit/" + b.id}
                      aria-label={"Edit " + bikeName(b)}
                    >
                      Edit <ArrowUpRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <Message>No matching listings.</Message>}
        </div>
      )}
    </>
  );
}
const blank = {
  make: "",
  model: "",
  year: new Date().getFullYear(),
  category: "Supersport",
  cc: "",
  km: "",
  price: "",
  description: "",
  status: "Draft",
  photos: [],
};
async function encodePhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose JPEG, PNG or WebP photos.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Choose photos under 15 MB.");
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return canvas.toDataURL("image/webp", 0.84);
}
export function EditorPage({ id }) {
  const { data, error } = useResource("admin/listings");
  if (!id) return <Editor initial={blank} />;
  if (!data)
    return <Message error={!!error}>{error || "Loading listing…"}</Message>;
  const bike = data.find((x) => x.id === id);
  return bike ? (
    <Editor key={id} initial={bike} />
  ) : (
    <Message error>Listing not found.</Message>
  );
}
function Editor({ initial }) {
  const [b, setB] = useState(initial),
    [busy, setBusy] = useState(false),
    [working, setWorking] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate();
  const update = (key, val) => setB((old) => ({ ...old, [key]: val }));
  async function photos(e) {
    const files = Array.from(e.target.files);
    e.target.value = "";
    if (!files.length) return;
    setError("");
    setWorking(true);
    try {
      if (files.length + b.photos.length > 5)
        throw new Error("Choose up to five photos.");
      const added = [];
      for (const file of files) added.push(await encodePhoto(file));
      setB((old) => ({ ...old, photos: [...old.photos, ...added] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { ...b };
      for (const key of ["year", "cc", "km", "price"])
        payload[key] = b[key] === "" || b[key] == null ? null : Number(b[key]);
      await api(
        "admin/listings" + (b.id ? "/" + b.id : ""),
        b.id ? "PUT" : "POST",
        payload,
      );
      navigate("/admin", { state: { saved: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  function field(label, key, type = "text", required = false, maxLength) {
    return (
      <label key={key}>
        {label}
        <input
          type={type}
          value={b[key] ?? ""}
          onChange={(e) => update(key, e.target.value)}
          required={required}
          min={key === "year" ? 1900 : key === "cc" ? 1 : 0}
          max={key === "year" ? new Date().getFullYear() + 1 : undefined}
          maxLength={maxLength}
        />
      </label>
    );
  }
  return (
    <>
      <Link className="back" to="/admin">
        <ChevronLeft size={15} />
        Inventory
      </Link>
      <h1>
        {b.id ? "Edit listing" : "Add listing"}
        <span>.</span>
      </h1>
      <form className="editor form" onSubmit={submit}>
        <div>
          <h2>Motorcycle details</h2>
          <div className="form-pair">
            {field("Make", "make", "text", true, 55)}
            {field("Model", "model", "text", true, 85)}
            {field(
              "Year",
              "year",
              "number",
              !(initial?.source && initial.year == null),
            )}
            {field("Category", "category", "text", true, 50)}
            {field("Engine capacity (cc)", "cc", "number")}
            {field("Odometer (km)", "km", "number")}
            {field("Asking price (AUD)", "price", "number")}
            <div className="select-field">
              <label htmlFor="listing-status">Listing status</label>
              <CustomSelect
                id="listing-status"
                value={b.status}
                onChange={(value) => update("status", value)}
                options={[
                  "Draft",
                  "Available",
                  "Advertised",
                  "Reserved",
                  "Sold",
                  "Archive",
                ]}
              />
            </div>
          </div>
          <label>
            Description
            <textarea
              rows="6"
              value={b.description}
              maxLength={4500}
              required
              onChange={(e) => update("description", e.target.value)}
            />
          </label>
        </div>
        <div>
          <h2>Photography</h2>
          <p className="hint">
            Add up to five photographs. The first image is the cover.
          </p>
          <div className="upload-list">
            {b.photos.map((p, i) => (
              <div key={p.slice(-70) + i}>
                <img src={p} alt={"Listing photo " + (i + 1)} />
                <div>
                  {i === 0 ? (
                    <b>Cover photo</b>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        update("photos", [
                          p,
                          ...b.photos.filter((_, n) => i !== n),
                        ])
                      }
                    >
                      Make cover
                    </button>
                  )}
                  <button
                    aria-label={"Remove photo " + (i + 1)}
                    type="button"
                    onClick={() =>
                      update(
                        "photos",
                        b.photos.filter((_, n) => i !== n),
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {b.photos.length < 5 && (
            <label className="upload">
              <ImagePlus />
              {working ? "Preparing photos…" : "Choose photographs"}
              <input
                type="file"
                aria-label="Choose photographs"
                multiple
                accept="image/jpeg,image/webp,image/png"
                disabled={working || busy}
                onChange={photos}
              />
            </label>
          )}
          <p className="hint">
            {b.status === "Draft"
              ? "Drafts are visible only in the admin workspace."
              : "Saving makes this listing visible in the showroom."}
          </p>
          {error && <Message error>{error}</Message>}
          <button className="button" disabled={busy || working}>
            <Save size={16} />
            {busy ? "Saving…" : "Save listing"}
          </button>
        </div>
      </form>
    </>
  );
}
export function Enquiries() {
  const { data, error } = useResource("admin/enquiries");
  return (
    <>
      <div className="heading-row">
        <div>
          <h1>
            Enquiries<span>.</span>
          </h1>
          <p>Read messages from buyers and sellers.</p>
        </div>
      </div>
      {error ? (
        <Message error>{error}</Message>
      ) : !data ? (
        <Message>Loading enquiries…</Message>
      ) : !data.length ? (
        <div className="empty">
          <Inbox />
          <h3>No enquiries yet</h3>
          <p>Messages from buyers and sellers will appear here.</p>
        </div>
      ) : (
        <div className="inbox">
          {data.map((r) => (
            <article key={r.id}>
              <div className="inbox-meta">
                {r.type}
                <time>{new Date(r.created).toLocaleDateString("en-AU")}</time>
              </div>
              <h3>{r.subject}</h3>
              <p className="enquiry-body">{r.message}</p>
              <b>{r.name}</b> ·{" "}
              <a className="text-link" href={"mailto:" + r.email}>
                {r.email}
              </a>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
function Chart({ series }) {
  const max = Math.max(1, ...series.flatMap((r) => [r.views, r.enquiries]));
  const points = (key) =>
    series
      .map(
        (r, i) =>
          ((i / (series.length - 1)) * 700).toFixed(2) +
          "," +
          (140 - (132 * r[key]) / max).toFixed(2),
      )
      .join(" ");
  return (
    <div className="chart">
      <div className="chart-legend">
        <span>
          <i />
          Listing views
        </span>
        <span>
          <i />
          Enquiries
        </span>
      </div>
      <div className="chart-body">
        <div className="axis">
          <span>{max}</span>
          <span>0</span>
        </div>
        <svg
          role="img"
          aria-label="Daily listing views and enquiries over selected period"
          viewBox="0 0 700 148"
          preserveAspectRatio="none"
        >
          {[8, 52, 96, 140].map((y) => (
            <line
              key={y}
              x1="0"
              x2="700"
              y1={y}
              y2={y}
              stroke="#d4d1ca"
              strokeDasharray="3 5"
            />
          ))}
          <polygon
            points={"0,140 " + points("views") + " 700,140"}
            fill="rgba(211,56,20,.1)"
          />
          <polyline
            points={points("views")}
            fill="none"
            stroke="#cf391b"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={points("enquiries")}
            fill="none"
            stroke="#284c71"
            strokeDasharray="4 4"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="chart-dates">
        <span>{series[0].day}</span>
        <span>{series.at(-1).day}</span>
      </div>
      <details>
        <summary>Daily figures</summary>
        <div className="daily-table">
          <table>
            <thead>
              <tr>
                <th>Date (UTC)</th>
                <th>Views</th>
                <th>Enquiries</th>
              </tr>
            </thead>
            <tbody>
              {series.map((r) => (
                <tr key={r.day}>
                  <td>{r.day}</td>
                  <td>{r.views}</td>
                  <td>{r.enquiries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
export function Analytics() {
  const [days, setDays] = useState(30),
    { data, error } = useResource("admin/analytics?days=" + days),
    { data: bikes, error: stockError } = useResource("admin/listings");
  const states = [
    "Available",
    "Advertised",
    "Reserved",
    "Sold",
    "Archive",
    "Draft",
  ];
  return (
    <>
      <div className="heading-row">
        <div>
          <h1>
            Analytics<span>.</span>
          </h1>
          <p>Track listing views, enquiries and the inventory mix.</p>
        </div>
        <CustomSelect
          aria-label="Analytics period"
          value={days}
          onChange={setDays}
          options={[7, 30, 90].map((n) => ({
            value: n,
            label: `Last ${n} days`,
          }))}
        />
      </div>
      {error || stockError ? (
        <Message error>{error || stockError}</Message>
      ) : !data || !bikes ? (
        <Message>Loading analytics…</Message>
      ) : (
        <>
          <div className="metrics">
            {[
              ["Listing views", data.series.reduce((a, x) => a + x.views, 0)],
              ["Enquiries", data.series.reduce((a, x) => a + x.enquiries, 0)],
              [
                "Available now",
                bikes.filter((b) => b.status === "Available").length,
              ],
            ].map(([k, v]) => (
              <div key={k}>
                <small>{k}</small>
                <b>{v.toLocaleString()}</b>
              </div>
            ))}
          </div>
          <div className="analytics-layout">
            <section>
              <h2>Showroom activity</h2>
              <Chart series={data.series} />
            </section>
            <section>
              <h2>Inventory mix</h2>
              {states.map((s) => {
                const count = bikes.filter((b) => b.status === s).length;
                return (
                  <div className="mix-row" key={s}>
                    <div>
                      <span>{s}</span>
                      <b>{count}</b>
                    </div>
                    <div className="bar">
                      <i
                        style={{
                          width:
                            (100 * count) / Math.max(1, bikes.length) + "%",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
          <section className="rankings">
            <h2>Most viewed motorcycles</h2>
            {Object.keys(data.rankings).length ? (
              Object.entries(data.rankings)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([id, v]) => (
                  <div key={id}>
                    <span>
                      {bikes.find((b) => b.id === id)
                        ? bikeName(bikes.find((b) => b.id === id))
                        : "Removed motorcycle"}
                    </span>
                    <b>
                      {v} {v === 1 ? "view" : "views"}
                    </b>
                  </div>
                ))
            ) : (
              <p>Listing views will appear when visitors open a motorcycle.</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
