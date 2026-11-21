import React, { useState } from "react";
import { Link } from "./routing";
import { ArrowUpRight, Clapperboard, Play } from "lucide-react";
import BikePrice from "./BikePrice";
import { ReelLink, runtime } from "./Films";
import { bikeName } from "./shared";

const edits = {
  1797820274802694: {
    kicker: "Dealer walkaround",
    title: "2021 Suzuki",
    model: "GSX-R750",
    description:
      "Get close to the silver fairings, orange forks and sculpted tank of this one-owner Suzuki, filmed by L&S on the Gold Coast.",
    shots: [
      { at: 0, label: "Front three-quarter", focus: "50% 42%" },
      { at: 16.2, label: "Fairing detail", focus: "50% 55%" },
      { at: 23.2, label: "Fuel tank", focus: "50% 50%" },
    ],
  },
  1788456648875963: {
    kicker: "Back to back",
    title: "Two generations of",
    model: "GSX-R750",
    description:
      "Twin round headlights on the 1990. Angular bodywork on the 2021. L&S puts the two Suzukis side by side for a closer look.",
    shots: [
      { at: 0, label: "The two Suzukis", focus: "50% 53%" },
      { at: 9.2, label: "The 2021 tank", focus: "50% 50%" },
      { at: 24.2, label: "1990 in profile", focus: "50% 59%" },
    ],
  },
};

export default function FeaturedFilm({ film, stock, chapterId }) {
  const [selected, setSelected] = useState(0);
  const edit = edits[film.id];
  const shot = edit.shots[selected];
  const image = (index) => "/media/features/" + film.id + "-" + index + ".webp";
  const related = film.bikes
    .map((id) => stock?.find((bike) => bike.id === id))
    .filter(Boolean);
  return (
    <div
      className="feature-spread wrap"
      role="tabpanel"
      id="hero-feature"
      aria-labelledby={chapterId}
    >
      <div className="feature-print">
        <ReelLink
          className="feature-screen"
          film={film}
          startAt={shot.at}
          aria-label={
            "Play " + film.title + " from " + runtime(Math.floor(shot.at))
          }
        >
          <img
            key={selected}
            src={image(selected)}
            style={{ objectPosition: shot.focus }}
            alt={shot.label}
            fetchPriority="high"
          />
          <div className="feature-screen-top">
            <Clapperboard size={15} /> L&S on film{" "}
          </div>
          <div className="feature-play">
            <span className="feature-play-disc">
              <Play size={22} fill="currentColor" />
            </span>
            <span>
              <strong>
                {selected
                  ? "Play from " + runtime(Math.floor(shot.at))
                  : "Play film"}
              </strong>
              <small>
                {selected ? shot.label : runtime(film.duration) + " runtime"}
              </small>
            </span>
          </div>
        </ReelLink>
        <div
          className="feature-frames"
          role="group"
          aria-label="Choose a scene"
        >
          {edit.shots.map((part, i) => (
            <button
              type="button"
              key={part.at}
              onClick={() => setSelected(i)}
              aria-pressed={selected === i}
              aria-label={
                "Preview " + part.label + " at " + runtime(Math.floor(part.at))
              }
            >
              <img
                src={image(i)}
                style={{ objectPosition: part.focus }}
                alt=""
              />
              <span>{runtime(Math.floor(part.at))}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="feature-article">
        <div className="feature-intro">
          <p className="feature-kicker">
            <i /> {edit.kicker}
          </p>
          <h1>
            {edit.title}
            <br />
            <em>
              {edit.model}
              <span>.</span>
            </em>
          </h1>
          <p className="feature-story">{edit.description}</p>
        </div>
        <div
          className="feature-stock"
          style={{ "--featured-rows": film.bikes.length }}
        >
          {related.map((bike) => (
            <Link
              key={bike.id}
              className="feature-stock-row"
              to={"/motorcycles/" + bike.id}
            >
              <div className="feature-bike-title">
                <strong>
                  {related.length === 1 ? "View motorcycle" : bikeName(bike)}
                </strong>
                <span>
                  {bike.km != null
                    ? bike.km.toLocaleString("en-AU") + " km · "
                    : ""}
                  {bike.category}
                </span>
              </div>
              <BikePrice bike={bike} />
              <ArrowUpRight size={19} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
