from flask import Flask, render_template, redirect, url_for, session, request, flash
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired
import os
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = 'notarysecretkey123'

# Mock data
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "notaryadmin123"

# Mock database content
clients = [
    {"id": "1", "name": "John Smith", "phone": "(555) 123-4567", "address": "123 Main St", "created_at": "2023-04-15", "updated_at": "2023-05-10"},
    {"id": "2", "name": "Sarah Johnson", "phone": "(555) 987-6543", "address": "456 Oak Ave", "created_at": "2023-03-22", "updated_at": "2023-05-01"},
    {"id": "3", "name": "Robert Davis", "phone": "(555) 456-7890", "address": "789 Pine Rd", "created_at": "2023-01-10", "updated_at": "2023-04-25"}
]

sessions = [
    {"id": "1", "client_id": "1", "status": "scheduled", "session_date": "2023-05-20 10:00 AM", "notes": "Standard notary service", "client_name": "John Smith", "client_phone": "(555) 123-4567"},
    {"id": "2", "client_id": "2", "status": "completed", "session_date": "2023-05-15 2:30 PM", "notes": "Travel service to hospital", "client_name": "Sarah Johnson", "client_phone": "(555) 987-6543"},
    {"id": "3", "client_id": "3", "status": "canceled", "session_date": "2023-05-10 4:15 PM", "notes": "Jail visitation", "client_name": "Robert Davis", "client_phone": "(555) 456-7890"}
]

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
    client_count = len(clients)
    session_count = len(sessions)
    active_sessions = len([s for s in sessions if s.get("status") == "scheduled"])
    
    return render_template("dashboard.html", 
                          client_count=client_count,
                          session_count=session_count,
                          active_sessions=active_sessions)

@app.route("/clients")
@login_required
def clients_list():
    return render_template("clients.html", clients=clients)

@app.route("/client/<client_id>")
@login_required
def client_detail(client_id):
    client = next((c for c in clients if c["id"] == client_id), None)
    client_sessions = [s for s in sessions if s["client_id"] == client_id]
    
    if client:
        client["session_count"] = len(client_sessions)
    
    return render_template("client_detail.html", client=client, sessions=client_sessions)

@app.route("/sessions")
@login_required
def sessions_list():
    return render_template("sessions.html", sessions=sessions)

@app.route("/session/<session_id>")
@login_required
def session_detail(session_id):
    session_data = next((s for s in sessions if s["id"] == session_id), None)
    client_id = session_data["client_id"] if session_data else None
    client_data = next((c for c in clients if c["id"] == client_id), None) if client_id else None
    
    # Mock document data
    documents = [
        {"id": "1", "name": "Notarized Document.pdf", "document_type": "notarized_document", "session_id": session_id},
        {"id": "2", "name": "ID Verification.jpg", "document_type": "identification", "session_id": session_id}
    ] if session_id == "1" else []
    
    # Mock transcript data
    if session_id == "1":
        session_data["recording_url"] = "#"
        session_data["recording_date"] = "2023-05-15"
        session_data["recording_duration"] = "3m 42s"
        session_data["transcript"] = [
            {"speaker": "agent", "text": "Hello, thank you for calling Notary Voice. How can I help you today?", "timestamp": "00:00:05"},
            {"speaker": "client", "text": "Hi, I need to get some documents notarized for a real estate transaction.", "timestamp": "00:00:12"},
            {"speaker": "agent", "text": "I'd be happy to help with that. Can you tell me what specific documents you need notarized?", "timestamp": "00:00:20"},
            {"speaker": "client", "text": "It's a deed transfer and some loan documents.", "timestamp": "00:00:28"}
        ]
    
    return render_template("session_detail.html", 
                          session=session_data, 
                          client=client_data,
                          documents=documents)

@app.route("/analytics")
@login_required
def analytics():
    # Mock data for analytics
    service_types = [
        {"type": "standard", "count": 15},
        {"type": "travel", "count": 8},
        {"type": "hospital", "count": 5},
        {"type": "jail", "count": 2}
    ]
    
    revenue_by_month = [
        {"month": "2023-01", "revenue": 1250},
        {"month": "2023-02", "revenue": 1400},
        {"month": "2023-03", "revenue": 1650},
        {"month": "2023-04", "revenue": 1800},
        {"month": "2023-05", "revenue": 2100}
    ]
    
    import json
    return render_template("analytics.html", 
                          service_types=json.dumps(service_types),
                          revenue_by_month=json.dumps(revenue_by_month))

@app.route("/calls")
@login_required
def calls():
    # Mock recording data
    recordings = [
        {
            "id": "rec1",
            "name": "Call with John Smith",
            "date": "2023-05-15 10:30 AM",
            "url": "#",
            "client_name": "John Smith",
            "client_phone": "(555) 123-4567",
            "session_id": "1",
            "transcript": "Hello, thank you for calling Notary Voice. How can I help you today?"
        },
        {
            "id": "rec2",
            "name": "Call with Sarah Johnson",
            "date": "2023-05-10 2:15 PM",
            "url": "#",
            "client_name": "Sarah Johnson",
            "client_phone": "(555) 987-6543",
            "session_id": "2",
            "transcript": "I'd like to schedule a mobile notary service for tomorrow."
        }
    ]
    
    return render_template("calls.html", recordings=recordings)

@app.route("/settings")
@login_required
def settings():
    return render_template("settings.html")

if __name__ == "__main__":
    # Create templates directory if it doesn't exist
    os.makedirs("templates", exist_ok=True)
    print("Starting Notary Voice Agent Admin Dashboard...")
    app.run(debug=True, host='0.0.0.0', port=5001) 