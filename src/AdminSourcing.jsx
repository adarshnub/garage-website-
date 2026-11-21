import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  CalendarDays,
  ChevronDown,
  CirclePlay,
  Clipboard,
  Image as Photo,
  LoaderCircle,
  MapPin,
  Maximize2,
  ScanSearch,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import CustomSelect from "./CustomSelect";
import LeadPhotoPreview, { MediaArrows } from "./LeadPhotoPreview";
import { Link } from "./routing";
import { api, Message, money } from "./shared";

const filters = ["All leads", "New", "Shortlisted", "Dismissed"];
const dateWindows = [
  { value: 1, label: "Last 24 hours" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
];
const defaultMarkets = [{ value: "brisbane", label: "Brisbane, QLD" }];
const runLabels = {
  running: "Search in progress",
  complete: "Search complete",
  partial: "Partial search",
  interrupted: "Search interrupted",
  cancelled: "Search stopped",
  failed: "Search failed",
};
const labelStatus = (value) =>
  ({
    rate_limited: "Request limited",
    login_required: "Login required",
    accessible: "Accessible",
    blocked: "Access restricted",
    limited: "Limited coverage",
    unknown: "Unconfirmed",
  })[value] || value;
const when = (value) =>
  new Date(value).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  }) + " AEST";

const leadPrice = (lead) =>
  lead.priceAud == null ? "Price unlisted" : money(lead.priceAud) + " AUD";
const leadDate = (lead) =>
  lead.listedLabel
    ? "At check · " + lead.listedLabel
    : lead.advertisedDate
      ? "Listed " + lead.advertisedDate
      : "In the selected date window";

function LeadGallery({ lead }) {
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState("");
  const [preview, setPreview] = useState(false);
  const thumbs = useRef(null);
  const photos = lead.media
    .filter(({ kind }) => kind === "image")
    .map((asset, index) =>
      index === 0 && lead.preview ? { ...asset, url: lead.preview } : asset,
    );
  if (!photos.length && lead.preview)
    photos.push({ kind: "image", url: lead.preview });
  const videos = lead.media.filter(({ kind }) => kind === "video");
  const media = [...photos, ...videos].map((asset, index) => ({
    ...asset,
    label:
      asset.kind === "image"
        ? "Photo " + (index + 1)
        : "Video " + (index - photos.length + 1),
  }));
  const current = Math.min(selected, media.length - 1);
  const asset = media[current];
  const caption =
    asset &&
    (asset.kind === "image"
      ? asset.label + " of " + photos.length
      : asset.label + " of " + videos.length);

  useEffect(() => {
    const strip = thumbs.current;
    const active = strip?.querySelector('[aria-pressed="true"]');
    if (!active) return;
    const bounds = strip.getBoundingClientRect();
    const button = active.getBoundingClientRect();
    if (button.left < bounds.left)
      strip.scrollLeft -= bounds.left - button.left + 6;
    if (button.right > bounds.right)
      strip.scrollLeft += button.right - bounds.right + 6;
  }, [current]);

  function advance(delta, count = media.length) {
    setSelected(
      (index) => (Math.min(index, count - 1) + delta + count) % count,
    );
  }

  return (
    <section
      className="source-dialog-gallery"
      aria-label="Ad media"
      onKeyDown={(event) => {
        if (
          media.length < 2 ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.target.closest("video")
        )
          return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          advance(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="source-dialog-photo">
        {asset && asset.url !== failed ? (
          asset.kind === "image" ? (
            <img
              src={asset.url}
              alt={lead.title + " · " + asset.label}
              referrerPolicy="no-referrer"
              onError={() => setFailed(asset.url)}
            />
          ) : (
            <video
              key={asset.url}
              src={asset.url}
              aria-label={asset.label + " for " + lead.title}
              controls
              playsInline
              preload="metadata"
              onError={() => setFailed(asset.url)}
            />
          )
        ) : (
          <div>
            <Photo size={25} />
            <span>
              {asset
                ? asset.label + " is unavailable here."
                : "See photos and videos in the original ad."}
            </span>
            {asset && (
              <a href={lead.sourceUrl} target="_blank" rel="noreferrer">
                Open original ad <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        )}
        {media.length > 1 && (
          <MediaArrows
            label={videos.length ? "media" : "photo"}
            onChange={advance}
          />
        )}
        {asset?.kind === "image" && (
          <button
            type="button"
            className="source-full-photo"
            aria-label="View full-screen photo"
            aria-haspopup="dialog"
            onClick={() => setPreview(true)}
          >
            <Maximize2 size={17} /> Full screen
          </button>
        )}
      </div>
      {media.length > 1 && (
        <div
          className="source-dialog-thumbs"
          ref={thumbs}
          role="group"
          aria-label="Choose a photo or video"
        >
          {media.map(({ url, label, kind }, index) => (
            <button
              key={kind + url + index}
              type="button"
              aria-label={"Show " + label.toLowerCase()}
              aria-pressed={index === current}
              onClick={() => setSelected(index)}
            >
              {kind === "image" ? (
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>
                  <CirclePlay size={17} />
                  {label}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {asset && (
        <p className="source-media-caption" role="status">
          {caption}
        </p>
      )}
      {preview && asset?.kind === "image" && (
        <LeadPhotoPreview
          title={lead.title}
          asset={asset}
          count={photos.length}
          caption={caption}
          onChange={(delta) => advance(delta, photos.length)}
          onClose={() => setPreview(false)}
        />
      )}
    </section>
  );
}

function LeadContact({ contact }) {
  const [feedback, setFeedback] = useState("");
  async function copyContact() {
    try {
      await navigator.clipboard.writeText(contact);
      setFeedback("Contact copied");
    } catch {
      setFeedback("Select the contact details to copy them.");
    }
  }
  return (
    <section className={contact ? "source-dialog-contact" : undefined}>
      <h3>Seller contact</h3>
      {contact ? (
        <>
          <div className="source-contact-row">
            <p>{contact}</p>
            <button
              className="dealer-secondary"
              type="button"
              onClick={copyContact}
            >
              <Clipboard size={15} /> Copy contact
            </button>
          </div>
          {feedback && <small role="status">{feedback}</small>}
        </>
      ) : (
        <p>Contact the seller through the original Facebook ad.</p>
      )}
    </section>
  );
}

function LeadDialog({ lead, onClose }) {
  const ref = useRef(null);
  const backdrop = useRef(false);
  const description = lead.description || lead.evidence;

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    dialog.querySelector(".source-dialog-close").focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="source-dialog"
      aria-labelledby="source-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        backdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (backdrop.current && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="source-dialog-shell">
        <header className="source-dialog-header">
          <div>
            <p>
              <MapPin size={15} /> {lead.location}
            </p>
            <h2 id="source-dialog-title">{lead.title}</h2>
            <strong className="source-price">{leadPrice(lead)}</strong>
          </div>
          <button
            type="button"
            className="source-dialog-close"
            aria-label="Close ad details"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>
        <div className="source-dialog-body">
          <LeadGallery lead={lead} />
          <div className="source-dialog-details">
            <div className="source-dialog-date">
              <span>
                <CalendarDays size={15} /> {leadDate(lead)}
              </span>
              {lead.year != null && <span>Model year {lead.year}</span>}
              {lead.odometerKm != null && (
                <span>{lead.odometerKm.toLocaleString("en-AU")} km</span>
              )}
            </div>
            {description && (
              <section>
                <h3>Seller’s ad</h3>
                <p className="source-evidence">{description}</p>
              </section>
            )}
            {lead.notes && (
              <section className="source-dialog-fit">
                <h3>
                  <Sparkles size={17} /> Showroom fit
                </h3>
                <p>{lead.notes}</p>
              </section>
            )}
            <LeadContact contact={lead.contact} />
            <small>
              Verified {when(lead.checkedAt)} ·{" "}
              {lead.provenance === "web_search"
                ? "Codex web search"
                : "Public Marketplace ad"}
            </small>
          </div>
        </div>
        <footer className="source-dialog-footer">
          <a
            className="button"
            href={lead.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Original ad <ArrowUpRight size={16} />
          </a>
        </footer>
      </div>
    </dialog>
  );
}

function Lead({ lead, onReview, busy }) {
  const photos = lead.media.filter((asset) => asset.kind === "image");
  const videos = lead.media.filter((asset) => asset.kind === "video");
  const preview =
    lead.preview || lead.media.find((x) => x.kind === "image")?.url;
  const [failed, setFailed] = useState("");
  const [opened, setOpened] = useState(false);
  return (
    <article className="source-card">
      <button
        type="button"
        className="source-picture"
        aria-label={"View ad photos for " + lead.title}
        aria-haspopup="dialog"
        onClick={() => setOpened(true)}
      >
        {preview && failed !== preview ? (
          <img
            src={preview}
            loading="lazy"
            alt={lead.title}
            referrerPolicy="no-referrer"
            onError={() => setFailed(preview)}
          />
        ) : (
          <span>
            <Photo size={24} /> Photos on Facebook
          </span>
        )}
        <b>
          {lead.sourceUrl.includes("/marketplace/")
            ? "Marketplace"
            : /video|reel|watch/.test(lead.sourceUrl)
              ? "Facebook film"
              : "Facebook post"}
        </b>
        {photos.length > 0 && (
          <span className="source-photo-count">
            <Photo size={14} />
            {photos.length}
          </span>
        )}
        {videos.length > 0 && (
          <span className="source-video-count">
            <CirclePlay size={14} />
            {videos.length}
          </span>
        )}
      </button>
      <div className="source-card-body">
        <div className="source-meta">
          <span>
            <MapPin size={13} />
            {lead.location}
          </span>
          <span className="source-review" data-status={lead.reviewStatus}>
            {lead.reviewStatus}
          </span>
        </div>
        <h3>{lead.title}</h3>
        <strong className="source-price">{leadPrice(lead)}</strong>
        <p>
          {leadDate(lead)}
          {lead.odometerKm != null
            ? " · " + lead.odometerKm.toLocaleString("en-AU") + " km"
            : ""}
        </p>
        <button
          className="source-details-button"
          type="button"
          aria-haspopup="dialog"
          onClick={() => setOpened(true)}
        >
          Ad and showroom fit <Maximize2 size={16} />
        </button>
        <div className="source-actions">
          <a href={lead.sourceUrl} target="_blank" rel="noreferrer">
            Original ad <ArrowUpRight size={15} />
          </a>
          <button
            disabled={busy}
            title={
              lead.reviewStatus === "Shortlisted"
                ? "Return to new"
                : "Shortlist lead"
            }
            aria-label={
              (lead.reviewStatus === "Shortlisted"
                ? "Remove from shortlist: "
                : "Shortlist: ") + lead.title
            }
            aria-pressed={lead.reviewStatus === "Shortlisted"}
            onClick={() =>
              onReview(
                lead.id,
                lead.reviewStatus === "Shortlisted" ? "New" : "Shortlisted",
              )
            }
          >
            <Bookmark size={16} />
          </button>
          <button
            disabled={busy}
            title={
              lead.reviewStatus === "Dismissed"
                ? "Restore lead"
                : "Dismiss lead"
            }
            aria-label={
              (lead.reviewStatus === "Dismissed" ? "Restore: " : "Dismiss: ") +
              lead.title
            }
            onClick={() =>
              onReview(
                lead.id,
                lead.reviewStatus === "Dismissed" ? "New" : "Dismissed",
              )
            }
          >
            {lead.reviewStatus === "Dismissed" ? (
              <Check size={16} />
            ) : (
              <X size={16} />
            )}
          </button>
        </div>
      </div>
      {opened && <LeadDialog lead={lead} onClose={() => setOpened(false)} />}
    </article>
  );
}

function LatestSearch({ run, running, busy, onStop }) {
  return (
    <section className="source-run" aria-labelledby="latest-search">
      <div className="source-run-heading">
        <h2 id="latest-search">Latest search</h2>
        <CalendarDays size={19} aria-hidden="true" />
      </div>
      {run ? (
        <>
          <div role="status">
            <strong className="source-run-state" data-state={run.status}>
              {running && <LoaderCircle size={15} className="dealer-spinner" />}
              {runLabels[run.status] || run.status}
            </strong>
            <p>{run.message}</p>
          </div>
          <div className="source-run-meta">
            <b>{run.focus}</b>
            <span>
              {run.location} · {when(run.started)}
            </span>
          </div>
          {(run.coverage || run.supplementalCoverage) && (
            <details className="source-coverage">
              <summary>
                Source coverage <ChevronDown size={15} />
              </summary>
              {run.coverage && (
                <p>
                  <b>Marketplace · {labelStatus(run.coverage.status)}</b>
                  <br />
                  {run.coverage.message}
                </p>
              )}
              {run.supplementalCoverage && (
                <p>
                  <b>
                    Posts and reels ·{" "}
                    {labelStatus(run.supplementalCoverage.status)}
                  </b>
                  <br />
                  {run.supplementalCoverage.message}
                </p>
              )}
            </details>
          )}
          <div className="source-run-actions">
            {run.searchUrl && (
              <a
                className="dealer-quiet"
                href={run.searchUrl}
                target="_blank"
                rel="noreferrer"
              >
                Facebook results <ArrowUpRight size={15} />
              </a>
            )}
            {running && (
              <button
                type="button"
                className="dealer-quiet"
                disabled={busy}
                onClick={onStop}
              >
                Stop search
              </button>
            )}
          </div>
        </>
      ) : (
        <p>Search progress and Facebook coverage will appear here.</p>
      )}
    </section>
  );
}

export default function AdminSourcing() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [city, setCity] = useState("brisbane");
  const [days, setDays] = useState(7);
  const [focus, setFocus] = useState("");
  const [filter, setFilter] = useState("All leads");
  const [busy, setBusy] = useState("");
  const reload = useCallback(
    async () => setData(await api("admin/sourcing")),
    [],
  );

  useEffect(() => {
    let live = true;
    api("admin/sourcing").then(
      (result) => {
        if (live) setData(result);
      },
      (error) => {
        if (live) setError(error.message);
      },
    );
    return () => {
      live = false;
    };
  }, []);

  const run = data?.latest;
  const running = run?.status === "running";
  useEffect(() => {
    if (!running) return;
    let live = true,
      timer;
    async function poll() {
      try {
        const result = await api("admin/sourcing");
        if (!live) return;
        setData(result);
        if (result.latest?.status === "running") timer = setTimeout(poll, 2200);
      } catch (error) {
        if (!live) return;
        setError(error.message);
        timer = setTimeout(poll, 5500);
      }
    }
    timer = setTimeout(poll, 1200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [running, run?.id]);

  async function act(key, path, method, body) {
    setBusy(key);
    setError("");
    try {
      await api(path, method, body);
      await reload();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy("");
    }
  }

  const allLeads = data?.leads || [];
  const counts = {
    "All leads": allLeads.length,
    New: 0,
    Shortlisted: 0,
    Dismissed: 0,
  };
  for (const lead of allLeads) counts[lead.reviewStatus]++;
  const leads =
    filter === "All leads"
      ? allLeads
      : allLeads.filter((lead) => lead.reviewStatus === filter);

  return (
    <div className="sourcing-workspace">
      <header className="dealer-heading">
        <div>
          <h1>
            Sourcing<span>.</span>
          </h1>
          <p>
            Find motorcycles for sale across Australia and review them against
            your stock.
          </p>
        </div>
        <Link to="/admin/agent" className="dealer-secondary">
          <Sparkles size={17} /> Open Showroom Agent <ArrowUpRight size={15} />
        </Link>
      </header>
      {error && <Message error>{error}</Message>}
      <div className="source-search-grid">
        <section className="source-console" aria-labelledby="search-title">
          <header>
            <ScanSearch size={22} aria-hidden="true" />
            <div>
              <h2 id="search-title">Find motorcycles</h2>
              <p>Search public Facebook ads by area, date and model.</p>
            </div>
          </header>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy && !running && data)
                act("search", "admin/sourcing/runs", "POST", {
                  city,
                  days,
                  focus,
                });
            }}
          >
            <div className="source-fields">
              <label>
                Search area
                <CustomSelect
                  aria-label="Search area"
                  options={data?.markets || defaultMarkets}
                  value={city}
                  onChange={setCity}
                  disabled={running}
                />
              </label>
              <label>
                Date listed
                <CustomSelect
                  aria-label="Date listed"
                  options={dateWindows}
                  value={days}
                  onChange={setDays}
                  disabled={running}
                />
              </label>
              <label className="source-model">
                Model or family
                <input
                  value={focus}
                  onChange={(event) => setFocus(event.target.value)}
                  placeholder={data?.defaultFocus || "Suzuki GSX-R750"}
                  maxLength={90}
                  disabled={running}
                />
              </label>
            </div>
            <div className="source-search-footer">
              <button
                type="submit"
                className="button"
                disabled={!!busy || running || !data}
              >
                {running ? (
                  <LoaderCircle size={17} className="dealer-spinner" />
                ) : (
                  <Search size={17} />
                )}
                {running ? "Searching…" : "Search Facebook"}
              </button>
              {!focus.trim() && data?.defaultFocus && (
                <small>Default model: {data.defaultFocus}</small>
              )}
            </div>
          </form>
        </section>
        <LatestSearch
          run={run}
          running={running}
          busy={!!busy}
          onStop={() =>
            act("stop", "admin/sourcing/runs/" + run.id + "/cancel", "POST", {})
          }
        />
      </div>
      <section aria-labelledby="lead-heading">
        <header className="source-queue">
          <h2 id="lead-heading">Saved leads</h2>
          <div
            className="source-filters"
            role="group"
            aria-label="Filter sourcing leads"
          >
            {filters.map((status) => (
              <button
                type="button"
                key={status}
                aria-pressed={filter === status}
                onClick={() => setFilter(status)}
              >
                {status} <span>{counts[status]}</span>
              </button>
            ))}
          </div>
        </header>
        {leads.length ? (
          <div className="source-leads">
            {leads.map((lead) => (
              <Lead
                key={lead.id}
                lead={lead}
                busy={!!busy}
                onReview={(id, status) =>
                  act(id, "admin/sourcing/leads/" + id, "PATCH", { status })
                }
              />
            ))}
          </div>
        ) : (
          <div className="source-empty">
            <ScanSearch size={23} />
            <p>
              {!data
                ? error
                  ? "Could not load leads."
                  : "Opening sourcing desk…"
                : filter === "All leads"
                  ? "Verified leads will appear here after a search."
                  : "No leads with this review status."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
