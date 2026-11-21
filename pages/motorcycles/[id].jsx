import { Detail } from "../../src/public";
export function getServerSideProps({ req, params }) {
  const listings = req.publicListings();
  const bike = listings.find((item) => item.id === params.id);
  if (!bike) return { notFound: true };
  return {
    props: {
      id: bike.id,
      listings,
      title: [bike.year, bike.make, bike.model].filter(Boolean).join(" "),
    },
  };
}
export default Detail;
