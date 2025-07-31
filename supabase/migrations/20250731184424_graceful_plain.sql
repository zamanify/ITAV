-- Remove the existing RLS policy for INSERT on request_responses
DROP POLICY IF EXISTS "Users can respond to requests" ON public.request_responses;

-- Create a new RLS policy for INSERT on request_responses
-- This policy allows users to insert responses (including 'viewed' status)
-- for requests they are allowed to see and respond to.
CREATE POLICY "Users can respond to requests"
ON public.request_responses
FOR INSERT
TO authenticated
WITH CHECK (
  (
    (uid() = responder_id) AND
    (sender_id <> receiver_id) AND -- Ensure sender is not receiver for direct messages
    (NOT (EXISTS ( SELECT 1 FROM user_blocks ub WHERE ((ub.blocker_id = uid() AND ub.blocked_id = request_responses.receiver_id) OR (ub.blocker_id = request_responses.receiver_id AND ub.blocked_id = uid()))))) AND
    (
      -- Allow inserting 'viewed' status for any request the user can see
      (status = 'viewed'::text AND EXISTS (
        SELECT 1
        FROM requests r
        WHERE
          (r.id = request_responses.request_id) AND
          (r.requester_id <> uid()) AND -- Cannot view your own request
          (NOT (EXISTS ( SELECT 1 FROM user_blocks ub WHERE ((ub.blocker_id = uid() AND ub.blocked_id = r.requester_id) OR (ub.blocker_id = r.requester_id AND ub.blocked_id = uid()))))) AND
          (
            (EXISTS ( SELECT 1 FROM request_groups rg JOIN group_members gm ON ((rg.group_id = gm.group_id)) WHERE ((rg.request_id = r.id) AND (gm.user_id = uid())))) OR
            (EXISTS ( SELECT 1 FROM request_villagers rv WHERE ((rv.request_id = r.id) AND (rv.user_id = uid()))))
          )
      ))
      OR
      -- Allow inserting 'accepted' or 'rejected' status for open requests the user can respond to
      (status IN ('accepted'::text, 'rejected'::text) AND EXISTS (
        SELECT 1
        FROM requests r
        WHERE
          (r.id = request_responses.request_id) AND
          (r.status = 'open'::text) AND
          (r.requester_id <> uid()) AND
          (NOT (EXISTS ( SELECT 1 FROM user_blocks ub WHERE ((ub.blocker_id = uid() AND ub.blocked_id = r.requester_id) OR (ub.blocker_id = r.requester_id AND ub.blocked_id = uid()))))) AND
          (
            (EXISTS ( SELECT 1 FROM request_groups rg JOIN group_members gm ON ((rg.group_id = gm.group_id)) WHERE ((rg.request_id = r.id) AND (gm.user_id = uid())))) OR
            (EXISTS ( SELECT 1 FROM request_villagers rv WHERE ((rv.request_id = r.id) AND (rv.user_id = uid()))))
          )
      ))
    )
  )
);