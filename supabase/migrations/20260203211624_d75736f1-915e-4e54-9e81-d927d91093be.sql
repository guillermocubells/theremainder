-- Remove the foreign key constraint on stock_notifications.plant_id
-- This allows using local plant slugs as IDs instead of database UUIDs
ALTER TABLE public.stock_notifications
DROP CONSTRAINT stock_notifications_plant_id_fkey;