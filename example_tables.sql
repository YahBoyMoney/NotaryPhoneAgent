-- =============================================
-- Supabase RLS Example - Table Definitions
-- =============================================
-- This SQL script sets up the tables needed for the Supabase RLS example
-- Run this in your Supabase SQL Editor to create the necessary tables

-- Create a private schema for security definer functions
CREATE SCHEMA IF NOT EXISTS private;

-- =============================================
-- Create tables
-- =============================================

-- Profiles table: Stores user profile information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_id_unique UNIQUE (user_id)
);

-- Posts table: Stores user posts with public/private visibility
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES auth.users NOT NULL,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table: Stores comments on posts
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team table: Basic team structure for demonstrating team-based policies
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table: Maps users to teams
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT team_user_unique UNIQUE (team_id, user_id)
);

-- Team resources: Content accessible only by team members
CREATE TABLE IF NOT EXISTS team_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Indexes for RLS optimization
-- =============================================
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts(author_id);
CREATE INDEX IF NOT EXISTS posts_published_idx ON posts(published);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON team_members(user_id);
CREATE INDEX IF NOT EXISTS team_resources_team_id_idx ON team_resources(team_id);

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_resources ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Profile RLS Policies
-- =============================================

-- Users can read their own profiles
CREATE POLICY "Users can view their own profiles"
ON profiles
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- Users can create their own profiles
CREATE POLICY "Users can create their own profiles"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- Users can update their own profiles
CREATE POLICY "Users can update their own profiles"
ON profiles
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- =============================================
-- Posts RLS Policies
-- =============================================

-- Anyone can view public posts
CREATE POLICY "Anyone can view public posts"
ON posts
FOR SELECT
TO anon, authenticated
USING (published = true);

-- Users can view their own private posts
CREATE POLICY "Users can view their own private posts"
ON posts
FOR SELECT
TO authenticated
USING (
  ((select auth.uid()) = author_id) AND (published = false)
);

-- Users can create their own posts
CREATE POLICY "Users can create their own posts"
ON posts
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
ON posts
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = author_id)
WITH CHECK ((select auth.uid()) = author_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
ON posts
FOR DELETE
TO authenticated
USING ((select auth.uid()) = author_id);

-- =============================================
-- Comments RLS Policies
-- =============================================

-- Anyone can view comments on public posts
CREATE POLICY "Anyone can view comments on public posts"
ON comments
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE comments.post_id = posts.id AND posts.published = true
  )
);

-- Users can view comments on their own private posts
CREATE POLICY "Users can view comments on their own private posts"
ON comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE 
      comments.post_id = posts.id AND 
      posts.published = false AND
      posts.author_id = (select auth.uid())
  )
);

-- Authenticated users can add comments to public posts
CREATE POLICY "Users can comment on public posts"
ON comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts
    WHERE comments.post_id = posts.id AND posts.published = true
  ) AND (select auth.uid()) = user_id
);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
ON comments
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- =============================================
-- Team RLS Policies
-- =============================================

-- Create a security definer function to check team membership
CREATE OR REPLACE FUNCTION private.is_team_member(team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = is_team_member.team_id
    AND user_id = (select auth.uid())
  );
END;
$$;

-- Create a security definer function to check team admin status
CREATE OR REPLACE FUNCTION private.is_team_admin(team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = is_team_admin.team_id
    AND user_id = (select auth.uid())
    AND is_admin = true
  );
END;
$$;

-- Users can view teams they belong to
CREATE POLICY "Users can view their teams"
ON teams
FOR SELECT
TO authenticated
USING (
  private.is_team_member(id)
);

-- Users can create teams
CREATE POLICY "Users can create teams"
ON teams
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = created_by);

-- Only team admins can update team details
CREATE POLICY "Team admins can update team"
ON teams
FOR UPDATE
TO authenticated
USING (
  private.is_team_admin(id)
);

-- Team creator can delete team
CREATE POLICY "Team creator can delete team"
ON teams
FOR DELETE
TO authenticated
USING ((select auth.uid()) = created_by);

-- Team membership visibility
CREATE POLICY "Users can see team members of their teams"
ON team_members
FOR SELECT
TO authenticated
USING (
  private.is_team_member(team_id)
);

-- Team admins can add members
CREATE POLICY "Team admins can add members"
ON team_members
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_team_admin(team_id)
);

-- Team admins can remove members
CREATE POLICY "Team admins can remove members"
ON team_members
FOR DELETE
TO authenticated
USING (
  private.is_team_admin(team_id)
);

-- Team resources policies
CREATE POLICY "Team members can view team resources"
ON team_resources
FOR SELECT
TO authenticated
USING (
  private.is_team_member(team_id)
);

CREATE POLICY "Team admins can create resources"
ON team_resources
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_team_admin(team_id)
);

CREATE POLICY "Team admins can update resources"
ON team_resources
FOR UPDATE
TO authenticated
USING (
  private.is_team_admin(team_id)
)
WITH CHECK (
  private.is_team_admin(team_id)
);

CREATE POLICY "Team admins can delete resources"
ON team_resources
FOR DELETE
TO authenticated
USING (
  private.is_team_admin(team_id)
);

-- =============================================
-- Triggers for updated_at timestamps
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to tables with updated_at
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER team_resources_updated_at
BEFORE UPDATE ON team_resources
FOR EACH ROW EXECUTE FUNCTION update_timestamp(); 