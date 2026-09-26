# Spec 10 — Nginx SPA Configuration

## Step 1 — Artifact

Ship a single Nginx server block at `nginx/spa.conf`. The file is intended to be mounted into a containerized Nginx image (or included from a higher-level Nginx configuration) that serves the built SolidJS SPA from `/usr/share/nginx/html`.

## Step 2 — Server-block essentials

The server block MUST:

- Listen on port `3000`. The port is deliberate: it matches the Vite dev port so local and containerized runs behave the same way from a developer's perspective.
- Use `server_name _` (catch-all). The SPA container is not authoritative for hostname routing; an upstream reverse proxy or load balancer handles it.
- Set the document root to `/usr/share/nginx/html` and the index file to `index.html`.
- Disable `server_tokens` so the response headers do not advertise the Nginx version.
- Cap `client_max_body_size` at `16m`. The SPA itself does not accept uploads — the cap exists to fail fast on bad requests rather than buffer them indefinitely.

## Step 3 — Security headers (default)

At the server-block level, set the following headers with `always` so they apply to error responses too. Any nested location that declares its own `add_header` MUST repeat this complete security-header set because Nginx otherwise stops inheriting the parent set:

- `X-Content-Type-Options: nosniff` — disables MIME sniffing.
- `X-Frame-Options: DENY` — blocks clickjacking via iframe embedding.
- `Referrer-Policy: strict-origin-when-cross-origin` — leaks only the origin on cross-origin requests, full URL on same-origin.
- A baseline Content Security Policy that restricts default sources to self; permits inline styles (required by CSS Modules build outputs and some bundlers); permits images from self, data URIs, and blob URLs (for runtime-generated assets like base64 thumbnails); disallows objects and framing; and restricts form submissions to self.

## Step 4 — Compression

Enable gzip compression for the SPA's text-like asset types:

- `gzip on`, `gzip_vary on`, `gzip_proxied any`, `gzip_comp_level 6`, `gzip_min_length 256`.
- `gzip_types` enumerates plain text, CSS, both `text/javascript` and `application/javascript`, JSON, XML, WASM, woff2, and SVG. Pre-compressed binary formats (PNG, woff/woff2 already compressed at the file level) gain nothing from on-the-fly gzip.

The compression level is chosen to balance CPU and ratio. Higher levels yield diminishing returns for typical bundles.

## Step 5 — index.html caching strategy

A dedicated `location = /index.html` block:

- Repeats the security headers because the location also declares `Cache-Control`, which disables inheritance of the parent `add_header` set.
- Sets `Cache-Control: no-cache, no-store, must-revalidate`. The index references hashed asset filenames; the index itself must never be cached so users pick up new asset hashes on the next visit.
- `try_files $uri =404` so an explicit request for `/index.html` either serves the file or returns 404.

## Step 6 — SPA fallback routing

A root location block (`location /`) uses `try_files $uri $uri/ /index.html`. This is the SPA fallback: a client request to a deep route is rewritten to `index.html`, which then takes over routing on the client side. The order matters — try the requested file, then the directory variant, then the SPA shell.

## Step 7 — Static-asset caching

A location regex matches `js`, `css`, `png`, `jpg`, `jpeg`, `gif`, `ico`, `svg`, `wasm`, `woff`, `woff2`, `ttf`, and `eot` by extension. It does not inspect the filename for a content hash, so consumers MUST deploy content-hashed names for every mutable asset covered by this policy. The location:

- `expires 1y`.
- `Cache-Control: public, immutable`.
- Repeats the complete security-header set from Step 3 because its own `Cache-Control` declaration prevents inheritance.

The bundler emits content-hashed filenames; an immutable cache is safe because any content change produces a new filename.

## Step 8 — Hardening guidance for consumers

Consumers SHOULD:

- Place this server block behind a TLS-terminating reverse proxy and not expose port 3000 directly to the public internet.
- Tune the CSP `connect-src` directive to allow whatever API origins the SPA actually calls. The shipped default keeps everything `self`; consumers MUST override when a backend lives at a different origin.
- Disable the `script-src 'self'` baseline only if they genuinely need third-party scripts (analytics, error reporting) and accept the security implications.

## Step 9 — Export entry

The exports map exposes `./nginx/spa` pointing at `nginx/spa.conf`. The conf extension is not loadable by Node — consumers reference the path as a string, typically inside a Dockerfile `COPY` instruction.

## Acceptance criteria

- Nginx accepts the configuration and listens on port 3000 with the stated root, index, body limit, and hidden server tokens.
- `/index.html`, root/deep-route responses, static assets, and error responses contain the required security headers; the index response is explicitly non-cacheable.
- An existing file/directory resolves directly, an unknown deep route falls back to `/index.html`, and a missing explicit `/index.html` returns 404.
- Matching asset extensions receive one-year expiry and `public, immutable`; gzip covers exactly the listed text-like MIME types and thresholds.
- The raw configuration resolves through `./nginx/spa` and is included in the package tarball.
