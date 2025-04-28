-- Database update script for EcoChef-AI
-- This script updates the database schema to add nutritional information
-- and improve weekly meal planning without dropping existing tables

-- NOTE: When running this in the Supabase UI, you'll need to replace the \i commands
-- with the actual contents of each file or run the scripts separately.

BEGIN;

-- 1. Update tables with new columns and constraints
-- Replace this with the contents of update_nutrition_and_weekly_plans.sql or run separately
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

-- 2. Update existing recipes with nutrition fields
-- Replace this with the contents of update_weekly_plan_recipes.sql or run separately
-- Update existing recipes in the weekly_plan_recipes table to include nutrition fields
-- This script will update the JSONB structure of the recipeData column 
-- to include empty nutrition fields if they don't exist

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

-- 3. Set default nutrition values for existing recipes
-- Replace this with the contents of estimate_recipe_nutrition.sql or run separately
-- Set default estimated nutrition values for existing recipes
-- This is a best-effort estimation to provide some initial values

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

-- All done, commit the changes
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

-- End of update script 