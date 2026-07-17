# Contributing to Slashosaurus

Thanks for your interest! Issues and pull requests are welcome.

## Bugs & ideas

Open an [issue](https://github.com/polygonhunter/slashosaurus/issues) — a short description, your Obsidian version, your theme (previews are theme-sensitive), and what you typed help a lot.

## Development setup

```bash
npm install
npm run dev     # watch build into test-vault/ (pjeby/hot-reload)
npm run test    # vitest over src/core
npm run build   # type-check + production bundle
```

Open `test-vault/` in Obsidian to try your changes live (the [hot-reload](https://github.com/pjeby/hot-reload) plugin picks up dev builds automatically). `Playground.md`, `Wrap-Tests.md`, and `Fussnoten.md` contain prepared scenarios.

## Ground rules

- Everything under `src/core/` stays pure (no `obsidian` imports) and unit-tested — catalog, trigger, ranking, insert/wrap logic changes need a test.
- The UI follows one principle: **radically clean**. The menu appears, delivers, disappears. If a change adds visible chrome, it probably needs rethinking.
- Only public Obsidian APIs, and only APIs available in Obsidian 1.12 (`@since` tags in `obsidian.d.ts` are the source of truth).
- Keep examples and fixtures fictional (no real names, vaults, or URLs).
