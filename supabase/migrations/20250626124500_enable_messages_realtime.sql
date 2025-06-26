/*
  # Enable realtime for messages

  1. Replication
    - Add `messages` table to the `supabase_realtime` publication
    - Emit full row data on updates so realtime payloads include all columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
