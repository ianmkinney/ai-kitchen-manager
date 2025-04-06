-- This function allows executing arbitrary SQL from the application
-- You need to run this in the Supabase SQL editor before the application can initialize tables

-- Create the exec_sql function (requires superuser privileges)
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 