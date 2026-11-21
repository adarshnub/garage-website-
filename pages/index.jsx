import { Home } from "../src/public";
export function getServerSideProps({ req }) {
  return { props: { listings: req.publicListings() } };
}
export default function HomePage() {
  return (
    <main>
      <Home />
    </main>
  );
}
