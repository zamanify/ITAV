/*
  # Fix Group Members RLS Policies

  This migration fixes the RLS policies on the `public.group_members` table to allow
  group members to view requests and offers sent to their groups, while maintaining
  proper permissions for group creators.

  ## Changes Made

  1. **Remove existing overly broad policy**
     - Drops the "Group creators can manage members" policy that uses ALL command
     - This policy was preventing proper access to group-related requests/offers

  2. **Add specific SELECT policy**
     - Allows any authenticated user to view group membership records
     - Only for groups where they are themselves a member
     - This enables the requests RLS to properly check group membership

  3. **Add specific INSERT policy**
     - Only group creators can add new members to their groups
     - Maintains security for group management

  4. **Add specific UPDATE policy**
     - Only group creators can update member records in their groups
     - Preserves group creator control

  5. **Add specific DELETE policy**
     - Only group creators can remove members from their groups
     - Ensures proper group management permissions

  ## Impact

  After this migration:
  - Group members will be able to see requests/offers sent to groups they belong to
  - Group creators retain full control over their group membership
  - The requests RLS policies will work correctly with group membership checks
*/

-- Drop the existing overly broad policy
DROP POLICY IF EXISTS "Group creators can manage members" ON public.group_members;

-- Add SELECT policy: Users can view group members for groups they belong to
CREATE POLICY "Users can view group members"
ON public.group_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
  )
);

-- Add INSERT policy: Only group creators can add members
CREATE POLICY "Group creators can insert members"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM groups
    WHERE (groups.id = group_members.group_id AND groups.created_by = auth.uid())
  )
);

-- Add UPDATE policy: Only group creators can update members
CREATE POLICY "Group creators can update members"
ON public.group_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM groups
    WHERE (groups.id = group_members.group_id AND groups.created_by = auth.uid())
  )
);

-- Add DELETE policy: Only group creators can delete members
CREATE POLICY "Group creators can delete members"
ON public.group_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM groups
    WHERE (groups.id = group_members.group_id AND groups.created_by = auth.uid())
  )
);