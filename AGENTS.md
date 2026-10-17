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
- For malformed JSON API tests, pass a `Buffer` as Playwright request `data`; a string with `Content-Type: application/json` may be serialized into a valid JSON string instead.
- Dependency audit: `pnpm audit`.
- Scene CLI: `pnpm scenes --help`; API reference and deployment instructions are in README.md.
- After removing routes, old `.next/dev/types` may reference deleted files. Briefly starting the development server regenerates them; do not weaken TypeScript checks to hide stale generated types.
- Stop temporary verification servers when finished unless the user explicitly requests a running preview.
- Scene visual QA must check moving-object clearances over the full animation cycle and inspect camera sweeps for coplanar flicker and transparent overlaps. Freeze time and camera for before/after comparisons; passing JavaScript, network, and interaction checks alone is insufficient.
- Prompt detail pages without a `compare` query need `加入对比` before an iframe mounts; gallery cards pass the representative scene in `compare`. Viewers probe scene documents with HEAD before GET; validate CSP on both, but read and compare the HTML body only for GET.

## Scene management and security

- Use `.devin/skills/manage-scenes/SKILL.md` and its client for content operations. Do not hardcode scene data into application source.
- `lib/scenes/model.ts` defines scene and prompt records; `lib/scenes/store.ts` reads the persistent catalog at request time. A fresh volume must start empty, without demo scenes.
- Prompts (题目) are first-class records: one prompt groups every scene generated from the same brief, and scenes reference them through `promptId`. `/prompts` shows the prompt × (model, agent) matrix and `/prompts/{slug}` runs same-prompt scenes side by side. Scene titles must not embed model or agent names; the UI renders them as badges.
- Prompts are unnumbered by default: leave `number` empty and keep titles and canonical body headings unnumbered unless explicitly requested otherwise. Preserve historical scene `prompt` snapshots during catalog-only formatting changes.
- New briefs may share base, interaction and art conventions, but must have a distinct primary shape, spatial organization or dynamic mechanism. Do not force every brief into a cutaway room with a generic furniture checklist; do not retroactively rewrite existing briefs unless requested.
- The main gallery groups linked implementations into one card per prompt before filtering and pagination. Unlinked scenes remain separate works. Model/agent filters must match the same run, and the representative cover must come from a matching run; all versions remain accessible on the prompt page.
- Public pages receive `SceneSummary`/`PromptSummary` (no prompt text, notes or parameters) to keep the gallery payload small; detail pages load full records.
- Gallery filters and paging use `history.pushState`/`replaceState` so browser back/forward restores state; keep that behaviour when changing navigation.
- Playwright wipes `test-results/` before every run; keep local preview data and scratch scripts in `.scene-work/` (gitignored and ESLint-ignored), never in `test-results/`.
- Known legacy demo overrides are retained in storage for compatibility but excluded from public and management reads. Do not erase existing volume data during upgrades or hide unrecognized corrupt records.
- `/admin` and `/api/preview` were removed. Do not restore a public editor or an anonymous write API.
- Management endpoints under `/api/v1/scenes` and `/api/v1/prompts` require `X-API-Key`. Missing or weak server configuration fails closed. PATCH and DELETE require the version ETag in `If-Match` and reject stale operations.
- Single-scene deletion uses `pnpm scenes delete <id> --version <version>` for a read-only preview and requires explicit confirmation before `--confirm`. Back up metadata, HTML and cover first. It removes only the selected scene record, preserving its prompt, other scenes and historical assets; the API accepts only an empty JSON object.
- Prompt deletion additionally requires the exact reviewed set of linked scene IDs and their versions. Back up metadata, HTML and covers, confirm the full scope, and use the skill's dry-run before deletion. The store removes prompt/scene records atomically but retains all historical asset files; never hardcode a hidden title in the frontend or clean up the data volume as a shortcut.
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
