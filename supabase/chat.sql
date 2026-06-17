CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1 TEXT NOT NULL,
  user2 TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(user1, user2)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE OR REPLACE FUNCTION normalize_conversation_users()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user1 > NEW.user2 THEN
    NEW.user1 := NEW.user2;
    NEW.user2 := NEW.user1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_normalize_conversation_users
  BEFORE INSERT ON conversations
  FOR EACH ROW EXECUTE FUNCTION normalize_conversation_users();

CREATE INDEX idx_conversations_users ON conversations (user1, user2);
CREATE INDEX idx_messages_conversation ON messages (conversation_id);
CREATE INDEX idx_messages_sender ON messages (sender);
CREATE INDEX idx_messages_created ON messages (created_at DESC);
