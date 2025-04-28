-- Migration to fix shopping list foreign key constraint
-- Change foreign key from auth.users to public.User

BEGIN;

-- First drop the existing foreign key constraint
ALTER TABLE "public"."ShoppingListItem"
DROP CONSTRAINT IF EXISTS "ShoppingListItem_userId_fkey";

-- Enable triggers to make the operation safe
ALTER TABLE "public"."ShoppingListItem" ENABLE TRIGGER ALL;

-- Add the new foreign key constraint to the public.User table
ALTER TABLE "public"."ShoppingListItem"
ADD CONSTRAINT "ShoppingListItem_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "public"."User"("id") 
ON DELETE CASCADE ON UPDATE NO ACTION;

-- Update indexes if needed
DROP INDEX IF EXISTS "public"."idx_shopping_list_items_user_id";
CREATE INDEX "idx_shopping_list_items_user_id" ON "public"."ShoppingListItem" ("userId");

COMMIT; 