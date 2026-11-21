import React, { useEffect, useState } from "react";
import { Link } from "./routing";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  SlidersHorizontal,
  Search,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { api, useResource, bikeName, Action, Message, Status } from "./shared";

import Landing from "./Landing";
import { FilmShelf } from "./Films";
import MotorcycleDetail from "./MotorcycleDetail";
import BikePrice from "./BikePrice";
import CustomSelect from "./CustomSelect";

const fb = "https://www.facebook.com/gclsmotorsports/";
export function Home() {
  return (
    <>
      <Landing />
      <FilmShelf />
      <Showroom embedded />
    </>
  );
}
function Card({ bike }) {
  return (
    <Link className="bike-card" to={"/motorcycles/" + bike.id}>
      <div className="card-img">
        {bike.photos[0] ? (
          <img loading="lazy" src={bike.photos[0]} alt={bikeName(bike)} />
        ) : (
          <div className="record-card">
            <b>{bike.year ?? bike.make}</b>
            <span>Original photograph unavailable</span>
          </div>
        )}
        <Status value={bike.status} />
      </div>
      <div className="card-line">
        <span>
          {bike.year ?? "Year unlisted"} / {bike.category}
        </span>
        <ArrowUpRight size={18} />
      </div>
      <h3>
        {bike.make} {bike.model}
      </h3>
      <div className="card-bottom">
        <BikePrice bike={bike} />
        <span className="card-facts">
          {[
            bike.cc && bike.cc.toLocaleString() + " cc",
            bike.km != null && bike.km.toLocaleString() + " km",
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
    </Link>
  );
}
export function Showroom({ embedded = false }) {
  const { data: bikes, error } = useResource("listings");
  const [search, setSearch] = useState(""),
    [make, setMake] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("Featured"),
    [mobileFilters, setMobile] = useState(false);
  const makes = Array.from(
    new Set((bikes || []).map((bike) => bike.make)),
  ).sort();
  const results = (bikes || []).filter(
    (b) =>
      (!make || b.make === make) &&
      (!status || b.status === status) &&
      bikeName(b).toLowerCase().includes(search.trim().toLowerCase()),
  );
  if (sort === "Price: low to high")
    results.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  if (sort === "Newest year") results.sort((a, b) => b.year - a.year);
  const Heading = embedded ? "h2" : "h1";
  return (
    <section className="collection wrap" id="collection">
      <div className="section-marker">
        <i />
        Showroom
        <span />
      </div>
      <div className="collection-title">
        <Heading>
          Motorcycle inventory<span>.</span>
        </Heading>
        <p>
          Browse seller advertisements and explore
          <br className="wide-only" /> past bikes from the L&S archive.
        </p>
      </div>
      <div className="filter-row">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search motorcycles"
            placeholder="Search motorcycles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button
          className="mobile-filters outline-btn"
          onClick={() => setMobile(!mobileFilters)}
          aria-expanded={mobileFilters}
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
        <div className={"filter-controls " + (mobileFilters ? "expanded" : "")}>
          <CustomSelect
            aria-label="Make"
            value={make}
            onChange={setMake}
            options={[{ value: "", label: "All makes" }, ...makes]}
          />
          <CustomSelect
            aria-label="Availability"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "All statuses" },
              "Advertised",
              "Available",
              "Reserved",
              "Sold",
              "Archive",
            ]}
          />
          <CustomSelect
            aria-label="Sort motorcycles"
            value={sort}
            onChange={setSort}
            options={["Featured", "Newest year", "Price: low to high"]}
          />
        </div>
      </div>
      <div className="result-count" aria-live="polite">
        {bikes &&
          results.length + " motorcycle" + (results.length === 1 ? "" : "s")}
      </div>
      {error ? (
        <Message error>{error}</Message>
      ) : !bikes ? (
        <Message>Loading motorcycles…</Message>
      ) : results.length ? (
        <div className="bike-grid">
          {results.map((b) => (
            <Card key={b.id} bike={b} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>No matching motorcycles</h3>
          <p>Try another search or ask us to source a bike.</p>
          <button
            className="outline-btn"
            onClick={() => {
              setSearch("");
              setMake("");
              setStatus("");
            }}
          >
            Clear filters
          </button>{" "}
          <Link className="text-link" to="/contact">
            Get in touch <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {embedded && (
        <div className="sell-strip">
          <div>
            <h2>Selling your bike?</h2>
            <p>Tell us what you ride and enquire about a sale or trade-in.</p>
          </div>
          <Action to="/sell" secondary>
            Sell or trade
          </Action>
        </div>
      )}
    </section>
  );
}
export function Detail({ id }) {
  const { data: bikes, error } = useResource("listings");
  const b = bikes?.find((x) => x.id === id);
  useEffect(() => {
    if (b?.id) api("listings/" + b.id + "/view", "POST").catch(() => {});
  }, [b?.id]);
  if (error || !bikes || !b)
    return (
      <div className="wrap inner-page">
        <Message error={!!error}>
          {error ||
            (!bikes
              ? "Loading motorcycle…"
              : "This motorcycle is no longer listed.")}
        </Message>
        <Action to="/showroom">Back to showroom</Action>
      </div>
    );
  return (
    <MotorcycleDetail key={id} bike={b}>
      <Enquiry type="Motorcycle" listingId={b.id} />
    </MotorcycleDetail>
  );
}
function Enquiry({ type, listingId }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  async function send(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("enquiries", "POST", {
        ...Object.fromEntries(form),
        type,
        listingId,
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="success-panel" role="status">
        <Check />
        <h3>Enquiry received.</h3>
        <p>Your message is in the L&S enquiries inbox.</p>
        <button className="outline-btn" onClick={() => setDone(false)}>
          Send another enquiry
        </button>
      </div>
    );
  return (
    <form onSubmit={send} className="form enquiry">
      <div className="form-pair">
        <label>
          Your name
          <input name="name" autoComplete="name" maxLength={100} required />
        </label>
        <label>
          Email address
          <input
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
      </div>
      <label>
        {type === "Sell or trade" ? "Motorcycle details" : "Your message"}
        <textarea
          name="message"
          rows="5"
          maxLength={3000}
          placeholder={
            type === "Sell or trade"
              ? "Include the year, make, model, kilometres and condition."
              : "How can we help?"
          }
          required
        />
      </label>
      {error && <Message error>{error}</Message>}
      <button className="button" disabled={busy}>
        {busy ? "Sending…" : "Send enquiry"}
        <ArrowRight size={17} />
      </button>
    </form>
  );
}
export function Contact({ sell = false }) {
  return (
    <main className="wrap inner-page">
      <div className="section-marker">
        <i />
        {sell ? "Trade-ins" : "Contact"}
        <span />
      </div>
      <div className="contact-grid">
        <div>
          <h1>
            {sell ? "Sell your bike" : "Get in touch"}
            <span>.</span>
          </h1>
          <p className="intro">
            {sell
              ? "Looking to sell or trade your motorcycle? Tell L&S about your bike for a buying or trade-in enquiry."
              : "Ask about a motorcycle, interstate transport or sourcing your next sports bike."}
          </p>
          <div className="contact-detail">
            <MapPin size={19} />
            <span>
              PO Box 1279, Broadbeach QLD 4218
              <br />
              <small>Postal address. Call to arrange a viewing.</small>
            </span>
          </div>
          <div className="contact-detail">
            <Phone size={18} />
            <a href="tel:+61401481606">0401 481 606</a>
          </div>
          <div className="contact-detail">
            <Mail size={18} />
            <a href="mailto:lsmotorsportssc@gmail.com">
              lsmotorsportssc@gmail.com
            </a>
          </div>
          <a className="text-link" href={fb} target="_blank" rel="noreferrer">
            Visit L&S on Facebook <ArrowUpRight size={16} />
          </a>
        </div>
        <Enquiry
          key={sell ? "sell" : "general"}
          type={sell ? "Sell or trade" : "General"}
        />
      </div>
    </main>
  );
}
export function About() {
  return (
    <main className="wrap inner-page">
      <div className="section-marker">
        <i />
        About L&S
        <span />
      </div>
      <div className="about-grid">
        <div>
          <h1>
            From the
            <br />
            Gold Coast<span>.</span>
          </h1>
          <p className="intro">
            L & S Motorsports Services and Consulting is an independent
            motorcycle business run by Lis Stromer in Queensland.
          </p>
          <p>
            Lis grew up drawing sports bikes from magazines while his father
            worked on motorcycles. That early interest in race-bike styling grew
            into a business buying, selling and sourcing pre-owned motorcycles.
          </p>
          <p>
            The L&S collection spans Japanese supersports, learner-approved
            bikes and custom builds. The business also advertises trade-ins,
            finance enquiries and Australia-wide shipping.
          </p>
          <p>
            L&S dates its beginnings to August 2014. Its Facebook page also
            lists local motorcycle transport and storage. The dealer advertises
            Queensland motor dealer licence 3953959.
          </p>
          <Action to="/contact">Contact L&S</Action>
          <a
            className="source-link"
            href={fb + "about/"}
            target="_blank"
            rel="noreferrer"
          >
            Company profile <ArrowUpRight size={14} />
          </a>
          <a
            className="source-link"
            href="https://abr.business.gov.au/ABN/View?abn=11320484631"
            target="_blank"
            rel="noreferrer"
          >
            Business registration <ArrowUpRight size={14} />
          </a>
        </div>
        <figure>
          <img
            src="/media/turbo-0.webp"
            alt="Lis Stromer with his custom turbocharged GSX-R1000"
          />
          <figcaption>
            Lis Stromer with his custom GSX-R1000. iKapture / Bike Review.
          </figcaption>
        </figure>
      </div>
    </main>
  );
}
