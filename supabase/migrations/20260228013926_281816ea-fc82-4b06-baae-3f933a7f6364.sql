
-- Trigger: invalidate fit_score_cache when a care profile is updated/deleted
CREATE OR REPLACE FUNCTION public.invalidate_cache_on_care_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.fit_score_cache SET stale = true, updated_at = now()
  WHERE plant_id = COALESCE(NEW.plant_id, OLD.plant_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_invalidate_cache_care_profile
AFTER UPDATE OR DELETE ON public.species_care_profiles
FOR EACH ROW EXECUTE FUNCTION public.invalidate_cache_on_care_profile_change();

-- Trigger: invalidate fit_score_cache when climate_zones change
CREATE OR REPLACE FUNCTION public.invalidate_cache_on_climate_zone_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.fit_score_cache SET stale = true, updated_at = now()
  WHERE climate_zone_id = COALESCE(NEW.id, OLD.id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_invalidate_cache_climate_zone
AFTER UPDATE OR DELETE ON public.climate_zones
FOR EACH ROW EXECUTE FUNCTION public.invalidate_cache_on_climate_zone_change();

-- Trigger: invalidate fit_score_cache when species_climate_thresholds change
CREATE OR REPLACE FUNCTION public.invalidate_cache_on_threshold_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.fit_score_cache SET stale = true, updated_at = now()
  WHERE plant_id = COALESCE(NEW.plant_id, OLD.plant_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_invalidate_cache_thresholds
AFTER INSERT OR UPDATE OR DELETE ON public.species_climate_thresholds
FOR EACH ROW EXECUTE FUNCTION public.invalidate_cache_on_threshold_change();

-- Trigger: invalidate fit_score_cache when user address garden profile changes
CREATE OR REPLACE FUNCTION public.invalidate_cache_on_address_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.fit_score_cache SET stale = true, updated_at = now()
  WHERE address_id = COALESCE(NEW.id, OLD.id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_invalidate_cache_address
AFTER UPDATE OR DELETE ON public.addresses
FOR EACH ROW EXECUTE FUNCTION public.invalidate_cache_on_address_change();

-- Trigger: invalidate fit_score_cache when region_overrides change
CREATE OR REPLACE FUNCTION public.invalidate_cache_on_region_override_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.fit_score_cache SET stale = true, updated_at = now()
  WHERE region_override_id = COALESCE(NEW.id, OLD.id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_invalidate_cache_region_override
AFTER UPDATE OR DELETE ON public.region_overrides
FOR EACH ROW EXECUTE FUNCTION public.invalidate_cache_on_region_override_change();
