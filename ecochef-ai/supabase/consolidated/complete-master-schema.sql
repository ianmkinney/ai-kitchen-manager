-- =================================================================
-- ECOCHEF-AI COMPLETE MASTER SCHEMA
-- This file contains the complete database schema for EcoChef-AI
-- Use this to recreate all tables in Supabase from scratch
-- =================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- DROP EXISTING TABLES (in reverse dependency order)
-- =================================================================
DROP TABLE IF EXISTS "ShoppingListItem" CASCADE;
DROP TABLE IF EXISTS weekly_plan_recipes CASCADE;
DROP TABLE IF EXISTS weekly_plans CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS custom_recipes CASCADE;
DROP TABLE IF EXISTS pantry_items CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS shopping_list CASCADE;

-- =================================================================
-- CREATE TABLES
-- =================================================================
-- Note: User authentication is handled entirely by Supabase Auth (auth.users table)
-- No custom User table needed

-- Create user_preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "isVegetarian" BOOLEAN DEFAULT FALSE,
  "isVegan" BOOLEAN DEFAULT FALSE,
  "isGlutenFree" BOOLEAN DEFAULT FALSE,
  "isDairyFree" BOOLEAN DEFAULT FALSE,
  "isNutFree" BOOLEAN DEFAULT FALSE,
  "spicyPreference" INTEGER DEFAULT 5,
  "sweetPreference" INTEGER DEFAULT 5,
  "savoryPreference" INTEGER DEFAULT 5,
  "maxCookingTime" INTEGER DEFAULT 30,
  "cookingSkillLevel" TEXT DEFAULT 'intermediate',
  "peopleCount" INTEGER DEFAULT 2,
  cuisine TEXT DEFAULT 'Any',
  "cuisinePreferences" JSONB DEFAULT '[]'::JSONB,
  "flavorPreferences" JSONB DEFAULT '[]'::JSONB,
  "healthGoals" JSONB DEFAULT '[]'::JSONB,
  "allergies" JSONB DEFAULT '[]'::JSONB,
  "sustainabilityPreference" TEXT DEFAULT 'medium',
  "nutritionFocus" JSONB DEFAULT '[]'::JSONB,
  "calorieTarget" INTEGER,
  "proteinTarget" INTEGER,
  "carbTarget" INTEGER,
  "fatTarget" INTEGER,
  "dietaryNotes" TEXT DEFAULT '',
  "rawQuizAnswers" JSONB DEFAULT '{}'::JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(userid)
);

-- Create pantry_items table
CREATE TABLE pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "itemName" TEXT NOT NULL,
  category TEXT,
  quantity REAL,
  unit TEXT,
  "expirationDate" DATE,
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "recipeData" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create weekly_plans table
CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "weekStartDate" DATE NOT NULL,
  "nutritionSummary" JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(userid, "weekStartDate")
);

-- Create index for faster date-based lookups
CREATE INDEX idx_weekly_plans_week_start_date ON weekly_plans("weekStartDate");

-- Create weekly_plan_recipes table
CREATE TABLE weekly_plan_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "weeklyPlanId" UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
  "recipeData" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "plannedDate" DATE NOT NULL,
  "mealType" TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner'
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopping_list table (legacy table)
CREATE TABLE shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "itemName" TEXT NOT NULL,
  category TEXT,
  quantity REAL,
  unit TEXT,
  completed BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create custom_recipes table (with all nutrition fields)
CREATE TABLE custom_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ingredients JSONB DEFAULT '[]'::JSONB,
  instructions JSONB DEFAULT '[]'::JSONB,
  cuisine TEXT,
  description TEXT,
  difficulty TEXT,
  time TEXT,
  "servingSize" INTEGER DEFAULT 1,
  "calories" INTEGER,
  "protein" REAL,
  "carbs" REAL,
  "fat" REAL,
  "nutritionInfo" JSONB DEFAULT '{}'::JSONB,
  -- Additional nutrition fields from migrations
  "caloriesPerServing" INTEGER,
  "servings" INTEGER,
  "totalProtein" INTEGER,
  "totalCarbs" INTEGER,
  "totalFat" INTEGER,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ShoppingListItem table (new shopping list implementation)
CREATE TABLE "ShoppingListItem" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Other',
  "quantity" FLOAT NOT NULL DEFAULT 1,
  "unit" TEXT NOT NULL DEFAULT 'item',
  "isChecked" BOOLEAN NOT NULL DEFAULT false,
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- =================================================================
-- CREATE INDEXES
-- =================================================================

-- Indexes for ShoppingListItem table
CREATE INDEX idx_shopping_list_items_user_id ON "ShoppingListItem" ("userId");
CREATE INDEX idx_shopping_list_items_category ON "ShoppingListItem" ("category");

-- =================================================================
-- CREATE FUNCTIONS
-- =================================================================

-- Function to get auth user by email (security definer)
CREATE OR REPLACE FUNCTION get_auth_user_by_email(lookup_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::TEXT, u.created_at
  FROM auth.users u
  WHERE u.email = lookup_email;
END;
$$;

-- Function to set default nutrition values for custom recipes
CREATE OR REPLACE FUNCTION trigger_nutrition_estimate()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default values for new nutrition fields if null
  IF NEW."caloriesPerServing" IS NULL THEN
    NEW."caloriesPerServing" := 400;
  END IF;
  
  IF NEW."servings" IS NULL THEN
    NEW."servings" := 4;
  END IF;
  
  IF NEW."totalProtein" IS NULL THEN
    NEW."totalProtein" := 15;
  END IF;
  
  IF NEW."totalCarbs" IS NULL THEN
    NEW."totalCarbs" := 40;
  END IF;
  
  IF NEW."totalFat" IS NULL THEN
    NEW."totalFat" := 20;
  END IF;
  
  -- Legacy nutrition fields
  IF NEW."calories" IS NULL AND NEW."ingredients" IS NOT NULL AND jsonb_array_length(NEW."ingredients") > 0 THEN
    NEW."calories" := 350;
    NEW."protein" := 20;
    NEW."carbs" := 30;
    NEW."fat" := 15;
    NEW."nutritionInfo" := jsonb_build_object(
      'calories', 350,
      'protein', 20,
      'carbs', 30,
      'fat', 15,
      'estimatedValues', true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- CREATE TRIGGERS
-- =================================================================

-- Trigger to automatically set default nutrition values for custom recipes
CREATE TRIGGER set_nutrition_defaults
BEFORE INSERT ON custom_recipes
FOR EACH ROW
EXECUTE FUNCTION trigger_nutrition_estimate();

-- =================================================================
-- NOTE: NO TEST DATA INSERTION
-- =================================================================
-- Test users should be created through Supabase Auth in the Supabase dashboard
-- or through the application's signup flow

-- =================================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- =================================================================

-- Enable RLS for all tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plan_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShoppingListItem" ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- CREATE RLS POLICIES
-- =================================================================

-- RLS for user_preferences table  
CREATE POLICY preferences_self_access ON user_preferences
  USING (userid = auth.uid());

-- RLS for pantry_items table
CREATE POLICY pantry_self_access ON pantry_items
  USING (userid = auth.uid());

-- RLS for recipes table
CREATE POLICY recipes_self_access ON recipes
  USING (userid = auth.uid());

-- RLS for weekly_plans table
CREATE POLICY weekly_plans_self_access ON weekly_plans
  USING (userid = auth.uid());

-- RLS for weekly_plan_recipes table (access through weekly_plans)
CREATE POLICY weekly_plan_recipes_self_access ON weekly_plan_recipes
  USING (EXISTS (
    SELECT 1 FROM weekly_plans wp
    WHERE wp.id = "weeklyPlanId"
    AND wp.userid = auth.uid()
  ));

-- RLS for shopping_list table
CREATE POLICY shopping_list_self_access ON shopping_list
  USING (userid = auth.uid());
  
-- RLS for custom_recipes table
CREATE POLICY custom_recipes_self_access ON custom_recipes
  USING ("userId" = auth.uid());

-- RLS for ShoppingListItem table
CREATE POLICY "Users can view their own shopping list items" ON "ShoppingListItem"
FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert their own shopping list items" ON "ShoppingListItem"
FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own shopping list items" ON "ShoppingListItem"
FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own shopping list items" ON "ShoppingListItem"
FOR DELETE USING (auth.uid() = "userId");

-- =================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- =================================================================

-- Comments on custom_recipes nutrition fields
COMMENT ON COLUMN custom_recipes."servingSize" IS 'Number of servings the recipe makes';
COMMENT ON COLUMN custom_recipes."calories" IS 'Calories per serving';
COMMENT ON COLUMN custom_recipes."protein" IS 'Protein in grams per serving';
COMMENT ON COLUMN custom_recipes."carbs" IS 'Carbohydrates in grams per serving';
COMMENT ON COLUMN custom_recipes."fat" IS 'Fat in grams per serving';
COMMENT ON COLUMN custom_recipes."nutritionInfo" IS 'Additional nutrition information as JSON';
COMMENT ON COLUMN custom_recipes."caloriesPerServing" IS 'Calories per serving (new field)';
COMMENT ON COLUMN custom_recipes."servings" IS 'Number of servings (new field)';
COMMENT ON COLUMN custom_recipes."totalProtein" IS 'Total protein in recipe (new field)';
COMMENT ON COLUMN custom_recipes."totalCarbs" IS 'Total carbs in recipe (new field)';
COMMENT ON COLUMN custom_recipes."totalFat" IS 'Total fat in recipe (new field)';

-- =================================================================
-- VERIFICATION QUERIES
-- =================================================================

-- Verify all tables were created
SELECT 'Tables created successfully:' AS verification;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_preferences', 'pantry_items', 'recipes', 
  'weekly_plans', 'weekly_plan_recipes', 'shopping_list', 
  'custom_recipes', 'ShoppingListItem'
)
ORDER BY table_name;

-- Verify RLS is enabled
SELECT 'RLS enabled on tables:' AS verification;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- Verify auth.users table exists (Supabase Auth)
SELECT 'Supabase Auth users table exists:' AS verification;
SELECT COUNT(*) as user_count FROM auth.users;

-- =================================================================
-- SCHEMA COMPLETE
-- =================================================================
SELECT 'EcoChef-AI database schema setup complete!' AS status;
