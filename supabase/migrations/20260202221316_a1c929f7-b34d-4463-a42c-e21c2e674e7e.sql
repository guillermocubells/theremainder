-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Function to check if user has a specific role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public read access for categories
CREATE POLICY "Anyone can view active categories"
ON public.categories
FOR SELECT
USING (is_active = true);

-- Admin full access for categories
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create plants table
CREATE TABLE public.plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scientific_name TEXT,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(10,2),
  stock INTEGER NOT NULL DEFAULT 0,
  container_size TEXT,
  germination_date TEXT,
  
  -- Plant characteristics
  sun_requirement TEXT,
  water_requirement TEXT,
  temperature_range TEXT,
  hardiness_zone TEXT,
  growth_rate TEXT,
  mature_height TEXT,
  mature_width TEXT,
  
  -- Origin info
  origin_country TEXT,
  origin_region TEXT,
  native_habitat TEXT,
  
  -- Care instructions (JSON for flexibility)
  care_instructions JSONB DEFAULT '{}',
  curious_facts JSONB DEFAULT '[]',
  specifications JSONB DEFAULT '{}',
  
  -- Media (array of image URLs)
  images TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on plants
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

-- Public read access for active plants
CREATE POLICY "Anyone can view active plants"
ON public.plants
FOR SELECT
USING (is_active = true);

-- Admin full access for plants
CREATE POLICY "Admins can manage plants"
ON public.plants
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create shipping_zones table for managing shipping rates
CREATE TABLE public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  base_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_item_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_shipping_threshold NUMERIC(10,2),
  delivery_days_min INTEGER NOT NULL DEFAULT 3,
  delivery_days_max INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on shipping_zones
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

-- Public read access for shipping zones
CREATE POLICY "Anyone can view active shipping zones"
ON public.shipping_zones
FOR SELECT
USING (is_active = true);

-- Admin full access for shipping zones
CREATE POLICY "Admins can manage shipping zones"
ON public.shipping_zones
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create store_settings table for general configuration
CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Public read access for store settings
CREATE POLICY "Anyone can view store settings"
ON public.store_settings
FOR SELECT
USING (true);

-- Admin full access for store settings
CREATE POLICY "Admins can manage store settings"
ON public.store_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plants_updated_at
BEFORE UPDATE ON public.plants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_zones_updated_at
BEFORE UPDATE ON public.shipping_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_plants_category ON public.plants(category_id);
CREATE INDEX idx_plants_slug ON public.plants(slug);
CREATE INDEX idx_plants_is_active ON public.plants(is_active);
CREATE INDEX idx_plants_is_featured ON public.plants(is_featured);
CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_shipping_zones_country ON public.shipping_zones(country_code);

-- Create storage bucket for plant images
INSERT INTO storage.buckets (id, name, public)
VALUES ('plant-images', 'plant-images', true);

-- Storage policies for plant-images bucket
CREATE POLICY "Anyone can view plant images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'plant-images');

CREATE POLICY "Admins can upload plant images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'plant-images' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update plant images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'plant-images' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete plant images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'plant-images' 
  AND public.has_role(auth.uid(), 'admin')
);