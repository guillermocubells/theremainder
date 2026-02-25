
CREATE OR REPLACE FUNCTION public.get_public_shared_list_by_slug(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_list shared_search_lists%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Fetch the shared list
  SELECT * INTO v_list
  FROM shared_search_lists
  WHERE slug = p_slug AND is_public = true;

  IF v_list.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Build result with list info (user_id removed from public response for privacy)
  v_result := jsonb_build_object(
    'sharedList', jsonb_build_object(
      'id', v_list.id,
      'slug', v_list.slug,
      'is_public', v_list.is_public,
      'title', v_list.title,
      'description', v_list.description,
      'global_inquiries_mode', v_list.global_inquiries_mode,
      'created_at', v_list.created_at,
      'updated_at', v_list.updated_at
    ),
    'wishlistItems', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', wi.id,
        'name', wi.name,
        'scientific_name', wi.scientific_name,
        'image_url', wi.image_url,
        'priority', wi.priority,
        'status', wi.status,
        'notes', wi.notes,
        'variety_notes', wi.variety_notes,
        'catalog_product_id', wi.catalog_product_id
      ))
      FROM wishlist_items wi
      WHERE wi.user_id = v_list.user_id
        AND wi.status = 'searching'
    ), '[]'::jsonb),
    'stockNotifications', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sn.id,
        'plant_id', sn.plant_id
      ))
      FROM stock_notifications sn
      WHERE sn.user_id = v_list.user_id
    ), '[]'::jsonb)
  );

  RETURN v_result;
END;
$function$;
