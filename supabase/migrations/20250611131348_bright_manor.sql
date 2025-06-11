/*
  # Fix Transaction RLS Policy

  1. Security Changes
    - Update the INSERT policy for transactions table to allow creation when request is 'accepted' status
    - This allows the transaction to be created before marking the request as completed
    - Maintains security by ensuring only request participants can create transactions

  2. Policy Logic
    - User must be either the requester or the accepted responder
    - Request must be in 'accepted' status (not 'completed' yet)
    - Transaction minutes must match the request's logged minutes
    - Proper user assignment based on offer vs request type
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "System can create transactions" ON transactions;

-- Create a new policy that allows transaction creation when request is accepted
CREATE POLICY "Users can create transactions for accepted requests"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM requests r
      WHERE r.id = transactions.related_request
        AND r.status = 'accepted'
        AND r.minutes_logged = transactions.minutes
        AND r.accepted_responder_id IS NOT NULL
        AND (
          -- For requests (requester pays responder): requester creates transaction from themselves to responder
          (NOT r.is_offer AND uid() = r.requester_id AND uid() = transactions.from_user AND transactions.to_user = r.accepted_responder_id)
          OR
          -- For offers (responder pays requester): requester creates transaction from responder to themselves
          (r.is_offer AND uid() = r.requester_id AND uid() = transactions.to_user AND transactions.from_user = r.accepted_responder_id)
        )
    )
  );