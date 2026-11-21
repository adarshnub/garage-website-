import { Action } from "../src/shared";
export default function NotFound() {
  return (
    <main className="wrap inner-page">
      <h1>Page not found.</h1>
      <Action to="/">Return home</Action>
    </main>
  );
}
