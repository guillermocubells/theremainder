
-- ══════════════════════════════════════════════════════════════════════
-- Helper: enqueue incremental reindex job via job_queue
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.enqueue_reindex_job(p_plant_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF array_length(p_plant_ids, 1) IS NULL OR array_length(p_plant_ids, 1) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO job_queue (job_type, payload, max_attempts)
  VALUES (
    'reindex_incremental',
    jsonb_build_object(
      'mode', 'incremental',
      'plant_ids', to_jsonb(p_plant_ids)
    ),
    3
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- Trigger: category changes → reindex all plants in that category
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trigger_reindex_on_category_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_ids UUID[];
BEGIN
  SELECT array_agg(id) INTO v_ids
  FROM plants
  WHERE category_id = COALESCE(NEW.id, OLD.id);

  IF v_ids IS NOT NULL AND array_length(v_ids, 1) > 0 THEN
    PERFORM enqueue_reindex_job(v_ids);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_reindex_on_category_change
  AFTER UPDATE OR DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.trigger_reindex_on_category_change();

-- ══════════════════════════════════════════════════════════════════════
-- Trigger: stock reservation changes → reindex affected plant
-- (stock_qty on plants is the source of truth, but reservation
--  confirm/expire can change effective availability)
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trigger_reindex_on_reservation_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_plant_id UUID;
BEGIN
  v_plant_id := COALESCE(NEW.plant_id, OLD.plant_id);
  PERFORM enqueue_reindex_job(ARRAY[v_plant_id]);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_reindex_on_reservation_change
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_reservations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_reindex_on_reservation_change();
