/*
  # Add accepted responder to requests table

  1. New Columns
    - `accepted_responder_id` (uuid, nullable) - References the user who was selected to fulfill the request
  
  2. Foreign Key Constraints
    - Links accepted_responder_id to users table with CASCADE delete behavior
  
  3. Purpose
    - Track which responder was selected for each request
    - Enable request status management (open -> accepted -> completed)
*/

-- Add the accepted_responder_id column to requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'accepted_responder_id'
  ) THEN
    ALTER TABLE public.requests
    ADD COLUMN accepted_responder_id uuid NULL;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_accepted_responder'
  ) THEN
    ALTER TABLE public.requests
    ADD CONSTRAINT fk_accepted_responder
    FOREIGN KEY (accepted_responder_id)
    REFERENCES public.users(id)
    ON DELETE SET NULL;
  END IF;
END $$;