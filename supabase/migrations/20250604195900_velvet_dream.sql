/*
  # Update groups to be user-local

  1. Changes
    - Remove role column from group_members table
    - Update RLS policies to reflect that groups are private to their creator
    - Groups and their members are only visible to the group creator

  2. Security
    - Enable RLS on groups and group_members tables
    - Add policies to ensure groups are only accessible by their creator
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view groups they're members of" ON groups;
DROP POLICY IF EXISTS "Group creators can manage their groups" ON groups;
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON group_members;

-- Remove role column and its constraint from group_members
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_role_check;
ALTER TABLE group_members DROP COLUMN IF EXISTS role;

-- Update groups policies
CREATE POLICY "Users can manage their own groups"
  ON groups
  FOR ALL
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Update group_members policies
CREATE POLICY "Users can manage their group members"
  ON group_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );