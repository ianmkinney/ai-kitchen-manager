-- COMBINED MIGRATION SCRIPT FOR ECOCHEF-AI
-- This single file contains all migration steps to update the database schema.
-- Use this in the Supabase UI SQL Editor instead of trying to run multiple files.

BEGIN;

-- =========================================================
-- 1. UPDATE TABLES WITH NEW COLUMNS AND CONSTRAINTS
-- =========================================================

-- Update weekly_plans table to add unique constraint
-- First check if the constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'weekly_plans_userid_weekstartdate_key' 
    AND conrelid = 'weekly_plans'::regclass
  ) THEN
    ALTER TABLE weekly_plans ADD CONSTRAINT weekly_plans_userid_weekstartdate_key UNIQUE(userid, "weekStartDate");
  END IF;
END
$$;

-- Create index for faster date-based lookups
-- First check if the index already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_weekly_plans_week_start_date'
  ) THEN
    CREATE INDEX idx_weekly_plans_week_start_date ON weekly_plans("weekStartDate");
  END IF;
END
$$;

-- Add nutrition fields to custom_recipes table
-- First check if columns exist before adding them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_recipes' AND column_name = 'servingsize'
  ) THEN
    ALTER TABLE custom_recipes ADD COLUMN "servingSize" INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_recipes' AND column_name = 'calories'
  ) THEN
    ALTER TABLE custom_recipes ADD COLUMN "calories" INTEGER;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_recipes' AND column_name = 'protein'
  ) THEN
    ALTER TABLE custom_recipes ADD COLUMN "protein" REAL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_recipes' AND column_name = 'carbs'
  ) THEN
    ALTER TABLE custom_recipes ADD COLUMN "carbs" REAL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_recipes' AND column_name = 'fat'
  ) THEN
    ALTER TABLE custom_recipes ADD COLUMN "fat" REAL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_recipes' AND column_name = 'nutritioninfo'
  ) THEN
    ALTER TABLE custom_recipes ADD COLUMN "nutritionInfo" JSONB DEFAULT '{}'::JSONB;
  END IF;
END
$$;

-- Comment on the new fields
COMMENT ON COLUMN custom_recipes."servingSize" IS 'Number of servings the recipe makes';
COMMENT ON COLUMN custom_recipes."calories" IS 'Calories per serving';
COMMENT ON COLUMN custom_recipes."protein" IS 'Protein in grams per serving';
COMMENT ON COLUMN custom_recipes."carbs" IS 'Carbohydrates in grams per serving';
COMMENT ON COLUMN custom_recipes."fat" IS 'Fat in grams per serving';
COMMENT ON COLUMN custom_recipes."nutritionInfo" IS 'Additional nutrition information as JSON';

-- =========================================================
-- 2. UPDATE EXISTING RECIPES WITH NUTRITION FIELDS
-- =========================================================

-- Update existing recipes in the weekly_plan_recipes table to include nutrition fields
WITH recipes_to_update AS (
  SELECT id, "recipeData" 
  FROM weekly_plan_recipes
  WHERE "recipeData" IS NOT NULL
)
UPDATE weekly_plan_recipes
SET "recipeData" = 
  CASE
    WHEN recipes_to_update."recipeData" IS NOT NULL THEN
      recipes_to_update."recipeData" || 
      jsonb_build_object(
        'servingSize', COALESCE(recipes_to_update."recipeData"->>'servingSize', '1'),
        'calories', COALESCE(recipes_to_update."recipeData"->>'calories', null),
        'protein', COALESCE(recipes_to_update."recipeData"->>'protein', null),
        'carbs', COALESCE(recipes_to_update."recipeData"->>'carbs', null),
        'fat', COALESCE(recipes_to_update."recipeData"->>'fat', null),
        'nutritionInfo', COALESCE(recipes_to_update."recipeData"->'nutritionInfo', '{}'::jsonb)
      )
    ELSE recipes_to_update."recipeData"
  END
FROM recipes_to_update
WHERE weekly_plan_recipes.id = recipes_to_update.id;

-- =========================================================
-- 3. SET DEFAULT NUTRITION VALUES FOR EXISTING RECIPES
-- =========================================================

-- For custom recipes with null nutrition values, set basic estimates
UPDATE custom_recipes
SET 
  "calories" = 350,
  "protein" = 20,
  "carbs" = 30,
  "fat" = 15,
  "nutritionInfo" = jsonb_build_object(
    'calories', 350,
    'protein', 20,
    'carbs', 30,
    'fat', 15,
    'estimatedValues', true
  )
WHERE 
  "calories" IS NULL 
  AND "ingredients" IS NOT NULL 
  AND jsonb_array_length("ingredients") > 0;

-- Create a function to run the migration
CREATE OR REPLACE FUNCTION trigger_nutrition_estimate() RETURNS TRIGGER AS $$
BEGIN
  -- Only set default values if nutrition fields are null and ingredients exist
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

-- Create a trigger to automatically set default nutrition values for new recipes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_default_nutrition' 
    AND tgrelid = 'custom_recipes'::regclass
  ) THEN
    CREATE TRIGGER set_default_nutrition
    BEFORE INSERT OR UPDATE ON custom_recipes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_nutrition_estimate();
  END IF;
END
$$;

-- =========================================================
-- ALL DONE, COMMIT CHANGES
-- =========================================================

COMMIT;

-- Verification queries to check the changes
SELECT 'Weekly plans table check:' AS check_name;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'weekly_plans' 
ORDER BY ordinal_position;

SELECT 'Weekly plans constraints check:' AS check_name;
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'weekly_plans'::regclass;

SELECT 'Custom recipes table check:' AS check_name;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'custom_recipes' 
ORDER BY ordinal_position;

-- Add caloriesPerServing and servings fields to custom recipes
ALTER TABLE "public"."custom_recipes" 
  ADD COLUMN IF NOT EXISTS "caloriesPerServing" INTEGER,
  ADD COLUMN IF NOT EXISTS "servings" INTEGER,
  ADD COLUMN IF NOT EXISTS "totalProtein" INTEGER,
  ADD COLUMN IF NOT EXISTS "totalCarbs" INTEGER,
  ADD COLUMN IF NOT EXISTS "totalFat" INTEGER;

-- Add nutritionSummary field to weekly_plans
ALTER TABLE "public"."weekly_plans" 
  ADD COLUMN IF NOT EXISTS "nutritionSummary" JSONB DEFAULT '{}'::jsonb;

-- Update existing recipes to include nutrition fields with default data
UPDATE "public"."weekly_plan_recipes"
SET "recipeData" = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          "recipeData",
          '{caloriesPerServing}',
          '400'::jsonb,
          true
        ),
        '{servings}',
        '4'::jsonb,
        true
      ),
      '{totalProtein}',
      '15'::jsonb,
      true
    ),
    '{totalCarbs}',
    '40'::jsonb,
    true
  ),
  '{totalFat}',
  '20'::jsonb,
  true
)
WHERE NOT ("recipeData"::jsonb ? 'caloriesPerServing');

-- Set default values for custom recipes
UPDATE "public"."custom_recipes"
SET 
  "caloriesPerServing" = 400,
  "servings" = 4,
  "totalProtein" = 15,
  "totalCarbs" = 40,
  "totalFat" = 20
WHERE "caloriesPerServing" IS NULL;

-- Create function to set default nutrition values for new recipes
CREATE OR REPLACE FUNCTION trigger_nutrition_estimate()
RETURNS TRIGGER AS $$
BEGIN
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set default nutrition values
DROP TRIGGER IF EXISTS set_nutrition_defaults ON "public"."custom_recipes";
CREATE TRIGGER set_nutrition_defaults
BEFORE INSERT ON "public"."custom_recipes"
FOR EACH ROW
EXECUTE FUNCTION trigger_nutrition_estimate();

-- Create ShoppingListItem table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."ShoppingListItem" (
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

-- Create indexes for ShoppingListItem table
CREATE INDEX IF NOT EXISTS "idx_shopping_list_items_user_id" ON "public"."ShoppingListItem" ("userId");
CREATE INDEX IF NOT EXISTS "idx_shopping_list_items_category" ON "public"."ShoppingListItem" ("category");

-- Enable row level security
ALTER TABLE "public"."ShoppingListItem" ENABLE ROW LEVEL SECURITY;

-- Create policies for ShoppingListItem table
CREATE POLICY "Users can view their own shopping list items" ON "public"."ShoppingListItem"
FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert their own shopping list items" ON "public"."ShoppingListItem"
FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own shopping list items" ON "public"."ShoppingListItem"
FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own shopping list items" ON "public"."ShoppingListItem"
FOR DELETE USING (auth.uid() = "userId");

-- Verify the changes were made
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'custom_recipes' 
AND column_name IN ('caloriesPerServing', 'servings', 'totalProtein', 'totalCarbs', 'totalFat');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'weekly_plans' 
AND column_name = 'nutritionSummary';

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'ShoppingListItem';

COMMIT; 