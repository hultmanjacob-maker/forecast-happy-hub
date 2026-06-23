
CREATE TABLE public.salespeople (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salespeople TO anon, authenticated;
GRANT ALL ON public.salespeople TO service_role;
ALTER TABLE public.salespeople ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read salespeople" ON public.salespeople FOR SELECT USING (true);
CREATE POLICY "Public insert salespeople" ON public.salespeople FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update salespeople" ON public.salespeople FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete salespeople" ON public.salespeople FOR DELETE USING (true);

CREATE TABLE public.forecast_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('number','text')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forecast_fields TO anon, authenticated;
GRANT ALL ON public.forecast_fields TO service_role;
ALTER TABLE public.forecast_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fields" ON public.forecast_fields FOR SELECT USING (true);
CREATE POLICY "Public insert fields" ON public.forecast_fields FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update fields" ON public.forecast_fields FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete fields" ON public.forecast_fields FOR DELETE USING (true);

CREATE TABLE public.forecast_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salesperson_id UUID NOT NULL REFERENCES public.salespeople(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.forecast_fields(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  week INTEGER NOT NULL,
  value_number NUMERIC,
  value_text TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(salesperson_id, field_id, year, week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forecast_entries TO anon, authenticated;
GRANT ALL ON public.forecast_entries TO service_role;
ALTER TABLE public.forecast_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read entries" ON public.forecast_entries FOR SELECT USING (true);
CREATE POLICY "Public insert entries" ON public.forecast_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update entries" ON public.forecast_entries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete entries" ON public.forecast_entries FOR DELETE USING (true);

-- Seed default forecast fields
INSERT INTO public.forecast_fields (label, field_type, sort_order) VALUES
  ('Commit MRR', 'number', 10),
  ('Best case MRR', 'number', 20),
  ('Closed so far', 'number', 30),
  ('Expected MRR close this week', 'number', 40),
  ('Current onlines', 'number', 50),
  ('MRR Expected', 'number', 60),
  ('New onlines this week', 'number', 70),
  ('MRR Estimated pipeline value for this month', 'number', 80),
  ('Pipeline gap', 'number', 90),
  ('Biggest Risk in Pipe', 'text', 100),
  ('Help Needed', 'text', 110);
