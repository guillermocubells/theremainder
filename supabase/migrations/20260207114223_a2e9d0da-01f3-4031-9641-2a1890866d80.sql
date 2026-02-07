
-- =============================================
-- REFACTORIZACIÓN DE LA TABLA plants
-- =============================================
-- 1. Eliminar columnas duplicadas (datos ya existen en columnas equivalentes)
ALTER TABLE public.plants DROP COLUMN IF EXISTS hardiness_zone;
ALTER TABLE public.plants DROP COLUMN IF EXISTS sun_requirement;
ALTER TABLE public.plants DROP COLUMN IF EXISTS water_requirement;
ALTER TABLE public.plants DROP COLUMN IF EXISTS temperature_range;

-- 2. Eliminar columnas redundantes
ALTER TABLE public.plants DROP COLUMN IF EXISTS is_in_stock;
ALTER TABLE public.plants DROP COLUMN IF EXISTS thumbnail_url;

-- 3. Añadir índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_plants_active_order ON public.plants (is_active, display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_plants_slug ON public.plants (slug);
CREATE INDEX IF NOT EXISTS idx_plants_category ON public.plants (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plants_plant_type ON public.plants (plant_type);
CREATE INDEX IF NOT EXISTS idx_plants_stock ON public.plants (stock_qty);
CREATE INDEX IF NOT EXISTS idx_plants_climate_zones ON public.plants USING GIN (climate_zones);
CREATE INDEX IF NOT EXISTS idx_plants_exposure ON public.plants USING GIN (exposure);
CREATE INDEX IF NOT EXISTS idx_plants_plant_use ON public.plants USING GIN (plant_use);

-- 4. Añadir índices faltantes en otras tablas de uso frecuente
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices (order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_owned_plants_user_id ON public.owned_plants (user_id);
CREATE INDEX IF NOT EXISTS idx_owned_plants_source_plant ON public.owned_plants (source_plant_id) WHERE source_plant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items (user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_catalog_product ON public.wishlist_items (catalog_product_id) WHERE catalog_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_notifications_plant ON public.stock_notifications (plant_id) WHERE notified_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON public.referral_rewards (referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON public.referral_rewards (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status ON public.fraud_flags (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
