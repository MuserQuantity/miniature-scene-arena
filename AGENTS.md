# Project guide

- Use Node.js 22.18 or newer and pnpm 10.9.0.
- Stack: Next.js App Router, React, TypeScript, Tailwind CSS, Base UI, and React Three Fiber.
- Preserve the Chinese interface and existing dark visual style.

## Commands

- Install: `pnpm install --frozen-lockfile`.
- Develop: `pnpm dev`; pass `--port 3001` if the default port is occupied.
- Check: `pnpm check` runs ESLint, route type generation, TypeScript, and unit tests.
- Build: `pnpm build`.
- Browser tests: install Chromium with `pnpm exec playwright install chromium`, then run `pnpm build && pnpm test:e2e`. Tests start a production server on port 3100 and use software WebGL.
- Dependency audit: `pnpm audit`.

## Application boundaries

- Published scenes live in `lib/scenes/catalog.ts`; Three.js renderers live in `components/scenes/` and load client-side.
- `/admin` is a public local-file workbench, not an authenticated backend. Draft edits do not update the gallery or persist after closing the page; users must export JSON files.
- `/api/preview` only returns temporary sandboxed HTML. Preserve its CSP, opaque-origin iframe, no-store headers, and byte limits. Do not enable external network access or same-origin permissions for imported HTML.
- Fonts and scene images are bundled locally; builds must not require Google Fonts downloads.
- Set `SITE_URL` to the deployment origin before a production build for correct social metadata. It defaults to `http://localhost:3000` locally.

## Container deployment

- The Dockerfile enables `BUILD_STANDALONE=true` for a minimal, non-root production image. Normal `pnpm build` and `pnpm start` retain their existing behavior.
- On a new server, copy `.env.example` to `.env` without overwriting existing settings. Real `.env` files are ignored by Git and excluded from the Docker build context.
- Compose deploys only the application and joins an existing external Traefik network. It does not start Traefik, publish host ports, or mount the Docker socket.
- Set `TRAEFIK_DOMAIN` to the hostname without a scheme. `SITE_URL` derives from it by default and is passed to both the image build and runtime; rebuild the image after changing the public origin.
- `TRAEFIK_NETWORK`, `TRAEFIK_ENTRYPOINTS`, and `TRAEFIK_CERT_RESOLVER` must match the existing Traefik setup. The network and certificate resolver must already be configured on the proxy.
- `TRAEFIK_ROUTER_NAME` names both the router and service and must be unique on the shared proxy. `TRAEFIK_MIDDLEWARES` accepts a comma-separated list such as `security@file,auth@docker`, or can be empty.
- For plain HTTP, set `TRAEFIK_TLS=false`, use the HTTP entrypoint, clear `TRAEFIK_CERT_RESOLVER`, and set `SITE_URL` to an `http://` origin. HTTP-to-HTTPS redirects remain the responsibility of the existing proxy.
- Validate: `docker compose config --quiet`. Deploy or update: `docker compose up -d --build`. Check health and logs: `docker compose ps` and `docker compose logs -f app`.
