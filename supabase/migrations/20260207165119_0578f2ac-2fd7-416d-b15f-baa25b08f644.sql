-- Remove the public SELECT policy on shared_search_lists.
-- Public access is handled securely via the SECURITY DEFINER RPC 
-- get_public_shared_list_by_slug, so direct public reads are unnecessary
-- and expose user_id values.
DROP POLICY IF EXISTS "Anyone can view public shared lists" ON public.shared_search_lists;
