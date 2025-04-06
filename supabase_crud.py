"""
Supabase CRUD Operations Example
--------------------------------
This script demonstrates how to perform basic CRUD operations
with Supabase. Before using this, create a table in your Supabase
dashboard with the following structure:

Table name: 'todos'
Columns:
- id: integer (primary key)
- task: text
- completed: boolean
- created_at: timestamp with time zone (default: now())
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY
import time
from datetime import datetime

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_todo(task):
    """Create a new todo item"""
    try:
        response = supabase.table('todos').insert({
            'task': task,
            'completed': False
        }).execute()
        
        if response.data:
            print(f"Created todo: {response.data[0]}")
            return response.data[0]
        else:
            print("Error: No data returned")
            return None
    except Exception as e:
        print(f"Error creating todo: {e}")
        return None

def read_todos():
    """Read all todos"""
    try:
        response = supabase.table('todos').select('*').order('created_at', desc=True).execute()
        
        if response.data:
            print(f"Found {len(response.data)} todos")
            for todo in response.data:
                status = "✅" if todo['completed'] else "❌"
                print(f"{todo['id']}: {status} {todo['task']}")
            return response.data
        else:
            print("No todos found")
            return []
    except Exception as e:
        print(f"Error reading todos: {e}")
        return []

def read_todo(id):
    """Read a specific todo by ID"""
    try:
        response = supabase.table('todos').select('*').eq('id', id).execute()
        
        if response.data and len(response.data) > 0:
            print(f"Found todo: {response.data[0]}")
            return response.data[0]
        else:
            print(f"Todo with ID {id} not found")
            return None
    except Exception as e:
        print(f"Error reading todo: {e}")
        return None

def update_todo(id, updates):
    """Update a todo item"""
    try:
        response = supabase.table('todos').update(updates).eq('id', id).execute()
        
        if response.data and len(response.data) > 0:
            print(f"Updated todo: {response.data[0]}")
            return response.data[0]
        else:
            print(f"Todo with ID {id} not found or not updated")
            return None
    except Exception as e:
        print(f"Error updating todo: {e}")
        return None

def delete_todo(id):
    """Delete a todo item"""
    try:
        response = supabase.table('todos').delete().eq('id', id).execute()
        
        if response.data and len(response.data) > 0:
            print(f"Deleted todo: {response.data[0]}")
            return True
        else:
            print(f"Todo with ID {id} not found or not deleted")
            return False
    except Exception as e:
        print(f"Error deleting todo: {e}")
        return False

def demo():
    """Run a demo of CRUD operations"""
    print("=== Supabase CRUD Demo ===")
    
    # Check if the todos table exists
    try:
        supabase.table('todos').select('count', count='exact').execute()
        print("Table 'todos' exists! Running demo...")
    except Exception as e:
        print(f"Error: {e}")
        print("\nBefore using this script, create a 'todos' table in your Supabase dashboard with:")
        print("- id: integer (primary key)")
        print("- task: text")
        print("- completed: boolean")
        print("- created_at: timestamp with time zone (default: now())")
        return
    
    # CREATE
    print("\n--- Creating todos ---")
    todo1 = create_todo("Buy groceries")
    todo2 = create_todo("Finish Supabase tutorial")
    todo3 = create_todo("Take a walk")
    
    # READ ALL
    print("\n--- Reading all todos ---")
    todos = read_todos()
    
    if todos:
        first_id = todos[0]['id']
        
        # READ ONE
        print("\n--- Reading single todo ---")
        read_todo(first_id)
        
        # UPDATE
        print("\n--- Updating todo ---")
        update_todo(first_id, {'completed': True})
        
        # READ AGAIN
        print("\n--- Reading updated todo ---")
        read_todo(first_id)
        
        # DELETE
        print("\n--- Deleting todo ---")
        delete_todo(first_id)
        
        # READ ALL AGAIN
        print("\n--- Final todo list ---")
        read_todos()

if __name__ == "__main__":
    demo() 