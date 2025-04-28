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
    WHEN recipes_to_update."recipeData"->>'servingSize' IS NULL THEN
      jsonb_set(
        recipes_to_update."recipeData", 
        '{servingSize}', 
        '1'::jsonb, 
        true
      )
    ELSE recipes_to_update."recipeData"
  END,
  
  "recipeData" = 
  CASE
    WHEN recipes_to_update."recipeData"->>'calories' IS NULL THEN
      jsonb_set(
        "recipeData", 
        '{calories}', 
        'null'::jsonb, 
        true
      )
    ELSE "recipeData"
  END,
  
  "recipeData" = 
  CASE
    WHEN recipes_to_update."recipeData"->>'protein' IS NULL THEN
      jsonb_set(
        "recipeData", 
        '{protein}', 
        'null'::jsonb, 
        true
      )
    ELSE "recipeData"
  END,
  
  "recipeData" = 
  CASE
    WHEN recipes_to_update."recipeData"->>'carbs' IS NULL THEN
      jsonb_set(
        "recipeData", 
        '{carbs}', 
        'null'::jsonb, 
        true
      )
    ELSE "recipeData"
  END,
  
  "recipeData" = 
  CASE
    WHEN recipes_to_update."recipeData"->>'fat' IS NULL THEN
      jsonb_set(
        "recipeData", 
        '{fat}', 
        'null'::jsonb, 
        true
      )
    ELSE "recipeData"
  END,
  
  "recipeData" = 
  CASE
    WHEN recipes_to_update."recipeData"->>'nutritionInfo' IS NULL THEN
      jsonb_set(
        "recipeData", 
        '{nutritionInfo}', 
        '{}'::jsonb, 
        true
      )
    ELSE "recipeData"
  END
FROM recipes_to_update
WHERE weekly_plan_recipes.id = recipes_to_update.id; 