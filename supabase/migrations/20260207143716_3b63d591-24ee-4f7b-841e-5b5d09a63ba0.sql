
-- Add admin policies for order_items table
CREATE POLICY "Admins can view all order items"
ON public.order_items
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update order items"
ON public.order_items
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
