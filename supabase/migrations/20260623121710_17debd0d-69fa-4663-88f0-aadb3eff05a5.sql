
ALTER TABLE public.salespeople ADD COLUMN color_index INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, ((row_number() OVER (ORDER BY created_at) - 1) % 8)::int AS ci
  FROM public.salespeople
)
UPDATE public.salespeople s SET color_index = r.ci FROM ranked r WHERE s.id = r.id;
