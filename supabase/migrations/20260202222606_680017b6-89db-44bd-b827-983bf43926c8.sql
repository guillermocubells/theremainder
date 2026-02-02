-- Enums for plant status and observation condition
CREATE TYPE public.plant_status AS ENUM ('alive', 'dormant', 'sick', 'removed');
CREATE TYPE public.observation_condition AS ENUM ('healthy', 'okay', 'concern', 'critical');

-- User-defined locations table
CREATE TABLE public.plant_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Owned plants collection
CREATE TABLE public.owned_plants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nickname TEXT NOT NULL,
  scientific_name TEXT,
  common_name TEXT,
  photos TEXT[] DEFAULT '{}',
  purchase_date DATE,
  status public.plant_status NOT NULL DEFAULT 'alive',
  location_id UUID REFERENCES public.plant_locations(id) ON DELETE SET NULL,
  location_text TEXT,
  tags TEXT[] DEFAULT '{}',
  next_checkin_date DATE,
  source_plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plant observations log
CREATE TABLE public.plant_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owned_plant_id UUID NOT NULL REFERENCES public.owned_plants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  observation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  condition public.observation_condition NOT NULL DEFAULT 'healthy',
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Private notes per plant
CREATE TABLE public.plant_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owned_plant_id UUID NOT NULL REFERENCES public.owned_plants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Public sharing slugs
CREATE TABLE public.plant_public_slugs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owned_plant_id UUID NOT NULL REFERENCES public.owned_plants(id) ON DELETE CASCADE UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_owned_plants_user ON public.owned_plants(user_id);
CREATE INDEX idx_owned_plants_status ON public.owned_plants(status);
CREATE INDEX idx_owned_plants_location ON public.owned_plants(location_id);
CREATE INDEX idx_plant_observations_plant ON public.plant_observations(owned_plant_id);
CREATE INDEX idx_plant_notes_plant ON public.plant_notes(owned_plant_id);
CREATE INDEX idx_plant_public_slugs_slug ON public.plant_public_slugs(slug);

-- Enable RLS
ALTER TABLE public.plant_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owned_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_public_slugs ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_own_plant_location(pl_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pl_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_own_owned_plant(op_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT op_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.owns_plant(plant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.owned_plants
    WHERE id = plant_id AND user_id = auth.uid()
  )
$$;

-- RLS Policies for plant_locations
CREATE POLICY "Users can view own locations" ON public.plant_locations
FOR SELECT USING (is_own_plant_location(user_id));

CREATE POLICY "Users can insert own locations" ON public.plant_locations
FOR INSERT WITH CHECK (is_own_plant_location(user_id));

CREATE POLICY "Users can update own locations" ON public.plant_locations
FOR UPDATE USING (is_own_plant_location(user_id));

CREATE POLICY "Users can delete own locations" ON public.plant_locations
FOR DELETE USING (is_own_plant_location(user_id));

-- RLS Policies for owned_plants
CREATE POLICY "Users can view own plants" ON public.owned_plants
FOR SELECT USING (is_own_owned_plant(user_id));

CREATE POLICY "Users can insert own plants" ON public.owned_plants
FOR INSERT WITH CHECK (is_own_owned_plant(user_id));

CREATE POLICY "Users can update own plants" ON public.owned_plants
FOR UPDATE USING (is_own_owned_plant(user_id));

CREATE POLICY "Users can delete own plants" ON public.owned_plants
FOR DELETE USING (is_own_owned_plant(user_id));

-- RLS Policies for plant_observations
CREATE POLICY "Users can view own observations" ON public.plant_observations
FOR SELECT USING (owns_plant(owned_plant_id));

CREATE POLICY "Users can insert observations for own plants" ON public.plant_observations
FOR INSERT WITH CHECK (owns_plant(owned_plant_id));

CREATE POLICY "Users can update own observations" ON public.plant_observations
FOR UPDATE USING (owns_plant(owned_plant_id));

CREATE POLICY "Users can delete own observations" ON public.plant_observations
FOR DELETE USING (owns_plant(owned_plant_id));

-- RLS Policies for plant_notes
CREATE POLICY "Users can view own notes" ON public.plant_notes
FOR SELECT USING (owns_plant(owned_plant_id));

CREATE POLICY "Users can insert notes for own plants" ON public.plant_notes
FOR INSERT WITH CHECK (owns_plant(owned_plant_id));

CREATE POLICY "Users can update own notes" ON public.plant_notes
FOR UPDATE USING (owns_plant(owned_plant_id));

CREATE POLICY "Users can delete own notes" ON public.plant_notes
FOR DELETE USING (owns_plant(owned_plant_id));

-- RLS Policies for plant_public_slugs
CREATE POLICY "Users can view own public slugs" ON public.plant_public_slugs
FOR SELECT USING (owns_plant(owned_plant_id));

CREATE POLICY "Anyone can view public slugs" ON public.plant_public_slugs
FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert public slugs for own plants" ON public.plant_public_slugs
FOR INSERT WITH CHECK (owns_plant(owned_plant_id));

CREATE POLICY "Users can update own public slugs" ON public.plant_public_slugs
FOR UPDATE USING (owns_plant(owned_plant_id));

CREATE POLICY "Users can delete own public slugs" ON public.plant_public_slugs
FOR DELETE USING (owns_plant(owned_plant_id));

-- Triggers for updated_at
CREATE TRIGGER update_plant_locations_updated_at
BEFORE UPDATE ON public.plant_locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_owned_plants_updated_at
BEFORE UPDATE ON public.owned_plants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plant_observations_updated_at
BEFORE UPDATE ON public.plant_observations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plant_notes_updated_at
BEFORE UPDATE ON public.plant_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plant_public_slugs_updated_at
BEFORE UPDATE ON public.plant_public_slugs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION public.generate_plant_slug()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_slug TEXT;
  slug_exists BOOLEAN;
BEGIN
  LOOP
    new_slug := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS (SELECT 1 FROM public.plant_public_slugs WHERE slug = new_slug) INTO slug_exists;
    EXIT WHEN NOT slug_exists;
  END LOOP;
  RETURN new_slug;
END;
$$;

-- Storage bucket for collection photos
INSERT INTO storage.buckets (id, name, public) VALUES ('collection-photos', 'collection-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for collection photos
CREATE POLICY "Users can upload collection photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'collection-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own collection photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'collection-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own collection photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'collection-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view collection photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'collection-photos');