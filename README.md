<p align="center">
  <img src="icons/slashosaurus.svg" alt="Slashosaurus" width="200">
</p>

<h1 align="center">Slashosaurus</h1>

<p align="center"><b>See the block before you insert it.</b></p>

Slashosaurus is a Notion-style slash menu for Obsidian. Type `/` and a small glass panel appears right at your cursor: headings shown in their real sizes, callouts as actual colored boxes with their icons, code and math with their look — every entry previews what it creates, in your theme's own colors. Keep typing to filter (`/wa` → Warning, `/h2` → Heading 2, `/tab` → Table), hit Enter, keep writing.

I built Slashosaurus because I could never remember callout syntax. Is it `[!warning]` or `[!warn]`? What was the folded variant again? Which types exist at all? A menu that only lists *names* doesn't fix that — I'd still have to know what "abstract" looks like. So the menu shows the boxes themselves. You pick the color you mean, not the word you half-remember.

Slashosaurus is the fourth plugin in the -osaurus family, next to [**Linkosaurus**](https://github.com/polygonhunter/linkosaurus), [**Scalosaurus**](https://github.com/polygonhunter/scalosaurus), and [**Searchosaurus**](https://github.com/polygonhunter/searchosaurus). If something feels off or you have an idea, [open an issue on GitHub](https://github.com/polygonhunter/slashosaurus/issues); I read everything.

## What it looks like

| You type | The menu shows |
|----------|----------------|
| `/` | Everything, grouped: Text · Callouts · Insert · Snippets |
| `/wa` | **Warning** — as an orange box with its icon, before you insert it |
| `/h2` | **Heading 2**, drawn in heading-2 size |
| `/tab` | **Table** — a tiny grid preview |
| `/tldr` | **Abstract** callout (aliases work too) |
| `/code` | **Code block** — Enter, then pick the language in the same popup |

## Highlights

- **Live previews** — callouts appear as real colored mini-boxes (all 13 types, folded variants included), headings in their sizes, quotes as quotes, code in monospace. Your theme's colors, light and dark.
- **Wraps your selection** — select a paragraph, type `/`, pick *Quote* or a callout: the text is wrapped, not replaced. Multi-line selections get proper prefixes, code selections land inside the fence.
- **Smart insert** — the typed `/query` vanishes without a trace and the cursor lands where writing continues: inside the callout body, in the first table cell, on the empty line of the code block.
- **Two-stage code block** — choose *Code block*, then pick from ~40 languages in the same popup. Esc inserts a plain fence.
- **Your own snippets** — add blocks in the settings (name + template, `{cursor}` marks the writing position) and they join the menu as their own group.
- **Radically clean** — a floating glass panel with a gliding selection pill. It appears, delivers, disappears. No toolbar, no chrome.

## The keyboard layer

| Key | Does |
|-----|------|
| `↵` | Insert the block |
| `⇧↵` | Insert a callout **folded** (`> [!note]-`) |
| `↑` / `↓` | Move the selection pill |
| `esc` | Dismiss (in the language picker: insert without a language) |
| just type | Fuzzy-filter the list |

## The catalog

Headings 1–3 · bulleted, numbered and to-do lists · quote · divider · **all 13 callout types** (note, abstract, info, todo, tip, success, question, warning, failure, danger, bug, example, quote — each also foldable) · code block with language picker · table · math block · Mermaid diagram · comment · internal link · embed · today's date · footnote (marker at the cursor, definition appended at the end) · plus every snippet you define — and, with the Daily Bible Verse plugin enabled, its verse commands (see [Integrations](#integrations)).

## Setup

Install, enable, type `/`. Two things worth knowing:

- **Obsidian's core "Slash commands" plugin** also opens a menu on `/`. Disable it under *Settings → Core plugins* — or give Slashosaurus a different trigger character in its settings; both menus side by side is chaos nobody needs.
- The trigger only fires at the start of a line or after a space, so URLs and file paths never open the menu.

## Integrations

- **[Daily Bible Verse](https://github.com/polygonhunter/daily-bible-verse)** — if the community plugin `daily-bible-verse` is installed and enabled, a *Daily Bible Verse* group appears at the bottom of the menu: **Bibelvers des Tages** (📖) inserts today's verse as a callout at the cursor, **Vers neu würfeln** (🎲) rerolls it. Both entries just run that plugin's own commands — Slashosaurus inserts nothing itself. Disable the plugin and the group vanishes without a trace.

## Privacy

Slashosaurus runs entirely offline. It makes zero network requests, collects nothing, and stores nothing outside your vault's plugin settings.

## Roadmap

- Recently-used blocks bubbling up when the query is empty
- Per-snippet icons and aliases
- More block types where a preview genuinely helps

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: `src/core/` stays pure and tested, the UI stays radically clean.

---

Inspired by the many slash-command plugins that came before it — built from scratch anyway, because the previews were the point.

MIT © [polygonhunter](https://github.com/polygonhunter)
