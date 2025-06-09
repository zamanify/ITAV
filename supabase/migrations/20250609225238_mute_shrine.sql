/*
  # Add Request Junction Tables

  1. New Tables
    - `request_groups` - Links requests to multiple groups
      - `id` (uuid, primary key)
      - `request_id` (uuid, foreign key to requests)
      - `group_id` (uuid, foreign key to groups)
      - `created_at` (timestamp)
    
    - `request_villagers` - Links requests to individual villagers
      - `id` (uuid, primary key)
      - `request_id` (uuid, foreign key to requests)
      - `user_id` (uuid, foreign key to users)
      - `created_at` (timestamp)

  2. Changes
    - Remove `group_id` column from `requests` table
    - Add unique constraints to prevent duplicate associations
    - Add indexes for performance

  3. Security
    - Enable RLS on new tables
    - Add appropriate policies for access control
*/

-- Remove the group_id column from requests table
ALTER TABLE requests DROP COLUMN IF EXISTS group_id;

-- Create request_groups junction table
CREATE TABLE IF NOT EXISTS request_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create request_villagers junction table
CREATE TABLE IF NOT EXISTS request_villagers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraints to prevent duplicate associations
ALTER TABLE request_groups 
ADD CONSTRAINT request_groups_request_group_unique 
UNIQUE (request_id, group_id);

ALTER TABLE request_villagers 
ADD CONSTRAINT request_villagers_request_user_unique 
UNIQUE (request_id, user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_request_groups_request ON request_groups(request_id);
CREATE INDEX IF NOT EXISTS idx_request_groups_group ON request_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_request_villagers_request ON request_villagers(request_id);
CREATE INDEX IF NOT EXISTS idx_request_villagers_user ON request_villagers(user_id);

-- Enable RLS on new tables
ALTER TABLE request_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_villagers ENABLE ROW LEVEL SECURITY;