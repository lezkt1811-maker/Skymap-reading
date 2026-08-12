# starchart13 proof dashboard

A local, browser-based tool for assembling a 13-sign chart wheel, a planet
placement list, and up to 9 sky-verification screenshots into a single
composite proof image.

Everything runs client-side (HTML5 canvas + FileReader) — no server,
no upload, no dependencies.

## Run it locally

Just open `index.html` in any browser. No build step, no install.

```bash
open index.html      # macOS
start index.html      # Windows
xdg-open index.html   # Linux
```

## Host it for free with GitHub Pages

1. Create a new repo on GitHub (e.g. `starchart13-proof-dashboard`) and
   push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/starchart13-proof-dashboard.git
   git push -u origin main
   ```
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`.
4. Save. GitHub will give you a live URL, typically:
   `https://<your-username>.github.io/starchart13-proof-dashboard/`

That live URL runs as a normal webpage (not inside a sandboxed preview),
so file uploads, canvas rendering, and PNG export all work as expected.

## Files

- `index.html` — the entire tool (markup, styles, and logic in one file)

## Notes

- Uploaded images never leave the browser; nothing is sent anywhere.
- "Export composite PNG" flattens the wheel, the planet list, and the
  proof grid into one downloadable image.
- To reuse this for a different chart, just refresh the page — all state
  is in-memory only and clears on reload.
