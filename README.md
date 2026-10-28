<div align="center">
  <img src="public/logo.png" alt="" width="120" />
  <h1>Displaai</h1>
  <p>Browse, map, tag and edit your Google Drive photos, right in the browser.</p>
  <p>
    <a href="https://melisa-abuin.github.io/displaai/"><strong>Visit the site &rarr;</strong></a>
  </p>
</div>

## Tech stack

- [React 19](https://react.dev/) — UI
- [TypeScript](https://www.typescriptlang.org/) — language
- [Vite](https://vite.dev/) — dev server and build tool
- [TanStack Query](https://tanstack.com/query) — data fetching and caching of Drive API calls
- [Google Drive API](https://developers.google.com/drive/api) + [Google Identity Services](https://developers.google.com/identity/oauth2/web) — photo storage and sign-in
- [React Virtuoso](https://virtuoso.dev/) — virtualized photo grid
- [Leaflet](https://leafletjs.com/) + [React Leaflet](https://react-leaflet.js.org/) — photo map
- [Supercluster](https://github.com/mapbox/supercluster) — map marker clustering
- [MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/guide) — on-device face and object detection
- [heic-to](https://github.com/hoppergee/heic-to) — HEIC image decoding
- CSS Modules — styling
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) — testing
- [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) — linting and formatting

## Privacy

There is no backend: the app talks straight to the Google Drive API from your browser. Tags are stored in each file's private Drive app properties, and face and object detection run on your device. Sign-in asks for full Drive access because the editor can rename photos and overwrite them with their edited version.

## Run locally

**Prerequisites:** Node 24 (see [.nvmrc](.nvmrc)) and [pnpm](https://pnpm.io/).

1. In [Google Cloud Console](https://console.cloud.google.com/), enable the **Google Drive API**.
2. Configure the **OAuth consent screen** and add yourself as a test user.
3. Create an **OAuth client ID** of type _Web application_ and add `http://localhost:5173` to **Authorized JavaScript origins**. No client secret is needed.
4. Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_CLIENT_ID`.
5. Install and start:

   ```sh
   pnpm install
   pnpm dev
   ```

## Deploy to GitHub Pages

[.github/workflows/static.yml](.github/workflows/static.yml) builds and publishes the app on every push to `main`. It also copies `index.html` to `404.html` so deep links work.

1. In **Settings → Pages**, set the source to **GitHub Actions**.
2. Add a repository variable `VITE_GOOGLE_CLIENT_ID` (**Settings → Secrets and variables → Actions → Variables**).
3. Add `https://<your-user>.github.io` to the OAuth client's **Authorized JavaScript origins**.

To try a Pages-style build locally:

```sh
# macOS / Linux
URL_BASE_PATH=/displaai/ pnpm build && pnpm preview
```

```powershell
# Windows (PowerShell)
$env:URL_BASE_PATH = '/displaai/'; pnpm build; pnpm preview
```

## Scripts

| Script           | Description                         |
| ---------------- | ----------------------------------- |
| `pnpm dev`       | Start the dev server                |
| `pnpm build`     | Type-check and build for production |
| `pnpm preview`   | Preview the production build        |
| `pnpm test`      | Run the tests                       |
| `pnpm typecheck` | Type-check the project              |
| `pnpm format`    | Format the code with Prettier       |

## License

[MIT](LICENSE) © Melisa Abuin

_Not affiliated with or endorsed by Google. Google Drive is a trademark of Google LLC._
