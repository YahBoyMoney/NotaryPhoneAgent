import os
import datetime
import json
from flask import Flask, render_template, request, redirect, url_for, jsonify, Response, flash, session
from flask_wtf import FlaskForm
from flask_wtf.csrf import CSRFProtect
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired
from functools import wraps
from dotenv import load_dotenv
from supabase import create_client, Client
import pandas as pd
import plotly
import plotly.express as px
import plotly.graph_objects as go

# Import url_quote from werkzeug.urls if available, otherwise use url_encode
try:
    from werkzeug.urls import url_quote
except ImportError:
    from werkzeug.urls import url_encode as url_quote

# Load environment variables - use .env file locally, but environment variables in production
load_dotenv()

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qiaxmvitjdwksfmvtrbd.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXhtdml0amR3a3NmbXZ0cmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4ODY1MDksImV4cCI6MjA1OTQ2MjUwOX0.L5Sx_ISnV1guaCo0uKkUtpTo9Zm-bamztfTudXl7EtE")

# Admin credentials (in production, use environment variables)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "notaryadmin123")

# Service agent ID for Supabase
AGENT_ID = os.getenv("AGENT_ID", "00000000-0000-0000-0000-000000000001")

# Initialize Supabase client
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    supabase = None

# Initialize Flask application
app = Flask(__name__)

# For production, use a proper secret key
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "notarysecretkey123")
csrf = CSRFProtect(app)

# Configure production settings when deployed
if not app.debug and not app.testing and 'DYNO' in os.environ:
    # Configure SSL if needed
    if os.environ.get('FLASK_ENV') == 'production':
        app.config['SESSION_COOKIE_SECURE'] = True
        app.config['SESSION_COOKIE_HTTPONLY'] = True

# Login form
class LoginForm(FlaskForm):
    username = StringField("Username", validators=[DataRequired()])
    password = PasswordField("Password", validators=[DataRequired()])
    submit = SubmitField("Login")

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "logged_in" not in session:
            return redirect(url_for("login", next=request.url))
        return f(*args, **kwargs)
    return decorated_function

@app.route("/login", methods=["GET", "POST"])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        if form.username.data == ADMIN_USERNAME and form.password.data == ADMIN_PASSWORD:
            session["logged_in"] = True
            return redirect(url_for("dashboard"))
        else:
            flash("Invalid username or password")
    return render_template("login.html", form=form)

@app.route("/logout")
def logout():
    session.pop("logged_in", None)
    return redirect(url_for("login"))

@app.route("/")
@login_required
def dashboard():
    # Get summary statistics
    client_count = 0
    session_count = 0
    active_sessions = 0
    
    try:
        # Get client count for this agent
        clients_result = supabase.table("clients").select("id").eq("agent_id", AGENT_ID).execute()
        client_count = len(clients_result.data) if clients_result.data else 0
        
        # Get session counts
        sessions_result = supabase.table("sessions").select("id, status").eq("agent_id", AGENT_ID).execute()
        session_count = len(sessions_result.data) if sessions_result.data else 0
        
        # Count active sessions
        if sessions_result.data:
            active_sessions = sum(1 for s in sessions_result.data if s.get("status") == "scheduled")
    except Exception as e:
        print(f"Error getting summary statistics: {e}")
    
    return render_template("dashboard.html", 
                          client_count=client_count,
                          session_count=session_count,
                          active_sessions=active_sessions)

@app.route("/clients")
@login_required
def clients():
    clients_data = []
    try:
        # Get all clients for this agent with pagination
        result = supabase.table("clients").select("*").eq("agent_id", AGENT_ID).execute()
        if result.data:
            clients_data = result.data
    except Exception as e:
        print(f"Error getting clients: {e}")
    
    return render_template("clients.html", clients=clients_data)

@app.route("/client/<client_id>")
@login_required
def client_detail(client_id):
    client_data = None
    sessions_data = []
    
    try:
        # Get client details
        client_result = supabase.table("clients").select("*").eq("id", client_id).execute()
        if client_result.data:
            client_data = client_result.data[0]
            
            # Get client's sessions
            sessions_result = supabase.table("sessions").select("*").eq("client_id", client_id).execute()
            if sessions_result.data:
                sessions_data = sessions_result.data
                
                # Add the session count to client data
                client_data["session_count"] = len(sessions_data)
                
                # Format session dates for each session
                for session in sessions_data:
                    if session.get("session_date"):
                        try:
                            # Parse ISO format date
                            date_obj = datetime.datetime.fromisoformat(session["session_date"].replace('Z', '+00:00'))
                            # Format for display
                            session["session_date"] = date_obj.strftime("%B %d, %Y at %I:%M %p")
                        except:
                            # Keep original if parsing fails
                            pass
    except Exception as e:
        print(f"Error getting client details: {e}")
    
    return render_template("client_detail.html", client=client_data, sessions=sessions_data)

@app.route("/sessions")
@login_required
def sessions():
    sessions_data = []
    try:
        # Get all sessions with client information via join
        query = """
        SELECT s.id, s.status, s.session_date, s.notes, c.name as client_name, c.phone as client_phone
        FROM sessions s
        JOIN clients c ON s.client_id = c.id
        WHERE s.agent_id = ?
        ORDER BY s.session_date DESC
        """
        
        # Since Supabase doesn't directly support this join in the Python client,
        # we'll use two queries and join manually
        sessions_result = supabase.table("sessions").select("*").eq("agent_id", AGENT_ID).execute()
        
        if sessions_result.data:
            # Get all clients in one query to avoid N+1 problem
            client_ids = list(set(session["client_id"] for session in sessions_result.data))
            clients_result = supabase.table("clients").select("*").in_("id", client_ids).execute()
            
            # Create a client lookup dictionary
            clients_dict = {client["id"]: client for client in clients_result.data} if clients_result.data else {}
            
            # Join the data
            for session in sessions_result.data:
                client = clients_dict.get(session["client_id"], {})
                sessions_data.append({
                    "id": session["id"],
                    "status": session["status"],
                    "session_date": session["session_date"],
                    "notes": session["notes"],
                    "client_name": client.get("name", "Unknown"),
                    "client_phone": client.get("phone", "Unknown")
                })
    except Exception as e:
        print(f"Error getting sessions: {e}")
    
    return render_template("sessions.html", sessions=sessions_data)

@app.route("/session/<session_id>")
@login_required
def session_detail(session_id):
    session_data = None
    client_data = None
    documents_data = []
    
    try:
        # Get session details
        session_result = supabase.table("sessions").select("*").eq("id", session_id).execute()
        if session_result.data:
            session_data = session_result.data[0]
            
            # Get client info
            client_id = session_data["client_id"]
            client_result = supabase.table("clients").select("*").eq("id", client_id).execute()
            if client_result.data:
                client_data = client_result.data[0]
                session_data["client_name"] = client_data["name"]
                session_data["client_phone"] = client_data["phone"]
            
            # Get session documents
            documents_result = supabase.table("documents").select("*").eq("session_id", session_id).execute()
            if documents_result.data:
                documents_data = documents_result.data
                
            # Look for call recording and transcript
            recording_doc = next((doc for doc in documents_data if doc.get("document_type") == "recording"), None)
            if recording_doc:
                session_data["recording_url"] = recording_doc.get("file_url")
                session_data["recording_date"] = recording_doc.get("created_at")
                session_data["recording_duration"] = recording_doc.get("metadata", {}).get("duration", "Unknown")
                
                # Parse transcript if available
                if recording_doc.get("transcript"):
                    try:
                        transcript_data = json.loads(recording_doc.get("transcript"))
                        session_data["transcript"] = []
                        
                        # Transform transcript into a format easier to display
                        for entry in transcript_data:
                            session_data["transcript"].append({
                                "speaker": entry.get("speaker", "unknown"),
                                "text": entry.get("text", ""),
                                "timestamp": entry.get("timestamp", "")
                            })
                    except:
                        # If json parsing fails, use as raw text
                        session_data["transcript"] = [{"speaker": "system", "text": recording_doc.get("transcript"), "timestamp": ""}]
                
            # Format session date for display vs editing
            if session_data.get("session_date"):
                # Store raw date for form editing
                session_data["session_date_raw"] = session_data["session_date"]
                
                # Try to format the date for display
                try:
                    # Parse ISO format date
                    date_obj = datetime.datetime.fromisoformat(session_data["session_date"].replace('Z', '+00:00'))
                    # Format for display
                    session_data["session_date"] = date_obj.strftime("%B %d, %Y at %I:%M %p")
                except:
                    # Keep original if parsing fails
                    pass
    except Exception as e:
        print(f"Error getting session details: {e}")
    
    return render_template("session_detail.html", 
                          session=session_data, 
                          client=client_data,
                          documents=documents_data)

@app.route("/calls")
@login_required
def calls():
    # In a full implementation, this would show call logs from a call_logs table
    # For now, we'll use the documents table to find recordings
    recordings = []
    
    try:
        # Get all documents that are recordings
        recordings_result = supabase.table("documents").select("*").eq("document_type", "recording").execute()
        if recordings_result.data:
            # Get associated sessions to get client info
            session_ids = list(set(doc["session_id"] for doc in recordings_result.data))
            sessions_result = supabase.table("sessions").select("*").in_("id", session_ids).execute()
            
            # Create a session lookup dictionary
            sessions_dict = {session["id"]: session for session in sessions_result.data} if sessions_result.data else {}
            
            # Get client information
            client_ids = list(set(session["client_id"] for session in sessions_result.data)) if sessions_result.data else []
            clients_result = supabase.table("clients").select("*").in_("id", client_ids).execute() if client_ids else None
            
            # Create a client lookup dictionary
            clients_dict = {client["id"]: client for client in clients_result.data} if clients_result and clients_result.data else {}
            
            # Join the data
            for doc in recordings_result.data:
                session = sessions_dict.get(doc["session_id"], {})
                client_id = session.get("client_id")
                client = clients_dict.get(client_id, {}) if client_id else {}
                
                recordings.append({
                    "id": doc["id"],
                    "name": doc["name"],
                    "date": doc.get("created_at"),
                    "url": doc.get("file_url"),
                    "client_name": client.get("name", "Unknown"),
                    "client_phone": client.get("phone", "Unknown"),
                    "session_id": doc["session_id"],
                    "transcript": doc.get("transcript", "No transcript available")
                })
    except Exception as e:
        print(f"Error getting recordings: {e}")
    
    return render_template("calls.html", recordings=recordings)

@app.route("/analytics")
@login_required
def analytics():
    # Prepare data for analytics
    service_types = []
    revenue_by_month = []
    
    try:
        # Get sessions with service type info
        sessions_result = supabase.table("sessions").select("*").eq("agent_id", AGENT_ID).execute()
        
        if sessions_result.data:
            # Count by service type (from notes field)
            service_counts = {}
            
            # Prepare data for monthly revenue chart
            month_revenue = {}
            
            for session in sessions_result.data:
                # Extract service type from notes
                notes = session.get("notes", "")
                service_type = "standard"
                
                if "jail" in notes.lower():
                    service_type = "jail"
                elif "hospital" in notes.lower():
                    service_type = "hospital"
                elif "travel" in notes.lower():
                    service_type = "travel"
                
                service_counts[service_type] = service_counts.get(service_type, 0) + 1
                
                # Extract revenue from notes (very simplified)
                try:
                    revenue = 0
                    if "Quote: $" in notes:
                        revenue_str = notes.split("Quote: $")[1].split(" ")[0]
                        revenue = float(revenue_str)
                    
                    # Get month from session date
                    date_str = session.get("session_date", "")
                    if date_str:
                        date = datetime.datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                        month_key = date.strftime("%Y-%m")
                        month_revenue[month_key] = month_revenue.get(month_key, 0) + revenue
                except Exception as e:
                    print(f"Error processing revenue: {e}")
            
            # Format for charts
            service_types = [{"type": k, "count": v} for k, v in service_counts.items()]
            revenue_by_month = [{"month": k, "revenue": v} for k, v in month_revenue.items()]
            revenue_by_month.sort(key=lambda x: x["month"])
    except Exception as e:
        print(f"Error generating analytics: {e}")
    
    return render_template("analytics.html", 
                          service_types=json.dumps(service_types),
                          revenue_by_month=json.dumps(revenue_by_month))

@app.route("/api/chart/service_types")
@login_required
def api_chart_service_types():
    # Generate service type distribution chart
    try:
        # Get sessions with service type info
        sessions_result = supabase.table("sessions").select("*").eq("agent_id", AGENT_ID).execute()
        
        if sessions_result.data:
            # Count by service type (from notes field)
            service_counts = {}
            
            for session in sessions_result.data:
                # Extract service type from notes
                notes = session.get("notes", "")
                service_type = "standard"
                
                if "jail" in notes.lower():
                    service_type = "jail"
                elif "hospital" in notes.lower():
                    service_type = "hospital"
                elif "travel" in notes.lower():
                    service_type = "travel"
                
                service_counts[service_type] = service_counts.get(service_type, 0) + 1
            
            # Create a DataFrame for plotting
            df = pd.DataFrame([{"service": k, "count": v} for k, v in service_counts.items()])
            
            # Create the figure
            fig = px.pie(df, values='count', names='service', title='Service Type Distribution')
            
            # Convert to JSON
            return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
    except Exception as e:
        print(f"Error generating service type chart: {e}")
    
    return "{}"

@app.route("/api/chart/monthly_revenue")
@login_required
def api_chart_monthly_revenue():
    # Generate monthly revenue chart
    try:
        # Get sessions with revenue info
        sessions_result = supabase.table("sessions").select("*").eq("agent_id", AGENT_ID).execute()
        
        if sessions_result.data:
            # Prepare data for monthly revenue chart
            month_revenue = {}
            
            for session in sessions_result.data:
                # Extract revenue from notes (very simplified)
                try:
                    revenue = 0
                    notes = session.get("notes", "")
                    if "Quote: $" in notes:
                        revenue_str = notes.split("Quote: $")[1].split(" ")[0]
                        revenue = float(revenue_str)
                    
                    # Get month from session date
                    date_str = session.get("session_date", "")
                    if date_str:
                        date = datetime.datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                        month_key = date.strftime("%Y-%m")
                        month_revenue[month_key] = month_revenue.get(month_key, 0) + revenue
                except Exception as e:
                    print(f"Error processing revenue: {e}")
            
            # Create a DataFrame for plotting
            df = pd.DataFrame([{"month": k, "revenue": v} for k, v in month_revenue.items()])
            df = df.sort_values("month")
            
            # Create the figure
            fig = px.bar(df, x='month', y='revenue', title='Monthly Revenue')
            
            # Convert to JSON
            return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
    except Exception as e:
        print(f"Error generating monthly revenue chart: {e}")
    
    return "{}"

@app.route("/settings")
@login_required
def settings():
    return render_template("settings.html")

@app.route("/api/update_settings", methods=["POST"])
@login_required
def api_update_settings():
    # Handle settings update
    return jsonify({"status": "success"})

# Add a health check endpoint for monitoring
@app.route("/health")
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.datetime.now().isoformat()})

if __name__ == "__main__":
    try:
        # Create templates directory if it doesn't exist
        os.makedirs("templates", exist_ok=True)
        print("Starting Notary Voice Agent Admin Dashboard...")
        
        # Get port from environment variable for deployment platforms
        port = int(os.environ.get("PORT", 5001))
        app.run(debug=os.environ.get("FLASK_ENV") == "development", host='0.0.0.0', port=port)
    except Exception as e:
        error_message = f"Error starting dashboard: {str(e)}"
        print(error_message)
        
        # Create a file with the error message for easy viewing
        with open('dashboard_error.txt', 'w') as f:
            f.write(error_message) 