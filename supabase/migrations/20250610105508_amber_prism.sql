/*
  # Balance Transfer System for Completed Requests

  1. Database Functions
    - Create function to handle minute balance transfers
    - Ensure atomic transactions for balance updates
    
  2. Triggers
    - Automatically update user balances when transactions are created
    
  3. Security
    - Ensure only valid completed requests can create transactions
    - Prevent duplicate transactions for the same request
*/

-- Function to transfer minutes between users
CREATE OR REPLACE FUNCTION transfer_minutes(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_minutes integer,
  p_request_id uuid
) RETURNS void AS $$
BEGIN
  -- Validate that the request exists and is completed
  IF NOT EXISTS (
    SELECT 1 FROM requests 
    WHERE id = p_request_id 
    AND status = 'completed'
    AND (requester_id = p_from_user_id OR accepted_responder_id = p_to_user_id)
  ) THEN
    RAISE EXCEPTION 'Invalid request or request not completed';
  END IF;

  -- Check if transaction already exists for this request
  IF EXISTS (
    SELECT 1 FROM transactions 
    WHERE related_request = p_request_id
  ) THEN
    RAISE EXCEPTION 'Transaction already exists for this request';
  END IF;

  -- Update balances atomically
  UPDATE users 
  SET minute_balance = minute_balance - p_minutes 
  WHERE id = p_from_user_id;

  UPDATE users 
  SET minute_balance = minute_balance + p_minutes 
  WHERE id = p_to_user_id;

  -- Create transaction record
  INSERT INTO transactions (
    from_user,
    to_user,
    minutes,
    related_request
  ) VALUES (
    p_from_user_id,
    p_to_user_id,
    p_minutes,
    p_request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically handle balance transfers
CREATE OR REPLACE FUNCTION handle_balance_transfer() RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is a new transaction
  IF TG_OP = 'INSERT' THEN
    -- Update the sender's balance (subtract minutes)
    UPDATE users 
    SET minute_balance = minute_balance - NEW.minutes 
    WHERE id = NEW.from_user;

    -- Update the receiver's balance (add minutes)
    UPDATE users 
    SET minute_balance = minute_balance + NEW.minutes 
    WHERE id = NEW.to_user;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS trigger_balance_transfer ON transactions;
CREATE TRIGGER trigger_balance_transfer
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_balance_transfer();

-- Add index for better performance on transaction lookups
CREATE INDEX IF NOT EXISTS idx_transactions_related_request 
ON transactions(related_request);

-- Ensure minute_balance has a default value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' 
    AND column_name = 'minute_balance' 
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE users ALTER COLUMN minute_balance SET DEFAULT 0;
  END IF;
END $$;