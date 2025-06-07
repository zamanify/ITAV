-- Create table to store invites for users that are not yet in the system
CREATE TABLE villager_invite (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inviter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone_number TEXT,
    email TEXT,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE villager_invite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviters manage their invites"
  ON villager_invite
  FOR ALL
  TO authenticated
  USING (auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = inviter_id);

-- Function and trigger to convert invites when a matching user registers
CREATE OR REPLACE FUNCTION public.process_villager_invites()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a connection for each matching invite
  INSERT INTO public.villager_connections(sender_id, receiver_id, status)
  SELECT inviter_id, NEW.id, 'pending'
  FROM public.villager_invite
  WHERE status = 'pending'
    AND (
         (phone_number IS NOT NULL AND phone_number = NEW.phone_number)
         OR (email IS NOT NULL AND email = NEW.email)
        );

  -- Mark invites as accepted
  UPDATE public.villager_invite
  SET status = 'accepted'
  WHERE status = 'pending'
    AND (
         (phone_number IS NOT NULL AND phone_number = NEW.phone_number)
         OR (email IS NOT NULL AND email = NEW.email)
        );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_process_villager_invites
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.process_villager_invites();
