# L & S Motorsports showroom

Use Node.js 24 or later. Next.js renders the showroom and shares a Node server with the Express API. SQLite stores inventory, uploaded photos, enquiries, aggregate daily listing views, private sourcing leads and their review status.

## Run locally

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Open /admin for staff access. Run `npm run admin:password` in a private terminal to read the password for this installation. The first run creates a random password. Set ADMIN_PASSWORD to supply a password of at least 12 characters instead. Sessions expire after eight hours and reset when the server restarts.

## Operating the showroom

Create a listing from Inventory → Add listing. Choose photographs, select a cover, enter motorcycle details, and select Available to publish. Draft hides a listing. Reserved, Sold and Archive remain visible with their status. Thirteen motorcycle records include three advertisements, acquisition announcements, historical sale material and a published custom build. Advertised identifies a seller offer whose current availability needs confirmation. An acquisition mention is preserved in the archive. Repeated imports keep staff edits. Their source links and photo credits appear on each detail page. The hero is a generated editorial illustration. The full-screen detail viewer uses sourced photographs, supports swipe and keyboard navigation, and offers 2× inspection. The original logo was obtained from the company's Facebook profile.

The Enquiries tab receives buyer and trade-in messages. Staff can reply using the displayed email address. The Analytics tab reports actual listing detail views and submitted enquiries by UTC date, plus the current inventory mix. Views count page opens and include repeat visits.

The garage journal at /journal contains 40 dealer reels with local MP4 playback, seven posts or archived sale features, and six albums. The 158 photo records include 156 gallery images and two source links for service paperwork. The homepage features two film covers with selectable scenes. Playing a scene opens the cinema at that timestamp, and closing the viewer returns to the original shelf or cover. Related films on the motorcycle pages link back to the dealer’s original footage.

## Private sourcing and Codex

Open `/admin/sourcing` after signing in. Select an Australian city, the date window and a model family, or leave the model blank to use the most frequent historical showroom model. Each manual search reads the public results and checks up to eight qualifying individual ads. The results record the scope and any login prompt, request limit or access interruption. Facebook controls the radius and visibility of each search. Publicly available cover photos are cached in the private database. Extra seller media links can expire. Open the original ad for the latest availability and contact options. Staff can shortlist, dismiss and restore leads.

Install Chromium for the project with `npx playwright-core install chromium`, or set `MARKETPLACE_BROWSER_PATH` to an installed compatible Chromium executable. The connector uses a fresh signed-out browser. It stops at an explicit rate restriction or checkpoint. Meta requires prior permission for automated data collection and describes its controls in [How We Combat Scraping](https://about.fb.com/news/2021/04/how-we-combat-scraping/).

Install the official Codex CLI on the same host and run `codex login` as the OS account that runs the showroom. Choose ChatGPT sign-in, then check `codex login status`. The admin workspace displays the connection status. You can set `SHOWROOM_CODEX_BIN` to the native executable’s absolute path. The host uses the signed-in account’s Codex entitlement and usage limits. The tested CLI version is 0.169.0. See [Codex authentication](https://developers.openai.com/codex/auth/) and [non-interactive mode](https://developers.openai.com/codex/noninteractive/).

Open `/admin/agent` to ask showroom questions or start with a sample prompt. The agent uses showroom inventory, aggregate traffic and enquiry counts, film and album totals, and private sourcing leads to answer staff questions. During a sourcing run it can assess direct ads and check indexed Facebook seller posts and videos. Search results and restricted coverage are recorded independently. Runs can be stopped in the admin console. Runs do not message sellers or publish stock.

## Production

```sh
npm run build
npm start
```

Deploy the project with the production .next build, next.config.mjs, public, server, src/data, package files and installed runtime dependencies. Express serves the shared media directory with byte-range support. Set HOST and PORT as needed. Serve behind HTTPS, set COOKIE_SECURE=true, and pass the original Host header through your reverse proxy. Use persistent storage for DATA_DIR (default .data), keep it outside public directories, and back it up using a consistent SQLite backup. The server runs as one process. Private staff credentials and SQLite data are excluded from Git. Staff review sourcing leads privately. Only listings published through Inventory appear in the public showroom.

## Sources

The [research record](company-research.md) includes the company details, individual motorcycle sources and the limits of the public Facebook inventory.

- [Business Facebook profile and original logo](https://www.facebook.com/gclsmotorsports/)
- [Company sales archive and original listing photos](https://web.archive.org/web/20210814102926/https://www.lsmotorsports.com.au/)
- [Custom GSX-R1000 feature and iKapture photos](https://bikereview.com.au/custom-bike-turbo-ls-motorsports-gsx-r1000/)
- [Australian Business Register](https://abr.business.gov.au/ABN/View?abn=11320484631)
