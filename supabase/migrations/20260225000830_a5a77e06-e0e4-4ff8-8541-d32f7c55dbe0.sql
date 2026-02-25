-- Add product image metadata columns to plants table
ALTER TABLE public.plants
  ADD COLUMN IF NOT EXISTS product_images text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS primary_image text DEFAULT NULL;