/*
  # Add message column to request_responses table

  1. Schema Changes
    - Add `message` column to `request_responses` table
    - Column type: text (nullable to allow existing records)
    - This will store the message that users send when responding to requests/offers

  2. Purpose
    - Enable users to send personalized messages when accepting requests or offers
    - Improve communication between villagers
    - Provide context for why someone is responding
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'request_responses' AND column_name = 'message'
  ) THEN
    ALTER TABLE request_responses ADD COLUMN message text;
  END IF;
END $$;