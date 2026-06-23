
CREATE TABLE public.forecast_rows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forecast_rows TO anon, authenticated;
GRANT ALL ON public.forecast_rows TO service_role;
ALTER TABLE public.forecast_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read rows" ON public.forecast_rows FOR SELECT USING (true);
CREATE POLICY "Public insert rows" ON public.forecast_rows FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update rows" ON public.forecast_rows FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete rows" ON public.forecast_rows FOR DELETE USING (true);

INSERT INTO public.forecast_rows (name, sort_order) VALUES
  ('Row 1', 10),
  ('Row 2', 20),
  ('Row 3', 30);

ALTER TABLE public.forecast_fields ADD COLUMN row_id uuid REFERENCES public.forecast_rows(id) ON DELETE SET NULL;

UPDATE public.forecast_fields SET row_id = (SELECT id FROM public.forecast_rows ORDER BY sort_order LIMIT 1) WHERE row_id IS NULL;
