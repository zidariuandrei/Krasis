# Krasis

Krasis is a palette generator and contrast checker for designers.

The name refers to the essence of visual design: the relationship between color, contrast, and composition.

## Stack

- Nuxt 4
- Vue 3
- TypeScript
- Nitro/h3
- pnpm
- Cloudflare Workers
- Wrangler

## Prerequisites

- Node.js 22 or newer
- pnpm 10 or newer
- A Cloudflare account for deployment

## Development

Install dependencies and start the Nuxt development server:

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Verification

Run the type checker and production build:

```bash
pnpm typecheck
pnpm build
```

To preview the built application using the Cloudflare Workers runtime locally:

```bash
pnpm cloudflare:dev
```

## Deployment

The Nitro preset targets Cloudflare Workers. Authenticate Wrangler first, then deploy:

```bash
pnpm exec wrangler login
pnpm cloudflare:deploy
```

The application is intentionally only scaffolded at this stage. Palette generation, contrast calculations, saved palettes, sharing, and export will be added in later iterations.

## Documentation

- [Nuxt](https://nuxt.com/docs)
- [Nitro Cloudflare deployment](https://nitro.build/deploy/providers/cloudflare)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
