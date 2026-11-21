// The seller's asking price and odometer are recorded as shown in the linked source.
const checked = "2026-11-20";
const archive =
  "https://web.archive.org/web/20201103024204id_/https://www.facebook.com/gclsmotorsports";
function pictures(series, count) {
  return Array.from(
    { length: count },
    (_, i) => "/media/" + series + "-" + (i + 1) + ".webp",
  );
}
export const facebookListings = [
  {
    id: "2021-suzuki-gsx-r750",
    year: 2021,
    make: "Suzuki",
    model: "GSX-R750",
    km: 14000,
    price: 13990,
    status: "Advertised",
    sourceDate: checked,
    description:
      "One owner, two keys and a full service history. L&S describes this GSX-R750 as recently serviced and largely standard apart from a Two Brothers exhaust. The Queensland asking price includes nine months of registration and a roadworthy certificate. The seller also offered it unregistered for A$13,750.",
    photos: pictures("gsxr750-2021", 5),
    source:
      "https://www.facebook.com/gclsmotorsports/posts/pfbid02S8xK8dC5tRCVRxrzHXZbMLEGymD6CnZbSNwcBWwaDWyPcAVHni5TUYJqnN5ug4ckl",
  },
  {
    id: "1990-suzuki-gsx-r750",
    year: 1990,
    make: "Suzuki",
    model: "GSX-R750",
    km: 33000,
    price: 13990,
    status: "Advertised",
    sourceDate: checked,
    description:
      "An Australian-delivered GSX-R750 with its original key, a Yoshimura exhaust and Öhlins suspension. L&S reports a clear PPSR certificate and offers a pre-sale check. Queensland registration and a roadworthy certificate were offered at the agreed price.",
    photos: pictures("gsxr750-1990", 1),
    source:
      "https://www.facebook.com/gclsmotorsports/posts/pfbid03rLwj53m92NrYticv6LNsHgzxa7uxpsKi48TiaySt35VuwxqeGBDQMCut92na1vVl",
  },
  {
    id: "2013-suzuki-gsx-r750-l3",
    year: 2013,
    make: "Suzuki",
    model: "GSX-R750 L3",
    km: 21000,
    price: 11990,
    status: "Advertised",
    description:
      "Factory black with two keys, Brembo clutch and front brake components, braided lines and a tuned M4 exhaust system. The seller recorded 21,000 km, reported a clear PPSR certificate and invited part-exchange offers.",
    photos: pictures("gsxr750-l3", 1),
    source: "https://www.facebook.com/reel/1167667619356609/",
  },
  {
    id: "1991-suzuki-gsx-r750",
    year: 1991,
    make: "Suzuki",
    model: "GSX-R750",
    km: null,
    price: null,
    status: "Archive",
    description:
      "L&S introduced this blue-and-white GSX-R750 as a new acquisition in a showroom reel. The caption identifies the year and model. It gives no asking price or odometer reading.",
    photos: pictures("gsxr750-1991", 1),
    source: "https://www.facebook.com/reel/1781881809563575/",
  },
  {
    id: "1999-yamaha-yzf-r1",
    year: 1999,
    make: "Yamaha",
    model: "YZF-R1",
    km: null,
    price: null,
    status: "Archive",
    description:
      "L&S named a 1999 Yamaha YZF-R1 in a reel introducing two acquisitions. The seller did not give an asking price or odometer reading for the Yamaha.",
    photos: ["/media/r1-1999-side.webp", "/media/r1-1999-tank.webp"],
    credit: "Frames from the original L & S Motorsports acquisition reel",
    source: "https://www.facebook.com/reel/1508023464716556/",
  },
  {
    id: "1988-suzuki-gsx-r750",
    year: 1988,
    make: "Suzuki",
    model: "GSX-R750",
    km: 44000,
    price: 7500,
    status: "Archive",
    created: "2020-11-03T00:00:00Z",
    description:
      "A June 1988 build imported in 2004. The period advertisement describes white-and-gold pearl paint, mirror-polished wheels and a custom exhaust. The A$7,500 price comes from the 2020 sale record.",
    photos: pictures("gsxr750-1988", 4),
    source: "https://www.facebook.com/gclsmotorsports/posts/2784088861851180",
  },
  {
    id: "2018-kawasaki-ninja-400",
    year: 2018,
    make: "Kawasaki",
    model: "Ninja 400",
    category: "Learner approved",
    km: 4900,
    price: 6490,
    status: "Archive",
    created: "2020-11-03T00:00:00Z",
    description:
      "This one-owner learner-approved Ninja appeared on the company's Facebook page in 2020. L&S listed two keys, a logbook and manual, an Akrapovič exhaust and a tail tidy. The seller reported a recent service, clear title and registration through December 2020 with a roadworthy certificate.",
    photos: [],
    source: archive,
  },
  {
    id: "2004-suzuki-gsx-r750",
    make: "Suzuki",
    model: "GSX-R750",
    year: 2004,
    status: "Archive",
    km: 14000,
    price: 7500,
    checked: "2026-11-21",
    description:
      "A time-limited A$7,500 promotion showed this Suzuki with its original fairings and colours, two keys, an aftermarket exhaust, a Power Commander and new Bridgestone tyres. The seller reported a clear PPSR and offered Queensland registration at the agreed price.",
    photos: [
      "/media/gsxr750-2004-front.webp",
      "/media/films/1658687905612995.webp",
    ],
    source: "https://www.facebook.com/reel/1658687905612995/",
  },
  {
    id: "2008-suzuki-gsx-r750",
    make: "Suzuki",
    model: "GSX-R750",
    year: 2008,
    status: "Archive",
    km: null,
    price: null,
    checked: "2026-11-21",
    description:
      "L&S introduced this white 2008 GSX-R750 in a walkaround outside its premises. The acquisition announcement gives the model and year without an odometer reading or asking price.",
    photos: ["/media/films/4406985656298685.webp"],
    source: "https://www.facebook.com/reel/4406985656298685/",
  },
  {
    id: "honda-cb500",
    make: "Honda",
    model: "CB500",
    year: null,
    category: "Learner approved",
    status: "Archive",
    km: null,
    price: 2999,
    checked: "2026-11-21",
    description:
      "The dealer announced a learner-approved CB500 as coming soon and quoted A$2,999. The source does not specify its model year or odometer reading.",
    photos: ["/media/films/2564708150672889.webp"],
    source: "https://www.facebook.com/reel/2564708150672889/",
  },
].map((bike) => ({
  category: "Supersport",
  cc: null,
  created: checked + "T00:00:00Z",
  checked,
  credit: bike.photos.length ? "L & S Motorsports · Facebook" : "",
  ...bike,
}));
