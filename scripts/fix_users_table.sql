-- Final SQL Patch: Sync users table with registration API requirements
-- Adds age and minor protection tracking

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT FALSE;

-- Force schema clean
ANALYZE users;
