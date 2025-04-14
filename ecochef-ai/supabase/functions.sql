-- Helper functions for database management

-- Function to check if another function exists
CREATE OR REPLACE FUNCTION function_exists(function_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pg_proc
    JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
    WHERE pg_proc.proname = function_name
    AND pg_namespace.nspname = 'public'
  );
END;
$$ LANGUAGE plpgsql;

-- Create helper functions for table management
CREATE OR REPLACE FUNCTION create_helper_functions()
RETURNS VOID AS $$
BEGIN
  -- Create check_weekly_plans_table function
  EXECUTE $func$
    CREATE OR REPLACE FUNCTION check_weekly_plans_table()
    RETURNS VOID AS $inner$
    BEGIN
      -- Check if weekly_plans table exists
      IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'weekly_plans'
      ) THEN
        -- Create the weekly_plans table
        CREATE TABLE "weekly_plans" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          plan JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index on user_id for faster lookups
        CREATE INDEX idx_weekly_plans_user_id ON "weekly_plans" (user_id);
        
        -- Add foreign key constraint if possible
        BEGIN
          ALTER TABLE "weekly_plans"
          ADD CONSTRAINT fk_weekly_plans_user
          FOREIGN KEY (user_id)
          REFERENCES "User" (id)
          ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
          -- If User table doesn't exist or has a different structure, ignore
          RAISE NOTICE 'Could not create foreign key constraint: %', SQLERRM;
        END;
      END IF;
    END;
    $inner$ LANGUAGE plpgsql;
  $func$;
  
  -- Create create_weekly_plans_table function (used as a direct way to create the table)
  EXECUTE $func$
    CREATE OR REPLACE FUNCTION create_weekly_plans_table()
    RETURNS VOID AS $inner$
    BEGIN
      -- Drop the table if it exists
      DROP TABLE IF EXISTS "weekly_plans" CASCADE;
      
      -- Create the weekly_plans table
      CREATE TABLE "weekly_plans" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        plan JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Create index on user_id for faster lookups
      CREATE INDEX idx_weekly_plans_user_id ON "weekly_plans" (user_id);
    END;
    $inner$ LANGUAGE plpgsql;
  $func$;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to automatically set updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger to weekly_plans table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'weekly_plans'
  ) THEN
    -- Drop trigger if it exists
    DROP TRIGGER IF EXISTS set_weekly_plans_updated_at ON "weekly_plans";
    
    -- Create trigger
    CREATE TRIGGER set_weekly_plans_updated_at
    BEFORE UPDATE ON "weekly_plans"
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END;
$$; 