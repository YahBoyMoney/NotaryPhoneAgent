"""
Notary Voice Agent - Supabase Application Example
------------------------------------------------
This example shows how to interact with the Supabase database
with Row Level Security (RLS) properly implemented.
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY
import getpass
import json
import datetime
import uuid
import time

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

class NotaryVoiceApp:
    def __init__(self):
        self.client = supabase
        self.current_user = None
        self.agent_profile = None
    
    def register_user(self):
        """Register a new user/agent"""
        print("\n=== Register New Notary Agent ===")
        email = input("Email: ")
        password = getpass.getpass("Password: ")
        
        try:
            response = self.client.auth.sign_up({
                "email": email,
                "password": password
            })
            print("User registered! Check your email for confirmation.")
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
            
            # Check if agent profile exists
            self._load_agent_profile()
            
            return response
        except Exception as e:
            print(f"Error logging in: {e}")
            return None
    
    def _load_agent_profile(self):
        """Load agent profile for current user"""
        if not self.current_user:
            return None
        
        try:
            response = self.client.table('agents').select('*').execute()
            
            if response.data:
                self.agent_profile = response.data[0]
                return self.agent_profile
            return None
        except Exception as e:
            print(f"Error loading agent profile: {e}")
            return None
    
    def create_agent_profile(self):
        """Create a new agent profile"""
        if not self.current_user:
            print("You must be logged in to create a profile")
            return None
        
        print("\n=== Create Agent Profile ===")
        name = input("Full Name: ")
        email = input(f"Email [{self.current_user.email}]: ") or self.current_user.email
        phone = input("Phone Number: ")
        
        try:
            response = self.client.table('agents').insert({
                'user_id': self.current_user.id,
                'name': name,
                'email': email,
                'phone': phone,
                'status': 'active'
            }).execute()
            
            if response.data:
                print("Agent profile created successfully!")
                self.agent_profile = response.data[0]
                return self.agent_profile
            else:
                print("Error creating agent profile")
                return None
        except Exception as e:
            print(f"Error creating agent profile: {e}")
            return None
    
    def manage_clients(self):
        """Manage clients submenu"""
        if not self._ensure_login_and_profile():
            return
        
        while True:
            print("\n=== Manage Clients ===")
            print("1. View All Clients")
            print("2. Add New Client")
            print("3. Update Client")
            print("4. Delete Client")
            print("5. Return to Main Menu")
            
            choice = input("\nSelect option: ")
            
            if choice == '1':
                self.view_all_clients()
            elif choice == '2':
                self.add_client()
            elif choice == '3':
                self.update_client()
            elif choice == '4':
                self.delete_client()
            elif choice == '5':
                break
            else:
                print("Invalid option")
    
    def view_all_clients(self):
        """View all clients for current agent"""
        if not self._ensure_login_and_profile():
            return None
        
        try:
            response = self.client.table('clients').select('*').order('name').execute()
            
            if response.data:
                print("\n=== Your Clients ===")
                for i, client in enumerate(response.data, 1):
                    print(f"{i}. {client['name']} | {client['phone']} | {client.get('email', 'No email')}")
                return response.data
            else:
                print("You don't have any clients yet.")
                return []
        except Exception as e:
            print(f"Error viewing clients: {e}")
            return None
    
    def add_client(self):
        """Add a new client"""
        if not self._ensure_login_and_profile():
            return None
        
        print("\n=== Add New Client ===")
        name = input("Client Name: ")
        email = input("Client Email (optional): ")
        phone = input("Client Phone: ")
        
        try:
            response = self.client.table('clients').insert({
                'agent_id': self.agent_profile['id'],
                'name': name,
                'email': email if email else None,
                'phone': phone
            }).execute()
            
            if response.data:
                print("Client added successfully!")
                return response.data[0]
            else:
                print("Error adding client")
                return None
        except Exception as e:
            print(f"Error adding client: {e}")
            return None
    
    def update_client(self):
        """Update an existing client"""
        if not self._ensure_login_and_profile():
            return None
        
        clients = self.view_all_clients()
        if not clients:
            return None
        
        client_idx = input("\nEnter the number of the client to update: ")
        try:
            client_idx = int(client_idx) - 1
            if client_idx < 0 or client_idx >= len(clients):
                print("Invalid client number")
                return None
            
            client = clients[client_idx]
            
            print(f"\n=== Update Client: {client['name']} ===")
            name = input(f"Name [{client['name']}]: ") or client['name']
            email = input(f"Email [{client.get('email', '')}]: ") or client.get('email')
            phone = input(f"Phone [{client['phone']}]: ") or client['phone']
            
            updates = {
                'name': name,
                'email': email,
                'phone': phone
            }
            
            response = self.client.table('clients').update(updates).eq('id', client['id']).execute()
            
            if response.data:
                print("Client updated successfully!")
                return response.data[0]
            else:
                print("Error updating client")
                return None
        except ValueError:
            print("Please enter a valid number")
            return None
        except Exception as e:
            print(f"Error updating client: {e}")
            return None
    
    def delete_client(self):
        """Delete a client"""
        if not self._ensure_login_and_profile():
            return False
        
        clients = self.view_all_clients()
        if not clients:
            return False
        
        client_idx = input("\nEnter the number of the client to delete: ")
        try:
            client_idx = int(client_idx) - 1
            if client_idx < 0 or client_idx >= len(clients):
                print("Invalid client number")
                return False
            
            client = clients[client_idx]
            confirm = input(f"Are you sure you want to delete {client['name']}? (y/n): ")
            
            if confirm.lower() != 'y':
                print("Deletion cancelled")
                return False
            
            response = self.client.table('clients').delete().eq('id', client['id']).execute()
            
            if response.data:
                print("Client deleted successfully!")
                return True
            else:
                print("Error deleting client")
                return False
        except ValueError:
            print("Please enter a valid number")
            return False
        except Exception as e:
            print(f"Error deleting client: {e}")
            return False
    
    def manage_sessions(self):
        """Manage notary sessions submenu"""
        if not self._ensure_login_and_profile():
            return
        
        while True:
            print("\n=== Manage Notary Sessions ===")
            print("1. View All Sessions")
            print("2. Schedule New Session")
            print("3. Update Session")
            print("4. Delete Session")
            print("5. Manage Session Documents")
            print("6. Return to Main Menu")
            
            choice = input("\nSelect option: ")
            
            if choice == '1':
                self.view_all_sessions()
            elif choice == '2':
                self.schedule_session()
            elif choice == '3':
                self.update_session()
            elif choice == '4':
                self.delete_session()
            elif choice == '5':
                self.manage_documents()
            elif choice == '6':
                break
            else:
                print("Invalid option")
    
    def view_all_sessions(self):
        """View all sessions for current agent"""
        if not self._ensure_login_and_profile():
            return None
        
        try:
            # Using RLS, this will only return the agent's sessions
            response = self.client.table('sessions').select('*, clients(name)').order('session_date', desc=True).execute()
            
            if response.data:
                print("\n=== Your Sessions ===")
                for i, session in enumerate(response.data, 1):
                    client_name = session['clients']['name'] if session['clients'] else "Unknown Client"
                    date_str = session['session_date'][:16].replace('T', ' ')  # Simple date formatting
                    status = session['status'].upper()
                    print(f"{i}. {date_str} | {client_name} | Status: {status}")
                return response.data
            else:
                print("You don't have any sessions scheduled.")
                return []
        except Exception as e:
            print(f"Error viewing sessions: {e}")
            return None
    
    def schedule_session(self):
        """Schedule a new notary session"""
        if not self._ensure_login_and_profile():
            return None
        
        # Get clients for selection
        clients = self.view_all_clients()
        if not clients:
            print("You need to add a client first!")
            add_client = input("Would you like to add a client now? (y/n): ")
            if add_client.lower() == 'y':
                new_client = self.add_client()
                if not new_client:
                    return None
                clients = [new_client]
            else:
                return None
        
        print("\n=== Schedule New Session ===")
        
        # Select client
        print("\nSelect a client:")
        for i, client in enumerate(clients, 1):
            print(f"{i}. {client['name']} | {client['phone']}")
        
        client_idx = input("Enter client number: ")
        try:
            client_idx = int(client_idx) - 1
            if client_idx < 0 or client_idx >= len(clients):
                print("Invalid client number")
                return None
            
            client = clients[client_idx]
            
            # Get session details
            date_str = input("Session Date (YYYY-MM-DD): ")
            time_str = input("Session Time (HH:MM): ")
            
            try:
                session_datetime = f"{date_str}T{time_str}:00"
                notes = input("Session Notes (optional): ")
                
                # Create the session
                response = self.client.table('sessions').insert({
                    'agent_id': self.agent_profile['id'],
                    'client_id': client['id'],
                    'session_date': session_datetime,
                    'status': 'scheduled',
                    'notes': notes if notes else None
                }).execute()
                
                if response.data:
                    print("Session scheduled successfully!")
                    return response.data[0]
                else:
                    print("Error scheduling session")
                    return None
            except Exception as e:
                print(f"Error with date/time format: {e}")
                return None
                
        except ValueError:
            print("Please enter a valid number")
            return None
        except Exception as e:
            print(f"Error scheduling session: {e}")
            return None
    
    def update_session(self):
        """Update an existing session"""
        if not self._ensure_login_and_profile():
            return None
        
        sessions = self.view_all_sessions()
        if not sessions:
            return None
        
        session_idx = input("\nEnter the number of the session to update: ")
        try:
            session_idx = int(session_idx) - 1
            if session_idx < 0 or session_idx >= len(sessions):
                print("Invalid session number")
                return None
            
            session = sessions[session_idx]
            
            print(f"\n=== Update Session ===")
            date_time = session['session_date'].replace('Z', '').split('T')
            current_date = date_time[0]
            current_time = date_time[1][:5]  # HH:MM
            
            print(f"Current Date: {current_date}")
            new_date = input(f"New Date [{current_date}]: ") or current_date
            
            print(f"Current Time: {current_time}")
            new_time = input(f"New Time [{current_time}]: ") or current_time
            
            print(f"Current Status: {session['status']}")
            status_options = ['scheduled', 'in_progress', 'completed', 'cancelled']
            print("Status options:", ", ".join(status_options))
            new_status = input(f"New Status [{session['status']}]: ") or session['status']
            
            print(f"Current Notes: {session.get('notes', 'None')}")
            new_notes = input("New Notes (leave blank to keep current): ") or session.get('notes')
            
            updates = {
                'session_date': f"{new_date}T{new_time}:00",
                'status': new_status,
                'notes': new_notes
            }
            
            # If session completed, ask for recording URL and transcript
            if new_status == 'completed':
                recording_url = input("Recording URL (optional): ") or session.get('recording_url')
                if recording_url:
                    updates['recording_url'] = recording_url
                
                transcript = input("Session Transcript (optional): ") or session.get('transcript')
                if transcript:
                    updates['transcript'] = transcript
            
            response = self.client.table('sessions').update(updates).eq('id', session['id']).execute()
            
            if response.data:
                print("Session updated successfully!")
                return response.data[0]
            else:
                print("Error updating session")
                return None
        except ValueError:
            print("Please enter a valid number")
            return None
        except Exception as e:
            print(f"Error updating session: {e}")
            return None
    
    def delete_session(self):
        """Delete a session"""
        if not self._ensure_login_and_profile():
            return False
        
        sessions = self.view_all_sessions()
        if not sessions:
            return False
        
        session_idx = input("\nEnter the number of the session to delete: ")
        try:
            session_idx = int(session_idx) - 1
            if session_idx < 0 or session_idx >= len(sessions):
                print("Invalid session number")
                return False
            
            session = sessions[session_idx]
            client_name = session['clients']['name'] if session['clients'] else "Unknown Client"
            date_str = session['session_date'][:16].replace('T', ' ')
            
            confirm = input(f"Are you sure you want to delete the session with {client_name} on {date_str}? (y/n): ")
            
            if confirm.lower() != 'y':
                print("Deletion cancelled")
                return False
            
            response = self.client.table('sessions').delete().eq('id', session['id']).execute()
            
            if response.data:
                print("Session deleted successfully!")
                return True
            else:
                print("Error deleting session")
                return False
        except ValueError:
            print("Please enter a valid number")
            return False
        except Exception as e:
            print(f"Error deleting session: {e}")
            return False
    
    def manage_documents(self):
        """Manage documents for a session"""
        if not self._ensure_login_and_profile():
            return
        
        sessions = self.view_all_sessions()
        if not sessions:
            return
        
        session_idx = input("\nEnter the number of the session to manage documents for: ")
        try:
            session_idx = int(session_idx) - 1
            if session_idx < 0 or session_idx >= len(sessions):
                print("Invalid session number")
                return
            
            session = sessions[session_idx]
            
            while True:
                print(f"\n=== Documents for Session with {session['clients']['name']} ===")
                print("1. View Documents")
                print("2. Add Document")
                print("3. Update Document Status")
                print("4. Delete Document")
                print("5. Return to Sessions Menu")
                
                choice = input("\nSelect option: ")
                
                if choice == '1':
                    self.view_session_documents(session['id'])
                elif choice == '2':
                    self.add_document(session['id'])
                elif choice == '3':
                    self.update_document_status(session['id'])
                elif choice == '4':
                    self.delete_document(session['id'])
                elif choice == '5':
                    break
                else:
                    print("Invalid option")
        except ValueError:
            print("Please enter a valid number")
            return
        except Exception as e:
            print(f"Error: {e}")
            return
    
    def view_session_documents(self, session_id):
        """View documents for a specific session"""
        try:
            response = self.client.table('documents').select('*').eq('session_id', session_id).execute()
            
            if response.data:
                print("\n=== Session Documents ===")
                for i, doc in enumerate(response.data, 1):
                    status = doc['status'].upper()
                    print(f"{i}. {doc['name']} | Type: {doc.get('document_type', 'N/A')} | Status: {status}")
                return response.data
            else:
                print("No documents found for this session.")
                return []
        except Exception as e:
            print(f"Error viewing documents: {e}")
            return None
    
    def add_document(self, session_id):
        """Add a document to a session"""
        print("\n=== Add New Document ===")
        name = input("Document Name: ")
        doc_type = input("Document Type (e.g., ID, Contract, Deed): ")
        file_url = input("Document File URL: ")
        
        try:
            response = self.client.table('documents').insert({
                'session_id': session_id,
                'name': name,
                'document_type': doc_type,
                'file_url': file_url,
                'status': 'pending'
            }).execute()
            
            if response.data:
                print("Document added successfully!")
                return response.data[0]
            else:
                print("Error adding document")
                return None
        except Exception as e:
            print(f"Error adding document: {e}")
            return None
    
    def update_document_status(self, session_id):
        """Update document status"""
        docs = self.view_session_documents(session_id)
        if not docs:
            return None
        
        doc_idx = input("\nEnter the number of the document to update: ")
        try:
            doc_idx = int(doc_idx) - 1
            if doc_idx < 0 or doc_idx >= len(docs):
                print("Invalid document number")
                return None
            
            doc = docs[doc_idx]
            
            print(f"\n=== Update Document: {doc['name']} ===")
            status_options = ['pending', 'signed', 'rejected', 'completed']
            print("Status options:", ", ".join(status_options))
            new_status = input(f"New Status [{doc['status']}]: ") or doc['status']
            
            response = self.client.table('documents').update({
                'status': new_status
            }).eq('id', doc['id']).execute()
            
            if response.data:
                print("Document status updated successfully!")
                return response.data[0]
            else:
                print("Error updating document status")
                return None
        except ValueError:
            print("Please enter a valid number")
            return None
        except Exception as e:
            print(f"Error updating document status: {e}")
            return None
    
    def delete_document(self, session_id):
        """Delete a document"""
        docs = self.view_session_documents(session_id)
        if not docs:
            return False
        
        doc_idx = input("\nEnter the number of the document to delete: ")
        try:
            doc_idx = int(doc_idx) - 1
            if doc_idx < 0 or doc_idx >= len(docs):
                print("Invalid document number")
                return False
            
            doc = docs[doc_idx]
            
            confirm = input(f"Are you sure you want to delete the document '{doc['name']}'? (y/n): ")
            
            if confirm.lower() != 'y':
                print("Deletion cancelled")
                return False
            
            response = self.client.table('documents').delete().eq('id', doc['id']).execute()
            
            if response.data:
                print("Document deleted successfully!")
                return True
            else:
                print("Error deleting document")
                return False
        except ValueError:
            print("Please enter a valid number")
            return False
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False
    
    def logout(self):
        """Log out the current user"""
        if not self.current_user:
            print("No user is currently logged in")
            return
        
        try:
            self.client.auth.sign_out()
            print("Logged out successfully")
            self.current_user = None
            self.agent_profile = None
        except Exception as e:
            print(f"Error logging out: {e}")
    
    def _ensure_login_and_profile(self):
        """Ensure user is logged in with a profile"""
        if not self.current_user:
            print("You must be logged in.")
            return False
        
        if not self.agent_profile:
            print("You need to create an agent profile first.")
            create_profile = input("Would you like to create a profile now? (y/n): ")
            if create_profile.lower() == 'y':
                self.create_agent_profile()
                if not self.agent_profile:
                    return False
            else:
                return False
        
        return True
    
    def show_menu(self):
        """Display main menu"""
        print("\n=== Notary Voice Agent System ===")
        if self.current_user:
            print(f"Logged in as: {self.current_user.email}")
            if self.agent_profile:
                print(f"Agent: {self.agent_profile['name']}")
        
        print("\nOptions:")
        print("1. Register")
        print("2. Login")
        
        if self.current_user:
            if not self.agent_profile:
                print("3. Create Agent Profile")
            else:
                print("3. Manage Clients")
                print("4. Manage Notary Sessions")
            print("5. Logout")
        
        print("9. Exit")
        
        choice = input("\nSelect option: ")
        return choice
    
    def run(self):
        """Run the application"""
        print("Welcome to the Notary Voice Agent System")
        
        while True:
            choice = self.show_menu()
            
            if choice == '1':
                self.register_user()
            elif choice == '2':
                self.login_user()
            elif choice == '3' and self.current_user:
                if not self.agent_profile:
                    self.create_agent_profile()
                else:
                    self.manage_clients()
            elif choice == '4' and self.current_user and self.agent_profile:
                self.manage_sessions()
            elif choice == '5' and self.current_user:
                self.logout()
            elif choice == '9':
                print("Exiting the application. Goodbye!")
                break
            else:
                print("Invalid option or option not available")
            
            time.sleep(0.5)

if __name__ == "__main__":
    app = NotaryVoiceApp()
    app.run() 