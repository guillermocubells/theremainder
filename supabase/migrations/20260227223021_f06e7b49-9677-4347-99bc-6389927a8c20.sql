
-- =============================================
-- Reference table: default location types
-- =============================================
CREATE TABLE IF NOT EXISTS public.ref_location_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.ref_location_types (id, label, icon, description, display_order) VALUES
  ('indoor',     'Interior',     'home',        'Dentro de casa, oficina o espacio cerrado', 1),
  ('outdoor',    'Exterior',     'sun',         'Jardín, terraza o balcón al aire libre',     2),
  ('greenhouse', 'Invernadero',  'warehouse',   'Invernadero o estructura cubierta',          3),
  ('balcony',    'Balcón',       'columns',     'Balcón o terraza cubierta',                  4),
  ('patio',      'Patio',        'fence',       'Patio interior o exterior',                  5),
  ('windowsill', 'Alféizar',     'app-window',  'Junto a una ventana',                        6)
ON CONFLICT (id) DO NOTHING;

-- Public read access (reference data)
ALTER TABLE public.ref_location_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ref_location_types"
  ON public.ref_location_types FOR SELECT
  USING (true);

-- =============================================
-- Reference table: default tag categories
-- =============================================
CREATE TABLE IF NOT EXISTS public.ref_tag_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.ref_tag_categories (id, label, color, description, display_order) VALUES
  ('care',         'Cuidados',      '#22c55e', 'Etiquetas relacionadas con rutinas de cuidado',    1),
  ('origin',       'Origen',        '#3b82f6', 'Procedencia o fuente de la planta',                2),
  ('season',       'Temporada',     '#f59e0b', 'Etiquetas de estacionalidad',                      3),
  ('propagation',  'Propagación',   '#a855f7', 'Métodos de reproducción utilizados',               4),
  ('health',       'Salud',         '#ef4444', 'Estado de salud y tratamientos',                   5),
  ('collection',   'Colección',     '#06b6d4', 'Agrupaciones temáticas personales',                6),
  ('project',      'Proyecto',      '#ec4899', 'Proyectos de jardinería en curso',                 7),
  ('substrate',    'Sustrato',      '#78716c', 'Tipo de sustrato o mezcla utilizada',              8)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ref_tag_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ref_tag_categories"
  ON public.ref_tag_categories FOR SELECT
  USING (true);
