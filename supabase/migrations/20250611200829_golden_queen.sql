/*
  # Fix Transaction RLS Policy

  1. Policy Updates
    - Update the "System can create transactions" policy to allow requester to create transactions
    - Handle both cases: regular requests and offers
    - Ensure proper validation of transaction participants

  2. Security
    - Maintain strict validation of transaction data
    - Ensure only valid request completions can create transactions
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "System can create transactions" ON public.transactions;

-- Create the updated policy that handles both request types
CREATE POLICY "System can create transactions" ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM requests r
      WHERE
        r.id = transactions.related_request AND
        r.requester_id = auth.uid() AND
        r.status = 'completed'::text AND
        r.minutes_logged = transactions.minutes AND
        (
          (transactions.from_user = r.requester_id AND transactions.to_user = r.accepted_responder_id) OR
          (transactions.from_user = r.accepted_responder_id AND transactions.to_user = r.requester_id)
        )
    )
  );