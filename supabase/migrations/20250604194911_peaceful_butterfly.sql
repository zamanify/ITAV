/*
  # Enable RLS and Add Policies

  1. Security Changes
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for users to view other users' basic information
  
  2. Tables Modified
    - users
    - villager_connections
    - groups
    - group_members
    - requests
    - request_responses
    - transactions
*/

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE villager_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read other users basic info"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Villager connections policies
CREATE POLICY "Users can manage their own connections"
  ON villager_connections
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id
  );

-- Groups policies
CREATE POLICY "Users can create groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view groups they're members of"
  ON groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group creators can manage their groups"
  ON groups
  FOR ALL
  TO authenticated
  USING (auth.uid() = created_by);

-- Group members policies
CREATE POLICY "Users can view group members"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can manage members"
  ON group_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- Requests policies
CREATE POLICY "Users can create requests"
  ON requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view requests in their groups"
  ON requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = requests.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Requesters can manage their requests"
  ON requests
  FOR ALL
  TO authenticated
  USING (auth.uid() = requester_id);

-- Request responses policies
CREATE POLICY "Users can respond to requests"
  ON request_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = responder_id);

CREATE POLICY "Users can view responses to their requests"
  ON request_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = request_responses.request_id
      AND requests.requester_id = auth.uid()
    )
    OR auth.uid() = responder_id
  );

-- Transactions policies
CREATE POLICY "Users can view their transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = from_user OR
    auth.uid() = to_user
  );

CREATE POLICY "System can create transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);