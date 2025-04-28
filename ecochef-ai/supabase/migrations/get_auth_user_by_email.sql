-- Create a function to safely query auth.users by email
-- This allows getting the auth user ID without needing direct access to the auth schema
CREATE OR REPLACE FUNCTION get_auth_user_by_email(lookup_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER -- Use the privileges of the function creator
SET search_path = auth, public -- Restrict search path for security
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::TEXT, u.created_at
  FROM auth.users u
  WHERE u.email = lookup_email;
END;
$$; 