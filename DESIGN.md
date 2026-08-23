---
name: biopelayo.github.io v2 lite
description: Dual-theme single-page scientist CV opened by a live nucleosome canvas.
colors:
  bg: "#0f1520"
  surface: "rgba(19, 27, 41, 0.86)"
  surface-solid: "#151d2b"
  text: "#e4e8ee"
  muted: "#9aa8bc"
  dim: "#7286a1"
  accent: "#34d96e"
  accent-strong: "#6ee7a0"
  accent-soft: "rgba(52, 217, 110, 0.12)"
  accent-contrast: "#0f1520"
  line: "rgba(255, 255, 255, 0.10)"
  sidenav-bg: "rgba(13, 18, 28, 0.94)"
  sidenav-bg-mobile: "#0d121c"
  light-bg: "#F2F6F3"
  light-bg-alt: "#E7F0EA"
  light-text: "#26302B"
  light-muted: "#4E5B54"
  light-dim: "#5C6B63"
  light-accent: "#2D6A4F"
  light-accent-strong: "#1E7A52"
  light-accent-soft: "rgba(45, 106, 79, 0.13)"
  light-line: "#D3E2D8"
  light-green-mid: "#52B788"
  light-green-deep: "#1B4332"
  canvas-h2a: "#34d96e"
  canvas-h2b: "#22d3ee"
  canvas-h3: "#5eaaff"
  canvas-h4: "#f472b6"
  canvas-dna: "#64aaff"
typography:
  display:
    fontFamily: "Bebas Neue, Oswald, sans-serif"
    fontSize: "clamp(3.4rem, 9vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "1px"
  headline:
    fontFamily: "Bebas Neue, Oswald, sans-serif"
    fontSize: "clamp(2.4rem, 4.5vw, 3.2rem)"
    fontWeight: 400
    letterSpacing: "1px"
  title:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "1.22rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.7
  mono:
    fontFamily: "JetBrains Mono, Cascadia Code, monospace"
    fontSize: "0.82rem"
    fontWeight: 400
rounded:
  pill: "999px"
  circle: "50%"
  panel: "14px"
  card: "12px"
  row: "10px"
  navlink: "8px"
  focus: "4px"
spacing:
  sidenav-w: "292px"
  content-max: "880px"
  section-pad-y: "clamp(48px, 7vh, 80px)"
  section-pad-x: "clamp(20px, 5vw, 56px)"
  gap-block: "22px"
  gap-grid: "14px"
  gap-chip: "9px"
components:
  button-solid:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-contrast}"
    rounded: "{rounded.pill}"
    padding: "11px 22px"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "11px 22px"
  chip:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  repo-card:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "15px 16px"
  resume-item:
    rounded: "{rounded.row}"
    padding: "18px 16px"
  sidenav-link:
    rounded: "{rounded.navlink}"
    padding: "9px 13px"
  section-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
---

# Design System: biopelayo.github.io (v2 lite)

Recorded from the built code on branch v2-lite (`index.html`, `css/styles.css`, `js/main.js`, `js/i18n-es.js`, `js/nucleosome-bg.js`). Where this file and the code disagree, the code has drifted and this file needs a refresh. Product truth (content, audience, brand commitments) lives in `PRODUCT.md`; this file is strictly visual.

## Overview

**Creative North Star: "His Chromatin, Alive"** (from the direction contract in the first comment of `<body>` in `index.html`: a scientist's CV you can scan in one minute, opened by the one thing no other CV has).

One system, two moods. Dark (the default): a deep-space blue ground where the nucleosome particle canvas runs behind the whole page and content floats above it in translucent panels; a single green accent does all the signaling. Light: the Pelamovic paper world (greenish white ground, Botanical Green rail and accents, flat full-bleed sections) with the canvas caged inside a hero that stays dark in both themes.

The entire theme lives in CSS custom properties: dark values on `:root`, light values as a wholesale override under `[data-theme="light"]` using the same property names. Components only ever read tokens, so the flip is one attribute on `<html>`, set before first paint by an inline script.

**Key Characteristics:**
- One dominant green accent per theme; the histone neons exist only inside the canvas.
- Fixed 292px side rail, single 880px content column, flat scannable CV rows.
- Bebas Neue display, Work Sans body at 18px, JetBrains Mono strictly for data.
- Hairline separation (`--line`), few shadows, small lift hovers on one easing (`--ease-out`).
- Full collapse under `prefers-reduced-motion`, canvas included.
- English in the HTML; Spanish applied client-side via a `data-i18n` dictionary.

## Colors

One green voice per theme over quiet neutrals; every other saturated color is locked inside the canvas.

### Primary
- **Signal Green** (`--accent`, #34d96e, dark theme): the only UI accent. Section-title bars, links, chip and repo-name text, solid button fill, contact icons, caret, selection. It is the same green as the canvas H2A histone, so UI and chromatin agree.
- **Mint Lift** (`--accent-strong`, #6ee7a0, dark theme): the brightened hover/focus step. Link underline and hover color, `.btn-line:hover`, `.stack-ico:hover`, `:focus-visible` outline.
- **Green Wash** (`--accent-soft`, rgba(52, 217, 110, 0.12)): row hover wash (`.resume-item:hover`) and chip ground.
- **Botanical Green** (`--accent`, #2D6A4F, light theme): same duties through the same token name; `--accent-strong` #1E7A52, `--accent-soft` rgba(45, 106, 79, 0.13). Text on accent flips to white (`--accent-contrast`).
- **Pelamovic Mid Green** (#52B788, literal, light theme only): used where the accent must read on the dark hero ground: `.hero-name-b`, `.hero-typing`, `.btn-solid`. A sanctioned literal, not a token.
- **Forest Ink** (#1B4332, literal, light theme only): dark green ink on green or pale-green surfaces: `.chip` text, active `.lang-btn` text; also the deepest stop of the light sidenav gradient.

### Neutral
- Dark set: ground `--bg` #0f1520; panel `--surface` rgba(19, 27, 41, 0.86) (translucent so the canvas glows through); `--surface-solid` #151d2b; text `--text` #e4e8ee; secondary `--muted` #9aa8bc; data/tertiary `--dim` #7286a1; hairline `--line` rgba(255, 255, 255, 0.10); rail `--sidenav-bg` rgba(13, 18, 28, 0.94) with opaque mobile variant `--sidenav-bg-mobile` #0d121c.
- Light set: greenish paper `--bg` #F2F6F3 (the direction contract said white ground; the build landed on greenish paper, with pure white reserved for `--surface` cards and `--logo-plate`); alternating band `--bg-alt` #E7F0EA (light-only token); ink `--text` #26302B; `--muted` #4E5B54; `--dim` #5C6B63; hairline `--line` #D3E2D8; rail `--sidenav-bg` becomes `linear-gradient(180deg, #2f7154 0%, #2D6A4F 55%, #1B4332 100%)` with white text tokens.

### Canvas neons (reserved)
Defined as rgb() triplets in `js/nucleosome-bg.js`: H2A green #34d96e, H2B cyan #22d3ee, H3 blue #5eaaff, H4 pink #f472b6, DNA soft blue #64aaff. They appear nowhere else.

### Named Rules
**The One Green Rule.** Each theme has exactly one accent, `--accent`. Cyan, blue and pink belong to the canvas; UI chrome never borrows them.
**The Hero Stays Dark Rule.** `--hero-text` (#e4e8ee) and `--hero-muted` keep light-on-dark values in both themes, and `[data-theme="light"] .hero` paints `linear-gradient(135deg, #0f1520 0%, #111d30 45%, #14231f 100%)`, so the canvas always sits on deep blue.

## Typography

**Display Font:** Bebas Neue (fallback Oswald), single weight 400.
**Body Font:** Work Sans (fallback system-ui); weights 300 to 700 loaded, 400/500/600/700 used.
**Mono Font:** JetBrains Mono (fallback Cascadia Code), 400/500, for data only.
Loaded from Google Fonts with preconnect and `display=swap`.

**Character:** a condensed all-caps display voice over a plain, readable body; the mono face flags anything machine-flavored (dates, DOIs, repo names, counts).

### Hierarchy
- **Display** (`.hero-name`): 400, clamp(3.4rem, 9vw, 6rem), line-height 0.98, letter-spacing 1px. Two-line name; line b (`.hero-name-b`) in accent (light theme: #52B788).
- **Headline** (`.section-title`): 400, clamp(2.4rem, 4.5vw, 3.2rem), 1px tracking, with a 52x4px accent bar (`::after`, 2px radius). Sub-variant `.section-title--sub`: clamp(1.8rem, 3.2vw, 2.2rem).
- **Title** (`.resume-main h3`): 600, 1.22rem, line-height 1.4. Flagship titles (`.flagship-body h3`): 700, 1.45rem. Project titles (`.project-list h3`): 600, 1.1rem.
- **Body**: 400, 18px, line-height 1.7. Prose width is capped by `section p { max-width: 68ch }` (62ch for `.section-sub`).
- **Data** (`.resume-when` 0.82rem, `.repo-name` 0.92rem/500, `.repo-meta` 0.76rem, `.mono` 0.92em, `.lang-btn` 0.78rem, `.footer` 0.78rem): JetBrains Mono, with `font-variant-numeric: tabular-nums` on date and meta columns.

### Named Rules
**The Mono Is Data Rule.** Dates, DOIs, repo names, star counts, the language toggle and the footer line are mono; prose and headings never are.
**The One Weight Display Rule.** Bebas Neue only at 400 and only for `.hero-name`, `.section-title` (and `--sub`) and `.topbar-brand`; never for body copy.

## Layout

- Fixed left rail: `.sidenav`, width `--sidenav-w` (292px), full height, its own scroll, 1px `--line` right border. Content compensates with `main { margin-left: var(--sidenav-w) }`.
- One column: `.section-inner` max-width 880px, padding `clamp(48px, 7vh, 80px)` vertical and `clamp(20px, 5vw, 56px)` horizontal. `.hero-inner` max-width 820px.
- Two ground strategies, theme-owned:
  - Dark: each `.section` is a floating panel (translucent `--surface`, 1px `--line` border, `--radius` 14px, margins `26px clamp(14px, 3vw, 40px)`); the fixed canvas shows in the gutters between panels.
  - Light: `[data-theme="light"] .section` flattens to full bleed (margin 0, no border, no radius) on `--bg`, and `[data-theme="light"] .section:nth-of-type(odd)` takes `--bg-alt` for alternating pale-green bands.
- Canvas plumbing: `#nucleosome-canvas` is `position: fixed`, full viewport, `z-index: 0`, under `main` (`z-index: 1`). `[data-theme="light"] #nucleosome-canvas` switches to `position: absolute; height: 100%`, caged by the hero's `position: relative` and `overflow: hidden`.
- Hero: `min-height: 100vh` (and `100svh`), flex-centered, no panel chrome in either theme.
- Grids: `.project-list` and `.repos-grid` are 2-column; `.contact-list` is `repeat(auto-fit, minmax(240px, 1fr))`. All collapse to one column under 992px.
- Mobile (max-width: 991px): the rail becomes an off-canvas drawer (`translateX(-100%)`, width `min(320px, 84vw)`) on the opaque `--sidenav-bg-mobile`, never the translucent desktop background. A CSS-only checkbox (`#nav-toggle`) drives it from the fixed `.topbar` (brand + hamburger label whose three spans become an X). `main` drops its margin and gains 50px top padding; `.resume-item` stacks with the date on top (`order: -1`). At 480px, hero buttons go full width.
- Anchor comfort: `scroll-padding-top` 24px desktop, 70px mobile; smooth scrolling via CSS plus `scrollIntoView` in `js/main.js` (which also closes the drawer).

### Named Rules
**The Panel or Paper Rule.** Panel chrome (surface, border, radius, margins) exists only in dark; band alternation (`nth-of-type(odd)`) exists only in light. A new block inherits both automatically by using the `section.section > .section-inner > .section-title` skeleton.

## Elevation & Depth

The system is flat and hairline-drawn: separation between rows, cards and rails is a 1px `--line` border (usually `border-top`), never a shadow. Depth appears in exactly three places, plus the glow of the canvas through translucent dark surfaces:

### Shadow Vocabulary
- **Portrait** (`.sidenav-photo`): `box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28)`.
- **Accent glow** (`.btn-solid`): `0 6px 20px rgba(52, 217, 110, 0.25)`, deepening to `0 10px 26px rgba(52, 217, 110, 0.35)` on hover; light theme uses `rgba(82, 183, 136, 0.35)`.
- **Drawer** (open mobile sidenav): `24px 0 60px rgba(0, 0, 0, 0.35)`.

A `--shadow` token is defined in both themes (dark `0 8px 28px rgba(0, 0, 0, 0.45)`, light `0 8px 24px rgba(27, 67, 50, 0.16)`) but no rule consumes it today; the shadows above are hard-coded per component.

## Shapes

- Pills for actions and toggles: `.btn`, `.chip`, `.lang-switch` at 999px.
- Circles for identity and single-icon controls: `.sidenav-photo`, `.theme-btn` at 50%.
- Soft rectangles grade down with size: panels 14px (`--radius`), cards and logo plates 12px, hover rows 10px, nav links 8px, focus ring 4px, scrollbar thumb 5px.
- Light-theme sections are square and full bleed (radius 0).
- Icons are stroke-drawn: an inline `<symbol>` sprite in `index.html`, 24 viewBox, 1.5px stroke, `currentColor`, round caps and joins; brand glyphs (GitHub, ORCID, X) are filled paths in the same sprite. Sizes in use: 14px (`.mini-link`), 16px (`.btn-ico`), 17px (social, contact, theme), 18px (`.h3-ico`).

## Components

Interaction grammar, shared by everything below: one easing token `--ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`); micro transitions 0.2 to 0.3s; hover feedback is a small lift plus a move toward accent (translateY(-2px) on buttons, cards and social icons, -3px on stack icons, `scale(1.04)` on the portrait, `rotate(15deg)` on the theme button). `prefers-reduced-motion` collapses all transitions and animations to 0.01ms, forces `.fade-in` visible, swaps the typing line for a static line, and skips the canvas entirely.

### Navigation
- `.sidenav`: identity block (118px circular photo with 3px rgba(255, 255, 255, 0.22) border, name at 600, role line in `--sidenav-muted`), link list, controls, social row. Links are 500 at 1.04rem, padding 9px 13px, radius 8px; hover and `.active` take `--sidenav-link-active` on `--sidenav-link-active-bg`. The active state is driven from `js/main.js` by an IntersectionObserver with `rootMargin: '-30% 0px -60% 0px'`.
- In light theme the rail flips to the green gradient with white link tokens: the one surface where Botanical Green is the ground rather than the accent.
- `.topbar` appears only under 992px (see Layout).

### Buttons
- **Shape:** pill (999px), padding 11px 22px, 600 at 0.95rem, inline-flex with 8px gap for a leading 16px icon.
- **Primary** (`.btn-solid`): `--accent` fill, `--accent-contrast` text, accent glow shadow. Light theme override: #52B788 fill, #0f1520 text.
- **Ghost** (`.btn-line`): 1px rgba(228, 232, 238, 0.35) border, `--hero-text`; hover moves border and text to `--accent-strong`.
- **Hover:** both lift -2px; the solid deepens its glow.

### In-content links
`p a`, `.link-row a`, `.section-foot a`, `.contact-list a` share the animated underline: a `background-image` gradient in `--accent-strong`, `background-size` growing 0% to 100% at 2px height over 0.25s `--ease-out`; hover also recolors the text.

### Resume rows (`.resume-item`)
The flat CV unit: flex row with content left and a mono date right (`.resume-when`: `--dim`, tabular-nums, nowrap). Padding 18px 16px with `margin: 0 -16px` so the 10px-radius `--accent-soft` hover wash overhangs the text column. Siblings separate with `border-top: 1px solid var(--line)`. `.resume-where` is the 0.93rem muted institution line.

### Flagships (`.flagship`)
Featured project rows: 96px logo on `--logo-plate` white (12px radius, 8px padding, 1px `--line` border) beside a 700-weight title and description, then a `.link-row` of outbound links. Rows separate by border-top; they are not cards.

### Chips and project list
`.chip`: pill on `--accent-soft` with `--accent` text (light theme: #1B4332 text), 0.92rem at 500, 9px gaps. `.project-list`: two columns with 36px column gap, border-top rows, muted 0.97rem descriptions.

### Repo cards (`.repo-card`)
The only card grid: 1px `--line` border, 12px radius, transparent ground in dark and `--surface` white in light. Name in mono `--accent`, description 0.88rem `--muted` with `min-height: 2.6em` for row alignment, meta line in mono `--dim` (language, star count, tabular-nums). Hover: border to `--accent`, lift -2px. Populated live from the GitHub API (top 4 own repos by stars then push date) with a hard-coded 4-repo fallback in `js/main.js`.

### Signature: nucleosome canvas (`#nucleosome-canvas` + `js/nucleosome-bg.js`)
The brand opener, ported verbatim from the v1 site and pinned by the owner. Four layers: drifting DNA double helices with base-pair rungs; 150 to 600 nucleosome discs (about 12% large octamers with radial-gradient bodies, DNA wrap rings, wiggling histone tails and white PTM dots); 200 to 800 dust motes; 6 to 18 faint icon silhouettes (nucleosome, flask, helix, leaf, terminal, bracket). All in the histone palette at alphas 0.015 to 0.18, mouse-repelled inside a 180px radius. The stylesheet controls only its position and caging per theme; the drawing code is not restyled, retuned or refactored.

### Signature: typing line (`.hero-typing`)
Accent-colored rotating role line under the name: type 70ms/char, delete 35ms/char, hold 2200ms, 400ms between phrases; 2px block cursor blinking at 1.05s `steps(1)`. Phrases are localized in `js/main.js`; reduced motion gets a static line.

### Signature: stack icon row (`.hero-stack`)
Monochrome technology row: 32px `.stack-ico` spans colored by plain `background-color` (`--hero-muted`) revealed through a CSS mask (`mask: var(--icon) center / contain no-repeat`). The SVGs in `img/icons/` (simple-icons files: python, r, gnubash, docker, linux, git, anthropic) act as silhouettes and never render in brand colors. Hover: `--accent-strong` plus -3px lift. A new technology is a new modifier: `.stack-ico--x { --icon: url('../img/icons/x.svg'); }`.

### Scroll reveal
`js/main.js` applies `.fade-in` (opacity 0, translateY(24px), 0.7s `--ease-out`) only to `.hero-inner` and each `.section-title`, revealed once by an IntersectionObserver (threshold 0.15, `rootMargin: '0px 0px -30px 0px'`) and then unobserved. Body content never animates in.

### Browser surfaces
The chrome the page does not draw still carries the theme: `::selection` (accent on `--accent-contrast`), `caret-color: var(--accent)`, thin scrollbar with `--dim` thumb and `--accent` hover (both `scrollbar-width`/`scrollbar-color` and `::-webkit-scrollbar`), `:focus-visible` as a 2px `--accent-strong` outline with 2px offset and 4px radius, and the `.skip-link` on accent revealed at focus.

### Language and theme controls (i18n mechanism)
- English is the base content, written in the HTML. Spanish is a flat dictionary (`window.I18N_ES` in `js/i18n-es.js`) keyed by `data-i18n` (swapped via textContent) and `data-i18n-html` (via innerHTML, for entries containing markup). `applyLang()` in `js/main.js` caches the English originals in a Map before the first swap, so EN restores without a reload; keys missing from the dictionary silently keep English.
- `.lang-switch`: mono pill pair with `aria-pressed`; the active side fills with `--accent` (light theme: rgba(255, 255, 255, 0.9) with #1B4332 text, since it sits on the green rail). `.theme-btn`: 34px circle swapping sun/moon sprite symbols through `[data-theme]` display rules.
- Both preferences persist in localStorage (`pela-theme`, `pela-lang`) and are re-applied by the inline script in `<head>` before first paint, so there is no flash. Theme is the `data-theme` attribute on `<html>`; language is its `lang` attribute.

## Do's and Don'ts

### Do:
- **Do** route every color through the token pair: define on `:root`, override under `[data-theme="light"]`, same property name, then read only the token.
- **Do** build new page blocks as `<section id="..." class="section"><div class="section-inner"><h2 class="section-title">`: panel chrome (dark), band alternation (light), nav highlighting and title fade-in all key off that skeleton. Mind that light banding is `nth-of-type(odd)`: inserting a section flips the bands of everything after it.
- **Do** set every date, DOI, repo name and count in JetBrains Mono, with tabular-nums where figures align in columns.
- **Do** pair every new `data-i18n`/`data-i18n-html` element with a key in `window.I18N_ES`; untranslated keys fall back to English by design.
- **Do** draw new icons as 1.5px-stroke `currentColor` symbols in the inline sprite, and new stack icons as monochrome SVG masks in `img/icons/`.
- **Do** keep hover feedback inside the grammar: accent shift plus a small lift at 0.2s `--ease-out`, and give every new motion its `prefers-reduced-motion` collapse.

### Don't:
- **Don't** introduce a second accent, and never use the canvas neons (#22d3ee, #5eaaff, #f472b6, #64aaff) in UI chrome.
- **Don't** modify `js/nucleosome-bg.js` beyond what `css/styles.css` already controls (position, caging): it is the pinned verbatim v1 port.
- **Don't** give light-theme sections borders, radius or panel surfaces, and don't strip them from dark-theme sections.
- **Don't** hard-code colors where a token exists; the only sanctioned literals are the light-theme dark-hero set (#52B788 and the hero gradient stops #0f1520/#111d30/#14231f) and Forest Ink #1B4332.
- **Don't** animate body content on scroll; the reveal set is `.hero-inner` plus `.section-title`, nothing else.
- **Don't** use Bebas Neue below headline scale, at weights other than 400, or for prose.
