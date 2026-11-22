# Agent Instructions

- Only run unit tests when explicitly requested by the user.

## Project structure

Code in `src/` is organised by feature:

- `features/<name>/` holds one feature: its components, hooks, CSS modules, tests and `constants.ts`. Current features: `editor`, `folders`, `gallery`, `lightbox`, `map`, `settings`, `sidebar`, `tags`, `views`. Create a new folder for a new feature instead of adding to an unrelated one.
- `ui/` holds generic, domain-agnostic components (`Button`, `Switch`, `Dropdown`, ...). Features may import from `ui/`, but `ui/` must not import from `features/`.
- `drive/` is the Google Drive data layer (API calls, React Query hooks, local library store), `auth/` handles sign-in, `vision/` is on-device detection, and `lib/` holds shared helpers (`format`, `photoSort`, `mediaKind`, `router`).
- Shared types live in `src/interfaces.ts`.
- Keep a component's `.module.css` and `.test.tsx` next to it.
- Split large components into smaller ones rather than growing one file.
- Once a feature has more than a few files, group them in `components/`, `hooks/` and `utils/` subfolders (see `features/sidebar/`, `features/editor/`, `features/map/`). The feature's entry component, its `.module.css`, its `.test.tsx` and `constants.ts` stay at the feature root; subfolders import them with `../`. A test sits next to the module it covers (`utils/edit.test.ts`). Small features of a few files stay flat. Domain-specific groups such as `features/editor/panels/` can sit beside these folders. Don't use `ui/` for these subfolders: `src/ui/` is reserved for generic components.

## Constants

- Put module-level constants (storage keys, URLs, limits, timings, option lists, SVG data, static presets) in the `constants.ts` of the feature or module that owns them, not at the top of component or logic files. Export them and import where used.
- If a constant is needed by several features, put it in the shared module (`ui/constants.ts`, `lib/constants.ts`, ...) instead of duplicating it.
- Name constants in `UPPER_SNAKE_CASE`, specific enough to be clear outside their original file (`VIEWS_STORAGE_KEY`, not `STORAGE_KEY`).
- Types used by a constants file belong in `src/interfaces.ts`, or in the constants file itself, so there are no circular imports.
- Identity-sensitive placeholders such as `EMPTY` or `NO_FILTERS` (stable references used with `useSyncExternalStore` or memoised values) stay next to the code that relies on them.

## Code style

- Don't write multi-statement inline functions in JSX props (`onChange={(x) => { ... }}`). Define a named function above the `return` and pass it, or call it in a one-liner (`onChange={(x) => toggle(value, x)}`). Short one-expression arrows are fine.
