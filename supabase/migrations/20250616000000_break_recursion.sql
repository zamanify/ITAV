-- Break RLS recursion between requests and request_villagers

-- Helper functions to avoid cross-table queries in policies
CREATE OR REPLACE FUNCTION public.is_request_owner(p_request uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM requests
    WHERE id = p_request AND requester_id = p_user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_direct_recipient(p_request uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM request_villagers
    WHERE request_id = p_request AND user_id = p_user
  );
$$;

-- Drop old recursive policies
DROP POLICY IF EXISTS "Users can view direct requests" ON requests;
DROP POLICY IF EXISTS "Users can view request villagers for accessible requests" ON request_villagers;
DROP POLICY IF EXISTS "Users can create request villagers for their requests" ON request_villagers;
DROP POLICY IF EXISTS "Users can delete request villagers for their requests" ON request_villagers;
DROP POLICY IF EXISTS "Users can view request groups for accessible requests" ON request_groups;
DROP POLICY IF EXISTS "Users can create request groups for their requests" ON request_groups;
DROP POLICY IF EXISTS "Users can delete request groups for their requests" ON request_groups;

-- Recreate requests policy without direct table references
CREATE POLICY "Users can view direct requests"
  ON requests
  FOR SELECT
  TO authenticated
  USING (
    public.is_direct_recipient(id, auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub
      WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = requester_id)
         OR (ub.blocker_id = requester_id AND ub.blocked_id = auth.uid())
    )
  );

-- Recreate request_villagers policies using helper
CREATE POLICY "Requesters and recipients view request villagers"
  ON request_villagers
  FOR SELECT
  TO authenticated
  USING (
    request_villagers.user_id = auth.uid()
    OR public.is_request_owner(request_villagers.request_id, auth.uid())
  );

CREATE POLICY "Users can create request villagers for their requests"
  ON request_villagers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_request_owner(request_villagers.request_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM villager_connections vc
      WHERE (
        (vc.sender_id = auth.uid() AND vc.receiver_id = request_villagers.user_id)
        OR (vc.receiver_id = auth.uid() AND vc.sender_id = request_villagers.user_id)
      )
      AND vc.status = 'accepted'
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = request_villagers.user_id)
           OR (ub.blocker_id = request_villagers.user_id AND ub.blocked_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can delete request villagers for their requests"
  ON request_villagers
  FOR DELETE
  TO authenticated
  USING (
    public.is_request_owner(request_villagers.request_id, auth.uid())
  );

-- Recreate request_groups policies using helper
CREATE POLICY "Users can view request groups for accessible requests"
  ON request_groups
  FOR SELECT
  TO authenticated
  USING (
    public.is_request_owner(request_groups.request_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = request_groups.group_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create request groups for their requests"
  ON request_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_request_owner(request_groups.request_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = request_groups.group_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete request groups for their requests"
  ON request_groups
  FOR DELETE
  TO authenticated
  USING (
    public.is_request_owner(request_groups.request_id, auth.uid())
  );
