-- Add unique constraint on phone_number
ALTER TABLE users
  ADD CONSTRAINT users_phone_number_unique UNIQUE (phone_number);
