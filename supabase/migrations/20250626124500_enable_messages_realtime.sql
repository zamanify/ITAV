/*
  # Enable realtime for messages

  1. Replication
    - Add `messages` table to the `supabase_realtime` publication
    - Emit full row data on updates so realtime payloads include all columns
*/

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
