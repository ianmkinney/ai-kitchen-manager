-- Create pantry_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS "pantry_items" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES "auth"."users" (id)
    ON DELETE CASCADE
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON "pantry_items"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Enable Row Level Security
ALTER TABLE "pantry_items" ENABLE ROW LEVEL SECURITY;

-- Create policy for pantry_items table
CREATE POLICY "Users can view and edit their own pantry items"
ON "pantry_items"
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optional: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pantry_user_id ON "pantry_items" (user_id); 