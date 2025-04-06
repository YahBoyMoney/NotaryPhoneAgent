"""
Supabase Row Level Security Setup Script
----------------------------------------
This script demonstrates how to set up Row Level Security (RLS) in your Supabase database.
It provides examples for common RLS policies for different operations (SELECT, INSERT, UPDATE, DELETE).

Note: This script doesn't execute the SQL directly but shows how to structure your RLS policies.
To apply these policies, you should use the Supabase SQL Editor in your dashboard.
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def print_rls_policy_examples():
    """
    Prints example RLS policies for different scenarios.
    These are ready-to-use SQL statements to implement in your Supabase SQL Editor.
    """
    print("=== Row Level Security Policy Examples ===\n")
    
    # Example 1: Enable RLS on a table
    print("--- Example 1: Enable RLS on a table ---")
    print("""
-- Enable RLS on the table (required)
ALTER TABLE your_table_name ENABLE ROW LEVEL SECURITY;
    """)
    
    # Example 2: Public read access
    print("--- Example 2: Public read access (everyone can view) ---")
    print("""
-- Allow public read access
CREATE POLICY "Public data is viewable by everyone"
ON your_table_name
FOR SELECT
TO anon, authenticated
USING (true);
    """)
    
    # Example 3: User can only see their own data
    print("--- Example 3: User can only view their own data ---")
    print("""
-- Users can only see their own data
CREATE POLICY "Users can view their own data"
ON your_table_name
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);
    """)
    
    # Example 4: User can only insert their own data
    print("--- Example 4: User can only insert their own data ---")
    print("""
-- Users can only insert their own data
CREATE POLICY "Users can insert their own data"
ON your_table_name
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);
    """)
    
    # Example 5: User can only update their own data
    print("--- Example 5: User can only update their own data ---")
    print("""
-- Users can only update their own data
CREATE POLICY "Users can update their own data"
ON your_table_name
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
    """)
    
    # Example 6: User can only delete their own data
    print("--- Example 6: User can only delete their own data ---")
    print("""
-- Users can only delete their own data
CREATE POLICY "Users can delete their own data"
ON your_table_name
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);
    """)
    
    # Example 7: Role-based access
    print("--- Example 7: Role-based access (using app_metadata) ---")
    print("""
-- Only admins can view all data
CREATE POLICY "Admins can view all data"
ON your_table_name
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin'
  OR
  (select auth.uid()) = user_id
);
    """)
    
    # Example 8: Team-based access
    print("--- Example 8: Team-based access ---")
    print("""
-- Users can only access data that belongs to their team
CREATE POLICY "Team members can view their team's data"
ON your_table_name
FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = (select auth.uid())
  )
);
    """)
    
    # Example 9: Complex policy with Security Definer Function (Performance optimized)
    print("--- Example 9: Optimized policy using Security Definer Function ---")
    print("""
-- First, create a security definer function in a non-exposed schema
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.check_user_team_access(team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Will run with creator's permissions (bypasses RLS)
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_members
    WHERE 
      team_members.team_id = check_user_team_access.team_id AND
      user_id = (select auth.uid())
  );
END;
$$;

-- Then use this function in your policy
CREATE POLICY "Optimized team access"
ON your_table_name
FOR SELECT
TO authenticated
USING (
  private.check_user_team_access(team_id)
);
    """)

    # Example 10: RLS performance optimization 
    print("--- Example 10: Performance Optimization Recommendations ---")
    print("""
-- 1. Always add indexes on columns used in RLS policies
CREATE INDEX idx_your_table_user_id ON your_table_name(user_id);

-- 2. Use wrapped SELECT functions for auth functions
-- Instead of: auth.uid() = user_id
-- Use: (SELECT auth.uid()) = user_id

-- 3. Specify roles in your policies
-- Instead of just: USING (condition)
-- Use: TO authenticated USING (condition)

-- 4. When querying tables with RLS from your application, 
-- always include the filters used in RLS to improve performance
-- Example: .from('your_table').select().eq('user_id', user.id)
    """)

def test_connection():
    """Test the Supabase connection"""
    try:
        response = supabase.auth.get_user()
        print("Connected to Supabase!")
        return True
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        return False

if __name__ == "__main__":
    print("== Supabase Row Level Security Setup ==")
    
    if test_connection():
        print("\nYour connection is working. Here are example RLS policies you can implement:")
        print_rls_policy_examples()
        
        print("\n=== How to Apply RLS Policies ===")
        print("1. Go to your Supabase dashboard: https://app.supabase.com")
        print("2. Navigate to the 'SQL Editor'")
        print("3. Copy and paste the appropriate policies above")
        print("4. Modify table names and conditions to match your schema")
        print("5. Execute the SQL statements")
        
        print("\n=== Best Practices ===")
        print("• Always enable RLS on tables in public schema")
        print("• Use (SELECT auth.uid()) instead of auth.uid() for better performance")
        print("• Add indexes to columns used in RLS policies")
        print("• Use security definer functions for complex policies")
        print("• Always specify roles (TO authenticated) in your policies")
    else:
        print("Please check your connection settings in the .env file.") 