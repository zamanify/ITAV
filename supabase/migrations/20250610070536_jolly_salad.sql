/*
  # Revert Group Members RLS Policy Changes

  This migration reverts the changes made in the previous migration by:
  1. Dropping the new granular policies
  2. Restoring the original "Group creators can manage members" policy with ALL permissions

  This restores the original state where only group creators can manage all aspects of group membership.
*/

-- Drop the new granular policies
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can insert members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can update members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can delete members" ON public.group_members;

-- Restore the original policy with ALL permissions for group creators
CREATE POLICY "Group creators can manage members"
ON public.group_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM groups
    WHERE (groups.id = group_members.group_id AND groups.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM groups
    WHERE (groups.id = group_members.group_id AND groups.created_by = auth.uid())
  )
);