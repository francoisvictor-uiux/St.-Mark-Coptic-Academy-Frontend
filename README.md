# St. Mark Coptic Academy — Landing Page

Bilingual (Arabic RTL default / English LTR) conversion-focused landing page for
St. Mark Coptic Academy, implemented from the Figma "Final Design" page
(`Website-Design` file, node `72:3606`).

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — design tokens declared in `src/app/globals.css` `@theme`
- **next-intl** — `/ar` (default, RTL) and `/en` locales; copy lives in `src/messages/*.json`
- **GSAP + @gsap/react + ScrollTrigger** — scroll reveals, hero choreography, header behavior, count-up stats, accordions

## Run

```bash
npm install
npm run dev    # http://localhost:3000 → redirects to /ar
npm run build && npm start
```

## Design system (from Figma)

- **Colors**: five ramps in `globals.css` — `creamy` (page bg `creamy-100 #fef6f0`), `brown`
  (primary `brown-500 #562823`), `red` (accent `red-500 #dd6e6e`), `blue`, `ink`.
  Semantic aliases: `surface`, `card`, `line`, `muted`.
- **Type**: Thmanyah Serif Text (all running text — `font-serif`), Thmanyah Serif Display
  (`font-display`, EN headlines), Thmanyah Sans (`font-sans`), AMoshref Thulth
  (`font-thulth`, Arabic hero calligraphy only), Archivo Light (`font-archivo`, stat numerals).
- **Radii**: `rounded-card` (40px) for cards/images, `rounded-map` (32px), pills `rounded-full`.
- **Signature motif**: inverted-corner notch + red cross medallion (see `Vision.tsx`);
  Coptic cross emblem is `src/components/ui/CopticCross.tsx` (currentColor).
- **No shadows** — depth comes from color blocks and hairline `line` borders.

## Page structure (`src/app/[locale]/page.tsx`)

Header (sticky, hides on scroll down) → Hero → Partners marquee → Vision + stats →
Programs → Theses band (dark) → Features accordion → Articles → Testimonials marquee →
Events (filterable) → Admission form → FAQ (searchable) → Footer.

Secondary routes: `/login`, `/register` (UI shells), and `ComingSoon` stubs for
`/programs`, `/theses`, `/articles`, `/events`, `/privacy`, `/terms` — placeholders for
the full LMS/CMS platform pages (faceted search, filters) described in
`4.IA/St_Mark_Academy_Master_Blueprint.md`.

## CMS-readiness

All card collections (programs, theses, articles, events, testimonials, FAQ, stats)
live as structured arrays in `src/messages/{ar,en}.json`, shaped like future CMS models —
swap `useMessages()` reads for CMS fetches without touching markup. The admission form
POSTs to `src/app/api/apply/route.ts` (stub with honeypot + validation); replace the
`console.log` with a database insert or email service.

## Accessibility

WCAG-minded throughout: semantic landmarks, one `h1`, labelled forms with inline
`role="alert"` errors and `aria-invalid`, accordion `aria-expanded`/`aria-controls`,
keyboard-visible focus rings, `prefers-reduced-motion` disables GSAP animation and
marquees (via `gsap.matchMedia` + CSS media queries), RTL/LTR handled with logical
properties and directional icon flips.
