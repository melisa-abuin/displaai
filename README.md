# drive-photos-displayer

## Stack

- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- CSS Modules
- [Prettier](https://prettier.io/)
- [Vitest](https://vitest.dev/) + Testing Library
- [ESLint](https://eslint.org/)

## Features

- Google OAuth sign-in (Google Identity Services, read-only Drive scope)
- Left sidebar listing your Drive folders ("All photos" + one entry per folder)
- Thumbnail grid with pagination and a full-size lightbox

## Google OAuth setup

1. In [Google Cloud Console](https://console.cloud.google.com/) enable the **Google Drive API**.
2. Create an **OAuth client ID** of type _Web application_ and add `http://localhost:5173` to **Authorized JavaScript origins**.
3. Configure the OAuth consent screen (add yourself as a test user).
4. Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_CLIENT_ID`.

The access token is kept in `sessionStorage` only; no client secret is needed.

## Getting started

```sh
pnpm install
pnpm dev
```

## Deploying to GitHub Pages

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds with `URL_BASE_PATH=/<repo>/` and publishes on every push to `main`. The built `index.html` is also copied to `404.html` so deep links work (SPA fallback).

1. In **Settings ? Pages**, set the source to **GitHub Actions**.
2. Add a repository variable `VITE_GOOGLE_CLIENT_ID` (Settings ? Secrets and variables ? Actions ? Variables).
3. Add `https://melisa-abuin.github.io` to the OAuth client's **Authorized JavaScript origins**.

To test a Pages-style build locally: `URL_BASE_PATH=/drive-photos-displayer/ pnpm build && pnpm preview`.

## Scripts

| Script              | Description                         |
| ------------------- | ----------------------------------- |
| `pnpm dev`          | Start the Vite dev server           |
| `pnpm build`        | Type-check and build for production |
| `pnpm preview`      | Preview the production build        |
| `pnpm lint`         | Lint the codebase with ESLint       |
| `pnpm lint:fix`     | Lint and auto-fix issues            |
| `pnpm format`       | Format the codebase with Prettier   |
| `pnpm format:check` | Check formatting without writing    |
| `pnpm test`         | Run tests with Vitest               |
| `pnpm test:ui`      | Run tests with the Vitest UI        |
| `pnpm typecheck`    | Type-check the project              |
