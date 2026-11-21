import React, { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "./routing";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  Film,
  Image as ImageIcon,
  Search,
  X,
} from "lucide-react";
import { films, FilmCard, runtime, poster } from "./Films";
import ReelPlayer from "./ReelPlayer";
import posts from "./data/posts.json";
import albums from "./data/albums.json";
import photoNotes from "./data/photo-notes.json";
import { bikeName, useResource } from "./shared";

const photoPath = (id) => "/media/photos/" + id + ".webp";
const photoSource = (id) => "https://www.facebook.com/photo/?fbid=" + id;
const names = { films: "Films", posts: "Posts", photos: "Photo albums" };
const archive = [...albums].sort(
  (a, b) => b.name.startsWith("Bikes sales") - a.name.startsWith("Bikes sales"),
);
const byPhoto = new Map(
  albums.flatMap((a) =>
    a.photos.map((id, i) => [
      id,
      {
        ...photoNotes[id],
        title: photoNotes[id]?.title || a.name + " · Photo " + (i + 1),
        album: a,
      },
    ]),
  ),
);
function Source({ href, children }) {
  return (
    <a className="journal-source" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={14} />
    </a>
  );
}
function Related({ ids, bikes }) {
  const records = (bikes || []).filter((b) => ids?.includes(b.id));
  return records.length ? (
    <div className="journal-related">
      {records.map((b) => (
        <Link key={b.id} to={"/motorcycles/" + b.id}>
          {bikeName(b)}
          <ArrowUpRight size={15} />
        </Link>
      ))}
    </div>
  ) : null;
}
function ReelTheatre({ film, startAt, playlist, close, choose, bikes }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    dialog.querySelector(".reel-play")?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (!ref.current.contains(document.activeElement))
      ref.current.querySelector(".reel-play")?.focus({ preventScroll: true });
  }, [film.id]);
  const index = playlist.findIndex((item) => item.id === film.id);
  const count = playlist.length;
  const following = [
    ...playlist.slice(index + 1),
    ...playlist.slice(0, index),
  ].slice(0, 3);
  const advance = (delta) =>
    choose(playlist[(index + delta + count) % count].id);
  return (
    <dialog
      className="journal-dialog reel-theatre"
      ref={ref}
      aria-labelledby="reel-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (
          e.altKey ||
          e.ctrlKey ||
          e.metaKey ||
          e.target.tagName === "INPUT" ||
          count < 2
        )
          return;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          advance(e.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="reel-shell">
        <header className="reel-bar">
          <div className="reel-room-name">
            <Film size={17} /> Garage cinema
          </div>
          <div className="reel-pager">
            <span>
              Reel <b>{String(index + 1).padStart(2, "0")}</b> /{" "}
              {String(count).padStart(2, "0")}
            </span>
            {count > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous reel"
                  title="Previous reel (←)"
                  onClick={() => advance(-1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Next reel"
                  title="Next reel (→)"
                  onClick={() => advance(1)}
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
          <button
            className="reel-close"
            type="button"
            aria-label="Close viewer"
            title="Close viewer (Esc)"
            onClick={close}
          >
            <X size={19} />
          </button>
        </header>
        <div className="reel-layout">
          <ReelPlayer
            film={film}
            startAt={startAt}
            autoPlay
            onPrevious={count > 1 ? () => advance(-1) : undefined}
            onNext={count > 1 ? () => advance(1) : undefined}
          />
          <aside className="reel-info">
            <div className="reel-current">
              <p className="reel-byline">L&S Motorsports</p>
              <h2 id="reel-title" aria-live="polite">
                {film.title}
              </h2>
              {film.note && <p className="reel-description">{film.note}</p>}
              <Related ids={film.bikes} bikes={bikes} />
              <Source href={"https://www.facebook.com/reel/" + film.id + "/"}>
                Original reel
              </Source>
            </div>
            {following.length > 0 && (
              <section className="reel-next" aria-label="Up next">
                <h3>Up next</h3>
                <div>
                  {following.map((item) => (
                    <button
                      type="button"
                      className="reel-cue"
                      key={item.id}
                      onClick={() => choose(item.id)}
                    >
                      <img src={poster(item)} alt="" />
                      <strong>{item.title}</strong>
                      <small>{runtime(item.duration)}</small>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </dialog>
  );
}
export function ReelOverlay() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: bikes } = useResource("listings");
  const film = films.find((item) => item.id === params.get("film"));
  useEffect(() => {
    document
      .querySelectorAll(".film-peek")
      .forEach((preview) => preview.pause());
  }, []);
  function choose(id) {
    const next = new URLSearchParams(params);
    next.set("film", id);
    next.delete("t");
    setParams(next, {
      replace: true,
      state: location.state,
      preventScrollReset: true,
    });
  }
  return (
    film && (
      <ReelTheatre
        film={film}
        startAt={params.get("t")}
        playlist={films}
        bikes={bikes}
        choose={choose}
        close={() => navigate(-1)}
      />
    )
  );
}
function JournalDialog({ entry, close, openPhoto, step, bikes }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  const { type, data, id } = entry;
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      dialog
        .querySelector(".reader-bar button")
        ?.focus({ preventScroll: true });
    }
  }, [type, id]);
  const title = data.title;
  const source = type === "photo" ? photoSource(id) : data.source;
  return (
    <dialog
      className="journal-dialog"
      ref={ref}
      aria-labelledby="entry-heading"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (
          type === "photo" &&
          (e.key === "ArrowRight" || e.key === "ArrowLeft")
        ) {
          e.preventDefault();
          step(e.key === "ArrowRight" ? 1 : -1);
        }
      }}
    >
      <div className="journal-reader">
        <div className="reader-bar">
          <span>
            L&S Motorsports <i />{" "}
            {type === "photo" ? "Photograph" : "Journal post"}
          </span>
          <button
            autoFocus
            type="button"
            onClick={close}
            aria-label="Close viewer"
          >
            <X size={21} />
          </button>
        </div>
        {type === "photo" && !data.sourceOnly ? (
          <img
            className="reader-photo"
            key={id}
            src={photoPath(id)}
            alt={title}
          />
        ) : null}
        <div className="reader-copy">
          <h2 id="entry-heading">{title}</h2>
          {type === "photo" && data.sourceOnly && (
            <p>View the dealer’s original document on Facebook.</p>
          )}
          {data.published && (
            <time className="post-date" dateTime={data.published}>
              {new Intl.DateTimeFormat("en-AU", {
                dateStyle: "long",
                timeZone: "UTC",
              }).format(new Date(data.published))}
            </time>
          )}
          {data.note && <p>{data.note}</p>}
          {type === "post" && data.photos.length > 0 && (
            <div className="reader-photos">
              {data.photos.map((pic, i) => (
                <button
                  key={pic}
                  onClick={() => openPhoto(pic)}
                  aria-label={"View post photograph " + (i + 1)}
                >
                  <img src={photoPath(pic)} alt="" />
                </button>
              ))}
            </div>
          )}
          {type === "post" && data.cover && (
            <img className="post-still" src={data.cover} alt={title} />
          )}
          <Related ids={data.bikes} bikes={bikes} />
          <div className="reader-foot">
            <Source href={source}>
              Original {type === "photo" ? "photo" : "post"}
            </Source>
            {type === "photo" && (
              <div className="reader-nav">
                <button
                  onClick={() => step(-1)}
                  aria-label="Previous photograph"
                >
                  <ChevronLeft />
                </button>
                <button onClick={() => step(1)} aria-label="Next photograph">
                  <ChevronRight />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
export default function Journal() {
  const [params, setParams] = useSearchParams(),
    [query, setQuery] = useState(""),
    [limit, setLimit] = useState(18);
  const { data: bikes } = useResource("listings");
  const album = albums.find((a) => a.id === params.get("album"));
  const tab = album
    ? "photos"
    : Object.hasOwn(names, params.get("tab"))
      ? params.get("tab")
      : "films";
  const film = films.find((f) => f.id === params.get("film")),
    post = posts.find((p) => p.id === params.get("post")),
    photo = byPhoto.get(params.get("photo"));
  const entry = photo
    ? { type: "photo", id: params.get("photo"), data: photo }
    : post
      ? { type: "post", id: post.id, data: post }
      : film
        ? { type: "film", id: film.id, data: film }
        : null;
  const normalized = query.trim().toLowerCase();
  const photoIds = album?.photos || [];
  const rows = (
    tab === "films"
      ? films
      : tab === "posts"
        ? posts
        : album
          ? photoIds.map((id) => ({ id, ...byPhoto.get(id) }))
          : archive
  ).filter((x) =>
    [x.name, x.title, x.note, ...(x.bikes || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
  function changeTab(next) {
    setQuery("");
    setLimit(18);
    setParams(next === "films" ? {} : { tab: next }, {
      preventScrollReset: true,
    });
  }
  function chooseAlbum(a) {
    setLimit(18);
    setQuery("");
    setParams({ tab: "photos", album: a.id }, { preventScrollReset: true });
  }
  function show(key, id, replace = false) {
    const next = new URLSearchParams(params);
    next.set(key, id);
    if (key === "film") next.delete("t");
    setParams(next, { replace, preventScrollReset: true });
  }
  function close() {
    const next = new URLSearchParams(params);
    next.delete(entry.type);
    if (entry.type === "film") next.delete("t");
    setParams(next, { replace: true, preventScrollReset: true });
  }
  function step(delta) {
    const collection = post?.photos?.length ? post.photos : photo.album.photos;
    const i = collection.indexOf(entry.id);
    show(
      "photo",
      collection[(i + delta + collection.length) % collection.length],
      true,
    );
  }
  function search(value) {
    setLimit(18);
    setQuery(value);
  }
  return (
    <main className="journal-page">
      <header className="journal-mast">
        <div className="wrap">
          <p className="cinema-locator">
            <i /> From the Gold Coast
          </p>
          <h1>
            The garage <em>journal</em>
            <span>.</span>
          </h1>
          <p>Walkarounds, sale posts and photographs from L&S Motorsports.</p>
        </div>
      </header>
      <section className="wrap journal-content" aria-label="Journal collection">
        <div className="journal-toolbar">
          <div className="journal-tabs" aria-label="Media type">
            {Object.entries(names).map(([k, label]) => (
              <button
                key={k}
                aria-pressed={k === tab}
                onClick={() => changeTab(k)}
              >
                {k === "films" ? (
                  <Film size={15} />
                ) : k === "posts" ? (
                  <BookOpen size={15} />
                ) : (
                  <Camera size={15} />
                )}{" "}
                {label}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Search current collection"
              value={query}
              placeholder={
                "Search " + (album ? "this album" : names[tab].toLowerCase())
              }
              onChange={(e) => search(e.target.value)}
            />
          </label>
        </div>
        {album && (
          <div className="album-heading">
            <button onClick={() => changeTab("photos")}>
              <ArrowLeft size={15} /> All albums
            </button>
            <h2>{album.name}</h2>
            <p>
              {album.photos.length} photographs indexed here ·{" "}
              {album.total.toLocaleString()} items reported by Facebook
            </p>
            <Source href={album.link}>Open full album on Facebook</Source>
          </div>
        )}
        <p className="journal-count" aria-live="polite">
          {rows.length} {album ? "photographs" : names[tab].toLowerCase()}
        </p>
        <div
          className={
            "journal-grid " + (tab === "photos" && album ? "photos-grid" : "")
          }
        >
          {rows.slice(0, limit).map((item) =>
            tab === "films" ? (
              <FilmCard key={item.id} film={item} />
            ) : tab === "posts" ? (
              <button
                className="entry-card"
                key={item.id}
                onClick={() => show("post", item.id)}
              >
                <div>
                  {item.photos.length || item.cover ? (
                    <img
                      src={item.cover || photoPath(item.photos[0])}
                      loading="lazy"
                      alt=""
                    />
                  ) : (
                    <BookOpen size={36} />
                  )}
                </div>
                <h3>{item.title}</h3>
                <p>{item.note}</p>
              </button>
            ) : album ? (
              <button
                className="entry-card thumb-entry"
                key={item.id}
                onClick={() => show("photo", item.id)}
              >
                <div>
                  {item.sourceOnly ? (
                    <BookOpen size={28} />
                  ) : (
                    <img src={photoPath(item.id)} loading="lazy" alt="" />
                  )}
                </div>
                <span>{item.title}</span>
              </button>
            ) : (
              <button
                className="entry-card album-card"
                key={item.id}
                onClick={() => chooseAlbum(item)}
              >
                <div>
                  <img src={photoPath(item.photos[0])} loading="lazy" alt="" />
                  <b>
                    <ImageIcon size={13} /> {item.photos.length}
                  </b>
                </div>
                <h3>{item.name}</h3>
              </button>
            ),
          )}
        </div>
        {rows.length === 0 && (
          <div className="empty">
            <p>No matches for this search.</p>
            <button className="outline-btn" onClick={() => search("")}>
              Clear search
            </button>
          </div>
        )}
        {rows.length > limit && (
          <button
            className="outline-btn journal-more"
            onClick={() => setLimit((n) => n + 18)}
          >
            Show more <ArrowRight size={15} />
          </button>
        )}
      </section>
      {entry?.type === "film" ? (
        <ReelTheatre
          film={film}
          startAt={params.get("t")}
          playlist={
            tab === "films" && rows.some((item) => item.id === film.id)
              ? rows
              : films
          }
          close={close}
          choose={(id) => show("film", id, true)}
          bikes={bikes}
        />
      ) : (
        entry && (
          <JournalDialog
            entry={entry}
            close={close}
            openPhoto={(id) => show("photo", id)}
            step={step}
            bikes={bikes}
          />
        )
      )}
    </main>
  );
}
