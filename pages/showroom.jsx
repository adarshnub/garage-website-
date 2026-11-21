import { Showroom } from "../src/public";
export function getServerSideProps({ req }) {
  return { props: { listings: req.publicListings() } };
}
export default function ShowroomPage() {
  return (
    <main>
      <Showroom />
    </main>
  );
}
