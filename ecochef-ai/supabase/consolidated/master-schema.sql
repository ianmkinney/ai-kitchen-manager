-- Drop existing tables if they exist
DROP TABLE IF EXISTS weekly_plan_recipes;
DROP TABLE IF EXISTS weekly_plans;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS custom_recipes;
DROP TABLE IF EXISTS pantry_items;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS shopping_list;
DROP TABLE IF EXISTS "User";

-- Create User table
CREATE TABLE "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID REFERENCES "User"(id) ON DELETE CASCADE,
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
  userid UUID REFERENCES "User"(id) ON DELETE CASCADE,
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
  userid UUID REFERENCES "User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "recipeData" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create weekly_plans table
CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID REFERENCES "User"(id) ON DELETE CASCADE,
  "weekStartDate" DATE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Create shopping_list table
CREATE TABLE shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID REFERENCES "User"(id) ON DELETE CASCADE,
  "itemName" TEXT NOT NULL,
  category TEXT,
  quantity REAL,
  unit TEXT,
  completed BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create custom_recipes table
CREATE TABLE custom_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ingredients JSONB DEFAULT '[]'::JSONB,
  instructions JSONB DEFAULT '[]'::JSONB,
  cuisine TEXT,
  description TEXT,
  difficulty TEXT,
  time TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create test user (for development and testing)
INSERT INTO "User" (id, email, name, password, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'test@ecochef.demo',
  'Test User',
  'password123',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create test user preferences
INSERT INTO user_preferences (
  userid, 
  "isVegetarian", 
  "isVegan", 
  "isGlutenFree", 
  "isDairyFree", 
  "isNutFree",
  "spicyPreference",
  "sweetPreference",
  "savoryPreference",
  "maxCookingTime",
  "cookingSkillLevel",
  "peopleCount",
  cuisine,
  "cuisinePreferences",
  "flavorPreferences",
  "healthGoals",
  "allergies",
  "sustainabilityPreference",
  "nutritionFocus"
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  5,
  5,
  5,
  30,
  'intermediate',
  2,
  'Any',
  '[]'::JSONB,
  '[]'::JSONB,
  '[]'::JSONB,
  '[]'::JSONB,
  'medium',
  '[]'::JSONB
) ON CONFLICT (userid) DO NOTHING;

-- Create RLS policies for all tables to allow access only to the owner of the data

-- RLS for User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_self_access ON "User"
  USING (id = auth.uid() OR id = '00000000-0000-0000-0000-000000000000');

-- RLS for user_preferences table  
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY preferences_self_access ON user_preferences
  USING (userid = auth.uid() OR userid = '00000000-0000-0000-0000-000000000000');

-- RLS for pantry_items table
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY pantry_self_access ON pantry_items
  USING (userid = auth.uid() OR userid = '00000000-0000-0000-0000-000000000000');

-- RLS for recipes table
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY recipes_self_access ON recipes
  USING (userid = auth.uid() OR userid = '00000000-0000-0000-0000-000000000000');

-- RLS for weekly_plans table
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY weekly_plans_self_access ON weekly_plans
  USING (userid = auth.uid() OR userid = '00000000-0000-0000-0000-000000000000');

-- RLS for weekly_plan_recipes table (access through weekly_plans)
ALTER TABLE weekly_plan_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY weekly_plan_recipes_self_access ON weekly_plan_recipes
  USING (EXISTS (
    SELECT 1 FROM weekly_plans wp
    WHERE wp.id = "weeklyPlanId"
    AND (wp.userid = auth.uid() OR wp.userid = '00000000-0000-0000-0000-000000000000')
  ));

-- RLS for shopping_list table
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY shopping_list_self_access ON shopping_list
  USING (userid = auth.uid() OR userid = '00000000-0000-0000-0000-000000000000');
  
-- RLS for custom_recipes table
ALTER TABLE custom_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY custom_recipes_self_access ON custom_recipes
  USING ("userId" = auth.uid() OR "userId" = '00000000-0000-0000-0000-000000000000');