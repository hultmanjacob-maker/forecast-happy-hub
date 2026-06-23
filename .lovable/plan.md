
# Weekly Sales Forecast Tracker

A shared workspace (no login) for tracking weekly MRR forecasts per salesperson. Enable Lovable Cloud for shared persistence across users/devices.

## Core UI

- **Header**: App title, currency formatted DKK (kr.), current week badge (ISO week number + date range, e.g. "Week 25 · Jun 16–22, 2026").
- **Week navigator**: Prev / Next buttons + week picker. Automatically skips weeks 29, 30, 31 (industrial vacation) when navigating sequentially. Picker hides those weeks too. All weeks editable.
- **Salesperson tabs**: Horizontal tabs across the top listing salespeople. "+ Add salesperson" button on the right. Right-click / menu on a tab to rename or delete.
- **Forecast grid**: For the selected salesperson + week, render a card per configured block. Each card shows label and an input (number with kr. formatting, or multi-line text). Auto-saves on blur.
- **Block management**: "⚙ Manage fields" button opens a dialog to add/rename/delete/reorder blocks and set each block's type (Number or Text). Default seed matches the user's list:
  - Commit MRR (number)
  - Best case MRR (number)
  - Closed so far (number)
  - Expected MRR close this week (number)
  - Current onlines (number)
  - MRR Expected (number)
  - New onlines this week (number)
  - MRR Estimated pipeline value for this month (number)
  - Pipeline gap (number)
  - Biggest Risk in Pipe (text)
  - Help Needed (text)

## Data model (Lovable Cloud)

```text
salespeople(id, name, sort_order, created_at)
forecast_fields(id, label, field_type 'number'|'text', sort_order, created_at)
forecast_entries(id, salesperson_id, field_id, year, week, value_number, value_text, updated_at)
  UNIQUE(salesperson_id, field_id, year, week)
```

All tables publicly readable/writable (shared workspace, no auth) — anon GRANTs + permissive RLS policies. Realtime enabled so multiple users see updates live.

## Week logic

- ISO week + year as identity. Helper computes date range for display.
- `SKIP_WEEKS = [29, 30, 31]`. `nextWeek()` / `prevWeek()` skip over them.
- "Today's week" highlighted in picker; if today falls in 29–31, default selection lands on week 32 (or 28 going back).

## Design

Clean, productive dashboard feel — not generic SaaS purple. Dark sidebar-free layout, soft neutral background, accent in a confident teal/indigo for current week + active tab. Inter for body, slightly heavier display font for numbers (tabular-nums). Cards with subtle borders, no gradients. Empty states for "no salespeople yet" and "no fields configured".

## Tech notes

- Single route `/` (TanStack Start) — public, SSR-safe loader fetches initial data via a public server fn using the publishable client.
- Mutations via `createServerFn` (no auth middleware since shared) calling the publishable client; tables have permissive anon policies.
- TanStack Query for cache + realtime invalidation.
- date-fns for ISO week math.

## Out of scope

Login/per-user data, exports, charts, historical diff views. Can be added later.
