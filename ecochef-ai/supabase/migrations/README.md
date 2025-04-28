# Database Migration for EcoChef-AI

This directory contains migration scripts to update the EcoChef-AI database schema without dropping tables. These updates add nutritional information support and improve weekly meal planning.

## Migration Files

- `update_nutrition_and_weekly_plans.sql`: Adds nutrition fields to the custom_recipes table and constraints to weekly_plans
- `update_weekly_plan_recipes.sql`: Updates existing recipe data in weekly_plan_recipes to include nutrition fields
- `estimate_recipe_nutrition.sql`: Sets default nutrition values for existing recipes and creates a trigger for new recipes
- `run_all_updates.sql`: Master script that runs all migrations in the correct order
- `combined_migration.sql`: **RECOMMENDED** - Single file containing all migrations combined for easy execution

## How to Run the Migration

### Option 1: Using the Combined Migration File (Easiest)

1. Navigate to the Supabase dashboard for your project
2. Go to the SQL Editor
3. Create a new query
4. Copy and paste the entire contents of `combined_migration.sql`
5. Click "Run" to execute all migrations at once

This is the simplest approach as it contains all migration steps in a single file.

### Option 2: Using the Supabase UI (Manual Approach)

If the combined migration file is too large, you can run each script separately:

1. Navigate to the Supabase dashboard for your project
2. Go to the SQL Editor
3. Create a new query
4. Copy and paste each of the migration scripts separately in this order:
   - First run: `update_nutrition_and_weekly_plans.sql`
   - Then run: `update_weekly_plan_recipes.sql`
   - Finally run: `estimate_recipe_nutrition.sql`
5. Click "Run" after pasting each script

### Option 3: Using psql

If you have PostgreSQL client installed:

```bash
# Connect to your database
psql -h your-db-host -p 5432 -U postgres -d postgres

# Run the combined migration script
\i combined_migration.sql

# Or run each script manually
\i update_nutrition_and_weekly_plans.sql
\i update_weekly_plan_recipes.sql
\i estimate_recipe_nutrition.sql
```

## Migration Details

### New Fields Added

The migration adds the following fields to the `custom_recipes` table:

- `servingSize`: Number of servings the recipe makes (INTEGER)
- `calories`: Calories per serving (INTEGER)
- `protein`: Protein in grams per serving (REAL)
- `carbs`: Carbohydrates in grams per serving (REAL)
- `fat`: Fat in grams per serving (REAL)
- `nutritionInfo`: Additional nutrition information as JSON (JSONB)

### Weekly Plan Improvements

The migration also adds the following to the `weekly_plans` table:

- A unique constraint on `(userid, "weekStartDate")` to prevent duplicate plans for the same week
- An index on `"weekStartDate"` for faster date-based lookups

### Data Migration

Existing recipes in both `custom_recipes` and `weekly_plan_recipes` tables will be updated with:

- Default values for nutrition fields
- A JSON structure for detailed nutrition information
- A flag indicating that the nutrition values are estimated

A new trigger `set_default_nutrition` is also created to automatically set default nutrition values for new recipes. 