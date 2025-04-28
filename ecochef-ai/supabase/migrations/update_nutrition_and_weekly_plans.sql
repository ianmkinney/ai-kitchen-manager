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