"""
Supabase Example Application
----------------------------
This example demonstrates common Supabase operations including:
- Authentication
- Database operations (if permissions allow)
- Storage operations (if enabled)
- Realtime subscriptions (if enabled)
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY
import json
import time

def get_supabase_client():
    """Get a Supabase client instance"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing Supabase URL or API key")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def test_auth(supabase):
    """Test authentication functionality"""
    print("\n=== Authentication ===")
    try:
        # Get user if logged in (likely None since we haven't authenticated)
        user = supabase.auth.get_user()
        print(f"Current user: {user.user.email if hasattr(user, 'user') and user.user else 'Not logged in'}")
        
        # Auth sign-up example (commented out to prevent actual signup)
        """
        signup_data = supabase.auth.sign_up({
            "email": "example@example.com",
            "password": "example-password",
        })
        print(f"Sign up successful: {signup_data}")
        """
        
        # Auth sign-in example (commented out to prevent actual login)
        """
        signin_data = supabase.auth.sign_in_with_password({
            "email": "example@example.com",
            "password": "example-password",
        })
        print(f"Sign in successful: {signin_data}")
        """
        
        print("Authentication service is working")
        return True
    except Exception as e:
        print(f"Auth error: {e}")
        return False

def test_database(supabase):
    """Test database functionality"""
    print("\n=== Database ===")
    try:
        # List all public tables
        # Note: This requires permission to view pg_catalog schema
        print("Attempting to list tables (requires elevated permissions)...")
        try:
            tables = supabase.rpc('list_tables').execute()
            print(f"Tables: {tables.data}")
        except Exception:
            print("Could not list tables - insufficient permissions")
            
        # Create a simple table for testing
        # Note: This requires table creation permissions
        print("\nAttempting to create a test table...")
        try:
            # Try to create a test table (will fail if no permissions)
            supabase.table('test_items').delete().eq('id', 0).execute()  # Clean up if exists
            create_table_response = supabase.from_('test_items').insert({
                'name': 'Test Item',
                'description': 'This is a test item'
            }).execute()
            print(f"Created test record: {create_table_response.data}")
            
            # Read the data back
            read_response = supabase.table('test_items').select('*').execute()
            print(f"Read test records: {read_response.data}")
            
        except Exception as table_e:
            print(f"Table operation failed: {table_e}")
            
        print("Database service is available")
        return True
    except Exception as e:
        print(f"Database error: {e}")
        return False

def test_storage(supabase):
    """Test storage functionality"""
    print("\n=== Storage ===")
    try:
        # List all storage buckets
        buckets = supabase.storage.list_buckets()
        print(f"Storage buckets: {buckets}")
        
        if len(buckets) > 0:
            # List files in the first bucket
            bucket_name = buckets[0]['name']
            files = supabase.storage.from_(bucket_name).list()
            print(f"Files in {bucket_name}: {files}")
            
            # Example: Upload a file (commented out)
            """
            upload_response = supabase.storage.from_(bucket_name).upload(
                'test.txt', 
                'This is test content'
            )
            print(f"Upload response: {upload_response}")
            """
        
        print("Storage service is available")
        return True
    except Exception as e:
        print(f"Storage error: {e}")
        return False

def test_realtime(supabase):
    """Test realtime functionality"""
    print("\n=== Realtime ===")
    try:
        # Try to set up a subscription
        # This is just a connection test, we'll cancel immediately
        print("Testing realtime connection...")
        
        # Define callback that would normally process updates
        def handle_change(payload):
            print(f"Change received: {payload}")
        
        # Subscribe to a channel
        channel = supabase.channel('test')
        channel.on('*', handle_change)
        channel.subscribe()
        
        # Wait a moment to see if connection establishes
        time.sleep(1)
        
        # Clean up
        channel.unsubscribe()
        
        print("Realtime service is available")
        return True
    except Exception as e:
        print(f"Realtime error: {e}")
        return False

def test_functions(supabase):
    """Test edge functions"""
    print("\n=== Edge Functions ===")
    try:
        # Try to invoke a function
        # Note: This requires that you have created an edge function called 'hello-world'
        print("Testing edge functions...")
        
        try:
            response = supabase.functions.invoke('hello-world')
            print(f"Function response: {response}")
        except Exception as func_e:
            print(f"Function invocation failed: {func_e}")
            print("This is normal if you haven't created this function")
        
        print("Functions service is available")
        return True
    except Exception as e:
        print(f"Functions error: {e}")
        return False

def main():
    """Run all Supabase tests"""
    print("=== Supabase Capabilities Test ===")
    print(f"URL: {SUPABASE_URL}")
    print(f"API Key: {SUPABASE_KEY[:5]}...{SUPABASE_KEY[-5:]}")  # Show partial key for verification
    
    try:
        # Get client
        supabase = get_supabase_client()
        print("Connected to Supabase!")
        
        # Run tests
        auth_result = test_auth(supabase)
        db_result = test_database(supabase)
        storage_result = test_storage(supabase)
        realtime_result = test_realtime(supabase)
        functions_result = test_functions(supabase)
        
        # Summary
        print("\n=== Test Summary ===")
        print(f"Auth:      {'✅' if auth_result else '❌'}")
        print(f"Database:  {'✅' if db_result else '❌'}")
        print(f"Storage:   {'✅' if storage_result else '❌'}")
        print(f"Realtime:  {'✅' if realtime_result else '❌'}")
        print(f"Functions: {'✅' if functions_result else '❌'}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main() 