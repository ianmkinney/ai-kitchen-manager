-- Database initialization functions for Supabase

-- Function to create User table if it doesn't exist
CREATE OR REPLACE FUNCTION create_user_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'User'
  ) THEN
    -- Create the User table
    CREATE TABLE "User" (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create updated_at trigger
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON "User"
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create UserPreferences table if it doesn't exist
CREATE OR REPLACE FUNCTION create_preferences_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'UserPreferences'
  ) THEN
    -- Create the UserPreferences table
    CREATE TABLE "UserPreferences" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE NOT NULL,
      
      -- Dietary restrictions
      is_vegetarian BOOLEAN DEFAULT FALSE,
      is_vegan BOOLEAN DEFAULT FALSE,
      is_gluten_free BOOLEAN DEFAULT FALSE,
      is_dairy_free BOOLEAN DEFAULT FALSE,
      is_nut_free BOOLEAN DEFAULT FALSE,
      
      -- Flavor preferences (1-10 scale)
      spicy_preference INTEGER DEFAULT 5,
      sweet_preference INTEGER DEFAULT 5,
      savory_preference INTEGER DEFAULT 5,
      
      -- Cooking preferences
      max_cooking_time INTEGER,
      cooking_skill_level TEXT DEFAULT 'intermediate',
      
      -- Other preferences
      calorie_target INTEGER,
      protein_target INTEGER,
      carb_target INTEGER,
      fat_target INTEGER,
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES "User" (id)
        ON DELETE CASCADE
    );

    -- Create updated_at trigger
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON "UserPreferences"
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create PantryItem table if it doesn't exist
CREATE OR REPLACE FUNCTION create_pantry_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'PantryItem'
  ) THEN
    -- Create the PantryItem table
    CREATE TABLE "PantryItem" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity FLOAT DEFAULT 1,
      unit TEXT DEFAULT 'item',
      expiration TIMESTAMP WITH TIME ZONE,
      user_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES "User" (id)
        ON DELETE CASCADE
    );

    -- Create updated_at trigger
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON "PantryItem"
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create ShoppingListItem table if it doesn't exist
CREATE OR REPLACE FUNCTION create_shopping_list_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'ShoppingListItem'
  ) THEN
    -- Create the ShoppingListItem table
    CREATE TABLE "ShoppingListItem" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Other',
      quantity FLOAT DEFAULT 1,
      unit TEXT DEFAULT 'item',
      is_checked BOOLEAN DEFAULT FALSE,
      user_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES "User" (id)
        ON DELETE CASCADE
    );

    -- Create updated_at trigger
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON "ShoppingListItem"
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Allow access through RLS (Row Level Security)
CREATE OR REPLACE FUNCTION setup_row_level_security()
RETURNS void AS $$
BEGIN
  -- Enable RLS on User table
  ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
  
  -- Create policy for User table
  CREATE POLICY "Users can view and edit their own data"
  ON "User"
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
  
  -- Enable RLS on UserPreferences table
  ALTER TABLE "UserPreferences" ENABLE ROW LEVEL SECURITY;
  
  -- Create policy for UserPreferences table
  CREATE POLICY "Users can view and edit their own preferences"
  ON "UserPreferences"
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
  
  -- Enable RLS on PantryItem table
  ALTER TABLE "PantryItem" ENABLE ROW LEVEL SECURITY;
  
  -- Create policy for PantryItem table
  CREATE POLICY "Users can view and edit their own pantry items"
  ON "PantryItem"
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
  
  -- Enable RLS on ShoppingListItem table
  ALTER TABLE "ShoppingListItem" ENABLE ROW LEVEL SECURITY;
  
  -- Create policy for ShoppingListItem table
  CREATE POLICY "Users can view and edit their own shopping list items"
  ON "ShoppingListItem"
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
END;
$$ LANGUAGE plpgsql;

-- Main function to run all setup
CREATE OR REPLACE FUNCTION setup_database()
RETURNS void AS $$
BEGIN
  PERFORM create_user_table_if_not_exists();
  PERFORM create_preferences_table_if_not_exists();
  PERFORM create_pantry_table_if_not_exists();
  PERFORM create_shopping_list_table_if_not_exists();
  PERFORM setup_row_level_security();
END;
$$ LANGUAGE plpgsql; 