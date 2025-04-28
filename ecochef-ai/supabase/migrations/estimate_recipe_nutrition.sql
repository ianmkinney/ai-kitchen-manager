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