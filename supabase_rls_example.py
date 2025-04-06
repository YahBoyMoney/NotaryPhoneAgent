"""
Supabase with Row Level Security - Practical Example
---------------------------------------------------
This example demonstrates how to use Supabase with RLS policies in a real application.
It includes:
1. User authentication
2. Database operations with RLS policies applied
3. Best practices for client-side data access

Prerequisites:
- A Supabase project with RLS enabled on tables
- Tables and policies set up according to rls_setup.sql
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY
import getpass
import time
import json

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

class SupabaseApp:
    """Example application showing Supabase authentication and RLS in action"""
    
    def __init__(self):
        self.client = supabase
        self.current_user = None
    
    def register_user(self):
        """Register a new user"""
        print("\n=== Register New User ===")
        email = input("Email: ")
        password = getpass.getpass("Password: ")
        
        try:
            response = self.client.auth.sign_up({
                "email": email,
                "password": password
            })
            print(f"User registered! Check your email for confirmation.")
            return response
        except Exception as e:
            print(f"Error registering user: {e}")
            return None
    
    def login_user(self):
        """Log in a user"""
        print("\n=== Login ===")
        email = input("Email: ")
        password = getpass.getpass("Password: ")
        
        try:
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            self.current_user = response.user
            print(f"Logged in as {self.current_user.email}")
            return response
        except Exception as e:
            print(f"Error logging in: {e}")
            return None
    
    def get_user_profile(self):
        """Get the current user's profile (demonstrates RLS in action)"""
        if not self.current_user:
            print("You must be logged in to view your profile")
            return None
        
        try:
            # This will only return the user's own profile due to RLS
            response = self.client.table('profiles').select('*').execute()
            
            if response.data:
                print("\n=== Your Profile ===")
                for profile in response.data:
                    print(f"ID: {profile.get('id')}")
                    print(f"Display Name: {profile.get('display_name')}")
                    print(f"Avatar URL: {profile.get('avatar_url')}")
                return response.data
            else:
                print("No profile found. Do you want to create one?")
                return None
        except Exception as e:
            print(f"Error getting profile: {e}")
            return None
    
    def create_user_profile(self):
        """Create a user profile (demonstrates RLS for INSERT)"""
        if not self.current_user:
            print("You must be logged in to create a profile")
            return None
        
        print("\n=== Create Profile ===")
        display_name = input("Display Name: ")
        avatar_url = input("Avatar URL (optional): ")
        
        try:
            # RLS will enforce that user_id = auth.uid()
            response = self.client.table('profiles').insert({
                'user_id': self.current_user.id,
                'display_name': display_name,
                'avatar_url': avatar_url or None
            }).execute()
            
            if response.data:
                print("Profile created successfully!")
                return response.data[0]
            else:
                print("Error creating profile")
                return None
        except Exception as e:
            print(f"Error creating profile: {e}")
            return None
    
    def update_user_profile(self):
        """Update a user profile (demonstrates RLS for UPDATE)"""
        if not self.current_user:
            print("You must be logged in to update your profile")
            return None
        
        try:
            # Get current profile first
            profile_response = self.client.table('profiles').select('*').execute()
            
            if not profile_response.data:
                print("No profile found to update")
                return None
            
            profile = profile_response.data[0]
            
            print("\n=== Update Profile ===")
            print(f"Current Display Name: {profile.get('display_name')}")
            new_display_name = input("New Display Name (leave blank to keep current): ")
            
            print(f"Current Avatar URL: {profile.get('avatar_url')}")
            new_avatar_url = input("New Avatar URL (leave blank to keep current): ")
            
            # Only update fields that were provided
            update_data = {}
            if new_display_name:
                update_data['display_name'] = new_display_name
            if new_avatar_url:
                update_data['avatar_url'] = new_avatar_url
            
            if not update_data:
                print("No changes to make")
                return profile
            
            # RLS will enforce that this is the user's own profile
            response = self.client.table('profiles').update(update_data).eq('id', profile['id']).execute()
            
            if response.data:
                print("Profile updated successfully!")
                return response.data[0]
            else:
                print("Error updating profile")
                return None
        except Exception as e:
            print(f"Error updating profile: {e}")
            return None
    
    def create_post(self):
        """Create a post (demonstrates RLS for INSERT)"""
        if not self.current_user:
            print("You must be logged in to create a post")
            return None
        
        print("\n=== Create Post ===")
        title = input("Post Title: ")
        content = input("Post Content: ")
        is_public = input("Make public? (y/n): ").lower() == 'y'
        
        try:
            # RLS will enforce that author_id = auth.uid()
            response = self.client.table('posts').insert({
                'title': title,
                'content': content,
                'author_id': self.current_user.id,
                'published': is_public
            }).execute()
            
            if response.data:
                print("Post created successfully!")
                return response.data[0]
            else:
                print("Error creating post")
                return None
        except Exception as e:
            print(f"Error creating post: {e}")
            return None
    
    def view_all_posts(self):
        """View all posts (demonstrates RLS for SELECT)"""
        try:
            # RLS will filter:
            # - All public posts for everyone
            # - Private posts only for the owner
            response = self.client.table('posts').select('*').order('created_at', desc=True).execute()
            
            if response.data:
                print("\n=== Posts ===")
                for post in response.data:
                    status = "🌍 PUBLIC" if post.get('published') else "🔒 PRIVATE"
                    print(f"{post.get('id')} | {status} | {post.get('title')}")
                return response.data
            else:
                print("No posts found")
                return []
        except Exception as e:
            print(f"Error viewing posts: {e}")
            return []
    
    def delete_post(self):
        """Delete a post (demonstrates RLS for DELETE)"""
        if not self.current_user:
            print("You must be logged in to delete a post")
            return False
        
        # First, show user's posts
        try:
            posts = self.client.table('posts').select('id, title').eq('author_id', self.current_user.id).execute()
            
            if not posts.data:
                print("You don't have any posts to delete")
                return False
            
            print("\n=== Your Posts ===")
            for post in posts.data:
                print(f"{post.get('id')} | {post.get('title')}")
            
            post_id = input("\nEnter post ID to delete: ")
            
            # RLS will enforce that this is the user's own post
            delete_response = self.client.table('posts').delete().eq('id', post_id).execute()
            
            if delete_response.data:
                print("Post deleted successfully!")
                return True
            else:
                print("Error deleting post. You may only delete your own posts.")
                return False
        except Exception as e:
            print(f"Error deleting post: {e}")
            return False
    
    def logout(self):
        """Log out the current user"""
        if not self.current_user:
            print("No user is currently logged in")
            return
        
        try:
            self.client.auth.sign_out()
            print(f"Logged out successfully")
            self.current_user = None
        except Exception as e:
            print(f"Error logging out: {e}")
    
    def show_menu(self):
        """Display main menu"""
        print("\n=== Supabase RLS Demo ===")
        print("1. Register")
        print("2. Login")
        print("3. View Profile")
        print("4. Create/Update Profile")
        print("5. View All Posts")
        print("6. Create Post")
        print("7. Delete Post")
        print("8. Logout")
        print("9. Exit")
        
        choice = input("\nSelect option: ")
        return choice
    
    def run(self):
        """Run the application"""
        while True:
            choice = self.show_menu()
            
            if choice == '1':
                self.register_user()
            elif choice == '2':
                self.login_user()
            elif choice == '3':
                self.get_user_profile()
            elif choice == '4':
                if not self.current_user:
                    print("You must be logged in")
                    continue
                    
                profile = self.get_user_profile()
                if profile:
                    self.update_user_profile()
                else:
                    self.create_user_profile()
            elif choice == '5':
                self.view_all_posts()
            elif choice == '6':
                self.create_post()
            elif choice == '7':
                self.delete_post()
            elif choice == '8':
                self.logout()
            elif choice == '9':
                print("Goodbye!")
                break
            else:
                print("Invalid option")
            
            time.sleep(1)

if __name__ == "__main__":
    app = SupabaseApp()
    app.run() 