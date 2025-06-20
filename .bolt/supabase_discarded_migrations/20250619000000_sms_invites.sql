/*
  # Track SMS invite status

  1. Schema Changes
    - Add `sms_sent_at` column to `villager_invite`
    - Add `sms_status` column to `villager_invite`
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'villager_invite' AND column_name = 'sms_sent_at'
  ) THEN
    ALTER TABLE villager_invite ADD COLUMN sms_sent_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'villager_invite' AND column_name = 'sms_status'
  ) THEN
    ALTER TABLE villager_invite ADD COLUMN sms_status TEXT;
  END IF;
END $$;
