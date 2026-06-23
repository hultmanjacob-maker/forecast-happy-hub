
# Forecast Tracker — Visual Redesign

Keep all current functionality. Only the look, layout polish, and color-per-salesperson behavior change.

## Direction

**Emerald Prestige** palette — deep emerald canvas, antique-gold accents, cream surface. Confident, premium, not generic SaaS. **Syne** (display) + **Plus Jakarta Sans** (body) loaded via Google Fonts `<link>` in `__root.tsx`. Tabular-nums for all numeric inputs.

## Design tokens (`src/styles.css`)

Light mode primary surface — cream `#f5f0e0`-derived background, emerald primary `#064e3b`, accent gold `#c9a84c`, secondary emerald `#0d7a5f`. Adds:
- `--gradient-hero`: emerald → deeper emerald with gold glow
- `--shadow-elegant`: tinted emerald shadow for cards
- `--font-display: "Syne"`, `--font-sans: "Plus Jakarta Sans"`
- 8-color salesperson palette (emerald, gold, copper, sage, rust, plum, teal, ochre — all harmonize with Emerald Prestige)

## Salesperson colors (auto-assigned)

- New `color_index` integer column on `salespeople` (migration). Assigned at insert time as `(max(color_index) + 1) % 8`, so colors rotate evenly. Existing rows backfilled by row order.
- Frontend resolves `color_index → { bg, fg, ring, soft }` via a `SALES_COLORS` table.
- Used in:
  - **Tabs**: active tab uses the salesperson's full color; inactive shows a colored dot + soft tinted background.
  - **Avatar chip**: round initials badge in each tab and in the page header ("Forecasting for: [avatar] Anna Larsen").
  - **Card accents**: a thin colored top-border on each forecast card matches the active salesperson.

## Layout

Card-grid energy, but more presentable than the current flat grid:

- **Hero header band**: emerald gradient bar with cream serif title "Weekly Sales Forecast", subtle gold rule. Right side holds the week navigator on a cream pill with gold week-number badge.
- **Salesperson tab strip**: pill-shaped, colored, with a "+ Add" pill that matches the system. Active tab lifts with `shadow-elegant`.
- **Active salesperson banner**: just below tabs — large avatar + name + week range, plus a small "Manage fields" button on the right.
- **Forecast grid**: clean responsive card grid (1 / 2 / 3 cols). Each card:
  - Small icon (lucide) chosen per field-label heuristic (TrendingUp, Target, CheckCircle2, Zap, Users, BarChart3, UserPlus, Wallet, AlertTriangle, ShieldAlert, LifeBuoy) — fallback to a dot.
  - Field label in muted small caps.
  - Large value input (tabular-nums, gold focus ring).
  - For number fields: live DKK preview below input in gold.
  - Top edge: 3px bar in the active salesperson's color.
- **Empty states**: friendly, on-brand, with the gradient.
- Footer note about vacation weeks stays.

## Technical changes

1. **Migration**: add `color_index integer not null default 0` to `salespeople`; backfill existing rows by `created_at` order modulo 8.
2. **`src/styles.css`**: replace token values with Emerald Prestige OKLCH equivalents (light mode default), add gradients/shadows/font tokens, add `@theme inline` mapping for `--color-*`. Define `--sales-color-1..8` tokens.
3. **`src/routes/__root.tsx`**: add Google Fonts preconnect + Syne/Plus Jakarta `<link>` in `head()`. Set body font via Tailwind class on `<body>` (or root `font-sans`).
4. **`src/lib/sales-colors.ts`**: `SALES_COLORS` array + `getSalesColor(index)` helper returning Tailwind-safe style objects.
5. **`src/routes/index.tsx`**:
   - Read & write `color_index` on salespeople queries/inserts.
   - New `<HeroHeader>` with gradient + week navigator.
   - New `<SalesTab>` and `<ActiveSalesBanner>` components using the color helper.
   - Restyled `<FieldCard>` with icon mapping + colored top bar.
   - Replace generic borders with `shadow-elegant`, rounded-2xl, cream surface.
6. No new dependencies. Uses existing lucide-react and shadcn primitives.

## Out of scope

Functionality changes (no field changes, no auth, no charts, no realtime). Manual color override per salesperson — auto-assignment only, per your choice.
