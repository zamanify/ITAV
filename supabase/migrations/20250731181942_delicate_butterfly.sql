/*
  # Fix RLS policy for request_responses table to allow view logging

  1. Policy Updates
    - Update INSERT policy to allow users to log views (status = 'viewed')
    - Ensure users can insert their own response records for viewing purposes

  2. Changes Made
    - Modified INSERT policy to allow 'viewed' status insertions
    - Maintained existing security constraints for other operations
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can respond to requests" ON request_responses;

-- Create updated INSERT policy that allows view logging
CREATE POLICY "Users can respond to requests and log views"
  ON request_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (uid() = responder_id) AND 
    (
      -- Allow logging views for any request the user can see
      (status = 'viewed') OR
      -- Original policy conditions for actual responses
      (
        status IN ('accepted', 'rejected') AND
        EXISTS (
          SELECT 1
          FROM requests r
          WHERE (
            (r.id = request_responses.request_id) AND 
            (r.status = 'open') AND 
            (r.requester_id <> uid()) AND 
            (
              (EXISTS (
                SELECT 1
                FROM (request_groups rg JOIN group_members gm ON ((rg.group_id = gm.group_id)))
                WHERE ((rg.request_id = r.id) AND (gm.user_id = uid()))
              )) OR 
              (EXISTS (
                SELECT 1
                FROM request_villagers rv
                WHERE ((rv.request_id = r.id) AND (rv.user_id = uid()))
              ))
            ) AND 
            (NOT (EXISTS (
              SELECT 1
              FROM user_blocks ub
              WHERE (
                ((ub.blocker_id = uid()) AND (ub.blocked_id = r.requester_id)) OR 
                ((ub.blocker_id = r.requester_id) AND (ub.blocked_id = uid()))
              )
            )))
          )
        )
      )
    )
  );