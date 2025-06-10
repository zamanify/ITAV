/*
  # Add read access policy for group members

  1. New Policy
    - `group_members_can_view_membership` - Allows group members to view membership of groups they belong to
    
  2. Security
    - Members can only see membership information for groups they are part of
    - Does not interfere with existing creator management permissions
    - Maintains data security by restricting access to relevant groups only

  This policy enables group members to see requests/offers sent to their groups by allowing them to read the group_members table for groups they belong to.
*/

-- Add SELECT policy for group members to view membership of their groups
CREATE POLICY "Group members can view membership"
ON public.group_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid()
  )
);