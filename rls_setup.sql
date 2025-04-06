-- =========================================
-- Supabase Row Level Security Setup 
-- =========================================
-- This SQL file contains examples of Row Level Security (RLS) policies
-- Run this in your Supabase SQL Editor after adjusting table names

-- =========================================
-- 1. Create a schema for private functions
-- =========================================
CREATE SCHEMA IF NOT EXISTS private;

-- =========================================
-- 2. Enable RLS on your tables
-- =========================================
-- Replace 'your_table_name' with your actual table names
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 3. Create RLS Policies
-- =========================================

-- Example A: Users table policies
-- -------------------------------

-- A1: Anyone can sign up (handled by Supabase Auth)

-- A2: Users can read their own data
CREATE POLICY "Users can view own data"
ON users
FOR SELECT
TO authenticated
USING ((select auth.uid()) = id);

-- A3: Users can update their own data
CREATE POLICY "Users can update own data"
ON users
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- A4: Users cannot delete their accounts (handled through API)

-- Example B: Posts table policies
-- ------------------------------
/*
-- B1: Everyone can view published posts
CREATE POLICY "Anyone can view published posts"
ON posts
FOR SELECT
TO anon, authenticated
USING (published = true);

-- B2: Users can view their own unpublished posts
CREATE POLICY "Users can view their own unpublished posts"
ON posts
FOR SELECT
TO authenticated
USING (
  ((select auth.uid()) = author_id) AND (published = false)
);

-- B3: Users can insert their own posts
CREATE POLICY "Users can create their own posts"
ON posts
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = author_id);

-- B4: Users can update their own posts
CREATE POLICY "Users can update their own posts"
ON posts
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = author_id)
WITH CHECK ((select auth.uid()) = author_id);

-- B5: Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
ON posts
FOR DELETE
TO authenticated
USING ((select auth.uid()) = author_id);

-- B6: Admins can do anything with posts
CREATE POLICY "Admins have full access to posts"
ON posts
FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin'
);
*/

-- Example C: Performance optimizations
-- -----------------------------------

-- C1: Create indexes for columns used in RLS policies
-- CREATE INDEX idx_posts_author_id ON posts(author_id);
-- CREATE INDEX idx_comments_user_id ON comments(user_id);
-- CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- C2: Create a security definer function for complex permission checks
/*
CREATE OR REPLACE FUNCTION private.is_team_member(team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Will run with creator's permissions (bypasses RLS)
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_members
    WHERE 
      team_members.team_id = is_team_member.team_id AND
      user_id = (select auth.uid())
  );
END;
$$;

-- Then use this in a policy
CREATE POLICY "Team members can access team content"
ON team_content
FOR SELECT
TO authenticated
USING (
  private.is_team_member(team_id)
);
*/

-- =========================================
-- 4. Test your policies
-- =========================================
/*
-- Test your policies with different users:
-- 1. Create test users in Auth
-- 2. Generate JWTs for these users
-- 3. Run queries like:

-- As anonymous:
SET request.jwt.claim.role = 'anon';
SELECT * FROM posts;

-- As authenticated user (replace with actual user id):
SET request.jwt.claim.sub = '54f30a9c-5c1a-4883-a620-709fe6379b90';
SET request.jwt.claim.role = 'authenticated';
SELECT * FROM posts;

-- As admin:
SET request.jwt.claim.sub = 'admin-user-id';
SET request.jwt.claim.role = 'authenticated'; 
SET request.jwt.claim.app_metadata = '{"role": "admin"}';
SELECT * FROM posts;
*/

-- =========================================
-- 5. Troubleshooting RLS
-- =========================================
/*
-- If policies aren't working as expected, try:

-- 1. Check what policies exist on a table:
SELECT * FROM pg_policies WHERE tablename = 'your_table_name';

-- 2. Verify RLS is enabled:
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'your_table_name';

-- 3. Use service role to bypass RLS and debug data:
-- This should be done only in development
*/ 