# Project guide

- Use Node.js 22.18 or newer and pnpm 10.9.0.
- Stack: Next.js App Router, React, TypeScript, Tailwind CSS, and Base UI. Scene programs are self-contained HTML.
- Preserve the Chinese interface and existing dark visual style.

## Commands

- Install: `pnpm install --frozen-lockfile`.
- Develop: `pnpm dev`; pass `--port 3001` if the default port is occupied.
- Check: `pnpm check` runs ESLint, route type generation, TypeScript, and unit tests.
- Build: `pnpm build`.
- Browser tests: `pnpm exec playwright install chromium`, then `pnpm build && pnpm test:e2e`. Tests use port 3100, isolated scene storage, a test-only key, and software WebGL.
- Dependency audit: `pnpm audit`.
- Scene CLI: `pnpm scenes --help`; API reference and deployment instructions are in README.md.
- After removing routes, old `.next/dev/types` may reference deleted files. Briefly starting the development server regenerates them; do not weaken TypeScript checks to hide stale generated types.
- Stop temporary verification servers when finished unless the user explicitly requests a running preview.

## Scene management and security

- Use `.devin/skills/manage-scenes/SKILL.md` and its client for content operations. Do not hardcode scene data into application source.
- `lib/scenes/model.ts` defines scene records; `lib/scenes/store.ts` reads the persistent catalog at request time. A fresh volume must start empty, without demo scenes.
- Known legacy demo overrides are retained in storage for compatibility but excluded from public and management reads. Do not erase existing volume data during upgrades or hide unrecognized corrupt records.
- `/admin` and `/api/preview` were removed. Do not restore a public editor or an anonymous write API.
- Management endpoints under `/api/v1/scenes` require `X-API-Key`. Missing or weak server configuration fails closed. PATCH requires the version ETag in `If-Match` and rejects stale updates.
- Never expose `SCENE_API_KEY` to client components, build arguments, metadata, URLs, logs, Git, or model context. Initialize an empty key through `pnpm scenes init-key`; never read private environment files into the conversation or rotate an existing key without authorization.
- Uploaded HTML is data, never executable server-side code. Preserve the opaque-origin iframe, restrictive response CSP, no-store policy, and input limits. Do not add same-origin permissions, external network access, worker support, or server-side execution of uploaded projects.
- Covers are decoded and normalized with Sharp. Keep the format, byte, pixel and animation checks.
- Scene IDs and slugs remain stable. Published scenes use the HTML renderer and are managed through the API.
- Storage uses a cross-process lock, atomic catalog replacement, and immutable content-addressed assets. Never reset corrupt storage to an empty catalog. Historical assets are retained until an explicitly authorized cleanup.
- Public pages read runtime storage dynamically; additions must not require a Next.js rebuild. Fonts and application assets stay bundled locally.

## Container deployment

- Docker enables `BUILD_STANDALONE=true`, runs as node, and stores scene data in `/app/data` on the `scene-data` named volume. Local storage defaults to `.scene-data`.
- Private environment files, scene data, scratch files and skills are excluded from the image build context. The API key is passed at runtime only.
- Compose reuses an existing external Traefik network without mounting the Docker socket or publishing host ports. Network, entrypoints and certificate resolver must already exist on the proxy.
- `SCENE_API_URL` is the client's target; `SITE_URL` is the public origin used by the app. The server and client must use the same key. Never send real credentials to a test server; tests must override both target and key.
- `SITE_URL` defaults from `TRAEFIK_DOMAIN`; changing the public origin requires a rebuild. API content updates do not.
- Validate without printing secrets: `docker compose config --quiet`. Deploy: `docker compose up -d --build`. Inspect health/logs with `docker compose ps` and `docker compose logs -f app`.
- Never delete the data volume, rotate production keys, or mutate public scene content as part of routine verification.
