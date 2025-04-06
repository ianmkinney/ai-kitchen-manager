-- SQL script to create tables directly in Supabase

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create UserPreferences table
CREATE TABLE IF NOT EXISTS "UserPreferences" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  
  -- Dietary restrictions
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  is_dairy_free BOOLEAN DEFAULT FALSE,
  is_nut_free BOOLEAN DEFAULT FALSE,
  
  -- Flavor preferences (1-10 scale)
  spicy_preference INTEGER DEFAULT 5,
  sweet_preference INTEGER DEFAULT 5,
  savory_preference INTEGER DEFAULT 5,
  
  -- Cooking preferences
  max_cooking_time INTEGER DEFAULT 30,
  cooking_skill_level TEXT DEFAULT 'intermediate',
  cuisine TEXT DEFAULT 'Any',
  people_count INTEGER DEFAULT 2,
  
  -- Other preferences
  calorie_target INTEGER,
  protein_target INTEGER,
  carb_target INTEGER,
  fat_target INTEGER,
  
  -- Additional preferences
  preferred_cuisines TEXT[],
  diet_goals TEXT[],
  allergies TEXT[],
  disliked_ingredients TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES "User" (id)
    ON DELETE CASCADE
);

-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER set_user_updated_at
BEFORE UPDATE ON "User"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER set_preferences_updated_at
BEFORE UPDATE ON "UserPreferences"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- Add columns if they don't exist (for existing installations)
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE "UserPreferences" ADD COLUMN IF NOT EXISTS cuisine TEXT DEFAULT 'Any';
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE "UserPreferences" ADD COLUMN IF NOT EXISTS people_count INTEGER DEFAULT 2;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE "UserPreferences" ADD COLUMN IF NOT EXISTS preferred_cuisines TEXT[];
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE "UserPreferences" ADD COLUMN IF NOT EXISTS diet_goals TEXT[];
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE "UserPreferences" ADD COLUMN IF NOT EXISTS allergies TEXT[];
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE "UserPreferences" ADD COLUMN IF NOT EXISTS disliked_ingredients TEXT[];
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Insert test user
INSERT INTO "User" (id, email, name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'test@ecochef.demo',
  'Test User',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert default preferences for test user
INSERT INTO "UserPreferences" (
  user_id,
  is_vegetarian,
  is_vegan,
  is_gluten_free,
  is_dairy_free,
  is_nut_free,
  max_cooking_time,
  cooking_skill_level,
  spicy_preference,
  sweet_preference,
  savory_preference,
  cuisine,
  people_count,
  preferred_cuisines,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  30,
  'intermediate',
  5,
  5,
  5,
  'Any',
  2,
  ARRAY['Italian', 'Mexican', 'Asian'],
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO 
UPDATE SET 
  cuisine = EXCLUDED.cuisine,
  people_count = EXCLUDED.people_count,
  preferred_cuisines = EXCLUDED.preferred_cuisines; 