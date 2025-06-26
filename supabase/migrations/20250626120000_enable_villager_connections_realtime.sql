/*
  # Enable realtime for villager connections

  1. Replication
    - Add `villager_connections` table to the `supabase_realtime` publication
*/

ALTER PUBLICATION supabase_realtime ADD TABLE public.villager_connections;

-- Emit full row data on updates so realtime payloads include sender/receiver
ALTER TABLE public.villager_connections REPLICA IDENTITY FULL;
