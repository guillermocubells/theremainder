-- Create table for shared search lists
CREATE TABLE public.shared_search_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE DEFAULT generate_plant_slug(),
  is_public boolean NOT NULL DEFAULT true,
  title text DEFAULT 'Mi lista de búsqueda',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_search_lists ENABLE ROW LEVEL SECURITY;

-- Policies for owners
CREATE POLICY "Users can manage own shared lists"
ON public.shared_search_lists
FOR ALL
USING (user_id = auth.uid());

-- Policy for public viewing
CREATE POLICY "Anyone can view public shared lists"
ON public.shared_search_lists
FOR SELECT
USING (is_public = true);

-- Create trigger for updated_at
CREATE TRIGGER update_shared_search_lists_updated_at
BEFORE UPDATE ON public.shared_search_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();