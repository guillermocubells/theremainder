-- Add order-related columns to owned_plants
ALTER TABLE public.owned_plants 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS serial_code TEXT UNIQUE;

-- Create index for serial code
CREATE INDEX IF NOT EXISTS idx_owned_plants_serial_code ON public.owned_plants(serial_code);
CREATE INDEX IF NOT EXISTS idx_owned_plants_order_id ON public.owned_plants(order_id);

-- Function to generate unique serial codes (FPA-YYYY-NNNNN format)
CREATE OR REPLACE FUNCTION public.generate_plant_serial_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  current_year TEXT;
  next_number INT;
BEGIN
  current_year := to_char(now(), 'YYYY');
  
  -- Get the next number for this year
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(serial_code, '^FPA-' || current_year || '-', ''), serial_code)::INT
  ), 0) + 1
  INTO next_number
  FROM public.owned_plants
  WHERE serial_code LIKE 'FPA-' || current_year || '-%';
  
  new_code := 'FPA-' || current_year || '-' || lpad(next_number::text, 5, '0');
  
  RETURN new_code;
END;
$$;

-- Function to create owned plants from an order (called by webhook)
CREATE OR REPLACE FUNCTION public.create_owned_plants_from_order(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_plant RECORD;
  v_count INT := 0;
  v_i INT;
  v_serial TEXT;
BEGIN
  -- Loop through order items
  FOR v_item IN 
    SELECT oi.*, o.created_at as order_date
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.order_id = p_order_id
  LOOP
    -- Try to find matching plant product
    SELECT id, name, scientific_name, thumbnail_url
    INTO v_plant
    FROM plants
    WHERE slug = v_item.product_id 
       OR id::text = v_item.product_id
    LIMIT 1;
    
    -- Create one owned plant per quantity
    FOR v_i IN 1..v_item.quantity LOOP
      -- Generate unique serial code
      v_serial := generate_plant_serial_code();
      
      INSERT INTO owned_plants (
        user_id,
        nickname,
        scientific_name,
        common_name,
        photos,
        purchase_date,
        status,
        location_text,
        tags,
        source_plant_id,
        order_id,
        order_item_id,
        serial_code
      ) VALUES (
        p_user_id,
        COALESCE(v_plant.name, v_item.product_name) || ' #' || v_i,
        v_plant.scientific_name,
        COALESCE(v_plant.name, v_item.product_name),
        CASE WHEN v_plant.thumbnail_url IS NOT NULL OR v_item.product_image IS NOT NULL 
          THEN ARRAY[COALESCE(v_plant.thumbnail_url, v_item.product_image)]
          ELSE '{}'::text[]
        END,
        v_item.order_date::date,
        'alive'::plant_status,
        'Sin asignar',
        '{}',
        v_plant.id,
        p_order_id,
        v_item.id,
        v_serial
      );
      
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$;