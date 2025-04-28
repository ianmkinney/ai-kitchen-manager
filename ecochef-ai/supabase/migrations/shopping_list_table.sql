-- SHOPPING LIST TABLE MIGRATION
-- This script only adds the ShoppingListItem table without modifying existing tables

BEGIN;

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
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'ShoppingListItem';

COMMIT; 