import React, { useEffect, useRef } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { Header, Footer, PublicStock } from "../src/shared";
import { DisplayPath } from "../src/routing";
import ScrollMotion from "../src/ScrollMotion";

import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "../src/styles.css";
import "../src/experience.css";
import "../src/journal.css";
import "../src/navigation.css";
import "../src/featured-film.css";
import "../src/pricing.css";
import "../src/reel-player.css";
import "../src/custom-select.css";
import "../src/scroll-motion.css";
import "../src/admin.css";
import "../src/sourcing.css";

const ReelOverlay = dynamic(
  () => import("../src/Journal").then((module) => module.ReelOverlay),
  { ssr: false },
);
const titles = {
  "/": "Gold Coast Motorcycle Showroom",
  "/showroom": "Showroom",
  "/journal": "Garage journal",
  "/about": "About",
  "/sell": "Sell your bike",
  "/contact": "Get in touch",
};

export default function ShowroomApp({ Component, pageProps, router }) {
  const previous = useRef(null);
  const origin =
    router.pathname === "/journal" && router.query.film && router.query._origin;
  const background =
    origin && previous.current?.path === origin ? previous.current : null;
  const path = background?.path || router.asPath;
  const Page = background?.Component || Component;
  const props = background?.props || pageProps;
  const pathname = path.split(/[?#]/)[0];
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const title =
    props.title ||
    titles[pathname] ||
    (isAdmin ? "Dealer workspace" : "Page not found");
  useEffect(() => {
    if (!background)
      previous.current = { path: router.asPath, Component, props: pageProps };
  }, [router.asPath, Component, pageProps, background]);
  return (
    <div id="root">
      <Head>
        <title>{title + " | L & S Motorsports"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#101010" />
        <meta
          name="description"
          content="Explore L & S Motorsports motorcycles, custom builds and used sports bikes on Australia's Gold Coast. Enquire about buying, sourcing or trading your motorcycle."
        />
        <link rel="icon" href="/media/ls-original.jpg" />
        {isAdmin && <meta name="robots" content="noindex, nofollow" />}
      </Head>
      <PublicStock.Provider value={props.listings}>
        <DisplayPath.Provider value={background?.path || null}>
          <a href="#page" className="skip">
            Skip to content
          </a>
          {!isAdmin && <Header pagePath={pathname} />}
          <div id="page" tabIndex="-1">
            <Page {...props} />
          </div>
          {!isAdmin && <Footer />}
        </DisplayPath.Provider>
        <ScrollMotion />
        {background && <ReelOverlay />}
      </PublicStock.Provider>
    </div>
  );
}
