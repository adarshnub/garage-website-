import Journal from "../src/Journal";
export function getServerSideProps({ req }) {
  return { props: { listings: req.publicListings() } };
}
export default Journal;
