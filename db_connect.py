from supabase import create_client, Client
import psycopg2
from config import DATABASE_URL, SUPABASE_URL, SUPABASE_KEY

def connect_to_database():
    """Connect directly to PostgreSQL database using connection string from environment variable"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("Database connection established successfully!")
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def connect_to_supabase():
    """Connect to Supabase using environment variables"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Missing Supabase URL or key in environment variables")
        return None
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Connected to Supabase successfully!")
        return supabase
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        return None

if __name__ == "__main__":
    # Example: Connect to database directly
    print("Trying to connect to PostgreSQL directly...")
    db_conn = connect_to_database()
    if db_conn:
        # Create a cursor and execute a simple query
        cursor = db_conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"PostgreSQL version: {version[0]}")
        cursor.close()
        db_conn.close()
    
    # Example: Connect to Supabase
    print("\nTrying to connect to Supabase...")
    supabase_client = connect_to_supabase()
    if supabase_client:
        # Example query using Supabase client
        try:
            # Check if we can access the system schema
            response = supabase_client.table('pg_tables').select('schemaname,tablename').eq('schemaname', 'public').execute()
            
            if response.data:
                print("\nPublic tables in your database:")
                for table in response.data:
                    print(f"- {table['tablename']}")
            else:
                print("No public tables found or insufficient permissions.")
                
            # Try a simple system query as a fallback
            print("\nTesting basic Supabase functionality:")
            try:
                health_check = supabase_client.functions.invoke("health-check")
                print(f"Functions API status: {'Available' if health_check else 'Unavailable'}")
            except Exception as func_e:
                print(f"Functions API error: {func_e}")
            
        except Exception as e:
            print(f"Error querying Supabase: {e}")
            print("\nFallback: Testing authentication functionality...")
            try:
                # Test if auth service is working
                auth_response = supabase_client.auth.get_user()
                print("Auth service is working")
            except Exception as auth_e:
                print(f"Auth service error: {auth_e}") 