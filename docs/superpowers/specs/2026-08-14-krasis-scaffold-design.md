# Krasis Scaffold Design

## Goal

Create a private GitHub repository named `Krasis` for a future palette generator and contrast checker. The first milestone is a clean, deployable web application scaffold rather than a product MVP.

## Decisions

- Framework: Nuxt 4 with Vue 3 and TypeScript.
- Server layer: Nitro, using its built-in h3 handlers when API routes are added.
- Package manager: pnpm.
- Production target: Cloudflare Workers using Nitro's `cloudflare_module` preset.
- Local edge preview: Wrangler.
- Repository: private `zidariuandrei/Krasis`.
- Deno is not part of the primary development or deployment workflow. Cloudflare Workers is the production runtime.

## Scope

The scaffold will include the generated Nuxt application, project metadata, Cloudflare/Nitro configuration, standard development and build scripts, a concise README, and the design document itself.

The scaffold will not include palette-generation algorithms, contrast calculations, authentication, persistence, database bindings, sharing, export, or custom visual design. Those features will be designed separately after the foundation is validated.

## Structure

- `app/`: Nuxt application entry point and future UI code.
- `public/`: static assets served by the application.
- `server/`: reserved for future Nitro API routes and server middleware.
- `shared/`: reserved for types and utilities shared by the browser and server.
- `nuxt.config.ts`: Nuxt and Nitro configuration.
- `wrangler.jsonc`: Cloudflare Worker configuration for local preview and deployment.
- `README.md`: project concept, prerequisites, commands, and deployment notes.
- `docs/superpowers/specs/`: design records.

## Runtime Flow

During development, Nuxt serves the application locally through its Vite development server. Wrangler will be used after a production build to exercise the generated Worker in a Cloudflare-compatible runtime.

In production, Cloudflare Workers receives the request and Nitro serves the Nuxt application and static assets. Future `server/api` handlers will run in the same Worker and can access Cloudflare bindings through Nitro's request context.

The initial application has no backend data flow; it only renders the generated Nuxt starter page.

## Error Handling

The scaffold will use Nuxt's default error handling and Cloudflare's standard Worker responses. No custom error pages, logging service, or retry policy is needed until application behavior exists.

## Verification

The initial repository must pass:

1. Dependency installation with `pnpm install`.
2. Nuxt type checking if provided by the generated project tooling.
3. A production build targeting the Cloudflare Workers preset.
4. A Wrangler local preview smoke test that serves the built application.

## Repository Setup

After verification, create `zidariuandrei/Krasis` as a private GitHub repository, make the initial commit on `main`, push the scaffold, and confirm the remote repository remains private.
