import React, { useRef } from "react";
import { Link, useSearchParams } from "./routing";
import { ArrowDown, ArrowUpRight, Clapperboard, Play } from "lucide-react";
import { bikeName, useResource } from "./shared";
import { films, poster, ReelLink } from "./Films";
import BikePrice from "./BikePrice";
import FeaturedFilm from "./FeaturedFilm";

const chapters = [
  { slug: "", label: "The showroom", image: "/media/showroom-hero.webp" },
  { slug: "gsx-r750-2021", label: "GSX-R750 · 2021", film: films[0] },
  { slug: "two-generations", label: "Two generations", film: films[13] },
];
export default function Landing() {
  const [params, setParams] = useSearchParams();
  const index = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.slug === params.get("feature")),
  );
  const { data: stock } = useResource("listings");
  const chapter = chapters[index],
    film = chapter.film;
  const offer =
    !film &&
    stock?.find(
      (bike) =>
        ["Available", "Advertised"].includes(bike.status) &&
        bike.price != null &&
        bike.photos.length,
    );
  const tabs = useRef([]);
  function select(i) {
    const next = new URLSearchParams(params);
    if (i === 0) next.delete("feature");
    else next.set("feature", chapters[i].slug);
    setParams(next, { replace: true, preventScrollReset: true });
    tabs.current[i]?.focus({ preventScroll: true });
  }
  function key(e, i) {
    const next = {
      ArrowLeft: (i + chapters.length - 1) % chapters.length,
      ArrowRight: (i + 1) % chapters.length,
      Home: 0,
      End: chapters.length - 1,
    }[e.key];
    if (next !== undefined) {
      e.preventDefault();
      select(next);
    }
  }
  return (
    <section
      className={"cinema-home" + (film ? " film-chapter" : "")}
      aria-label="Showroom features"
    >
      {film ? (
        <FeaturedFilm
          key={film.id}
          film={film}
          stock={stock}
          chapterId={"chapter-" + index}
        />
      ) : (
        <>
          <div className="cinema-picture" aria-hidden="true">
            <img src={chapter.image} alt="" fetchPriority="high" />
          </div>
          <div
            className="wrap cinema-body"
            role="tabpanel"
            id="hero-feature"
            aria-labelledby="chapter-0"
          >
            <div className="cinema-type">
              <p className="cinema-locator">
                <i /> Broadbeach, Queensland
              </p>
              <h1>
                Gold Coast
                <br />
                <em>Superbikes</em>
                <span>.</span>
              </h1>
              <p className="cinema-deck">
                Pre-owned motorcycles, from eighties race replicas to modern
                supersports.
              </p>
              <div className="cinema-links">
                <a className="button" href="#collection">
                  Explore motorcycles <ArrowDown size={16} />
                </a>
                <ReelLink film={chapters[1].film}>
                  <Play size={15} /> Watch a reel
                </ReelLink>
              </div>
            </div>
            {offer && (
              <Link className="cinema-offer" to={"/motorcycles/" + offer.id}>
                <img src={offer.photos[0]} alt="" />
                <div className="offer-summary">
                  <span>Featured listing</span>
                  <strong>{bikeName(offer)}</strong>
                </div>
                <BikePrice bike={offer} />
                <ArrowUpRight size={17} />
              </Link>
            )}
          </div>
        </>
      )}
      <div className="cinema-dock">
        <div className="wrap dock-inner">
          <div
            className="reel-tabs"
            role="tablist"
            aria-label="Choose a showroom feature"
          >
            {chapters.map((item, i) => (
              <button
                key={item.label}
                id={"chapter-" + i}
                role="tab"
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                aria-controls="hero-feature"
                aria-selected={index === i}
                tabIndex={index === i ? 0 : -1}
                onClick={() => select(i)}
                onKeyDown={(e) => key(e, i)}
              >
                <img src={item.film ? poster(item.film) : item.image} alt="" />
                <span>{item.label}</span>
                {item.film && <Play size={10} fill="currentColor" />}
              </button>
            ))}
          </div>
          <Link className="dock-journal" to="/journal">
            <Clapperboard size={16} /> Film journal <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
