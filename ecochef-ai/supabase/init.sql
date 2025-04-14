-- Initialize Supabase tables for EcoChef AI application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Correct syntax for dropping tables and ensure proper order
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pantry_items') THEN
    DROP TABLE pantry_items;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
    DROP TABLE user_preferences;
  END IF;
END $$;

-- Create UserPreferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userid UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dietary restrictions
  "isVegetarian" BOOLEAN DEFAULT FALSE,
  "isVegan" BOOLEAN DEFAULT FALSE,
  "isGlutenFree" BOOLEAN DEFAULT FALSE,
  "isDairyFree" BOOLEAN DEFAULT FALSE,
  "isNutFree" BOOLEAN DEFAULT FALSE,
  
  -- Flavor preferences (1-10 scale)
  "spicyPreference" INTEGER DEFAULT 5,
  "sweetPreference" INTEGER DEFAULT 5,
  "savoryPreference" INTEGER DEFAULT 5,
  
  -- Cooking preferences
  "maxCookingTime" INTEGER,
  "cookingSkillLevel" TEXT DEFAULT 'intermediate',
  "peopleCount" INTEGER DEFAULT 1,
  
  -- Other preferences as JSONB for flexibility
  "cuisinePreferences" JSONB DEFAULT '[]',
  "flavorPreferences" JSONB DEFAULT '[]',
  "healthGoals" JSONB DEFAULT '[]',
  allergies JSONB DEFAULT '[]',
  "sustainabilityPreference" TEXT DEFAULT 'medium',
  "nutritionFocus" JSONB DEFAULT '[]',
  
  -- Nutrition targets
  "calorieTarget" INTEGER,
  "proteinTarget" INTEGER,
  "carbTarget" INTEGER,
  "fatTarget" INTEGER,
  
  -- Raw quiz answers for reference
  "rawQuizAnswers" JSONB,
  
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing column 'cuisinePreferences' to 'user_preferences' table
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS "cuisinePreferences" JSONB DEFAULT '[]';

-- Add missing column 'userId' to 'user_preferences' table
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create PantryItems table
CREATE TABLE pantry_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_pantry_items_user_id ON pantry_items("userId");
CREATE INDEX idx_pantry_items_name ON pantry_items(name);

-- Create a trigger function to update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updatedAt" = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables with updatedAt column
CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_pantry_items_updated_at 
  BEFORE UPDATE ON pantry_items 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Removed references to public.User table
-- Ensure all references are aligned with auth.users
-- Removed the creation of the 'User' table and its associated triggers and policies.

-- Create an anonymous user for testing (can be removed in production)
INSERT INTO auth.users (id, email, name) 
VALUES ('00000000-0000-0000-0000-000000000000', 'anonymous@example.com', 'Anonymous User')
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS) policies
-- Enable RLS on tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

-- Create policies for pantry_items
CREATE POLICY pantry_items_select_policy ON pantry_items 
  FOR SELECT USING (auth.uid()::text = "userId"::text);

CREATE POLICY pantry_items_insert_policy ON pantry_items 
  FOR INSERT WITH CHECK (auth.uid()::text = "userId"::text);

CREATE POLICY pantry_items_update_policy ON pantry_items 
  FOR UPDATE USING (auth.uid()::text = "userId"::text);

CREATE POLICY pantry_items_delete_policy ON pantry_items 
  FOR DELETE USING (auth.uid()::text = "userId"::text);

-- Create policies for user_preferences
CREATE POLICY user_preferences_select_policy ON user_preferences 
  FOR SELECT USING (auth.uid()::text = userid::text);

CREATE POLICY user_preferences_insert_policy ON user_preferences 
  FOR INSERT WITH CHECK (auth.uid()::text = userid::text);

CREATE POLICY user_preferences_update_policy ON user_preferences 
  FOR UPDATE USING (auth.uid()::text = userid::text);

-- Add API documentation with comments
COMMENT ON TABLE user_preferences IS 'Stores user dietary preferences and cooking preferences';
COMMENT ON TABLE pantry_items IS 'Stores ingredients in user pantry';

-- Grant necessary permissions to public user
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pantry_items TO anon, authenticated;