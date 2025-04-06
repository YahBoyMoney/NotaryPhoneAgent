# Deploying the Notary Voice Agent Admin Dashboard

This guide provides instructions for deploying the Notary Voice Admin Dashboard to a web hosting platform so you can access it online.

## Option 1: Deploy to Render.com (Recommended)

Render.com provides a straightforward way to deploy Python web applications with a free tier.

### Steps for Render Deployment:

1. **Create a Render Account**:
   - Go to [render.com](https://render.com) and sign up for a free account

2. **Connect Your Repository**:
   - Create a GitHub/GitLab repository with your project code
   - In Render dashboard, click "New" and select "Web Service"
   - Connect to your repository

3. **Configure the Web Service**:
   - Name: `notary-voice-admin` (or your preferred name)
   - Environment: `Python`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn admin_dashboard:app`
   
4. **Set Environment Variables**:
   Add the following environment variables in the Render dashboard:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_KEY` - Your Supabase API key
   - `ADMIN_USERNAME` - Username for admin dashboard login
   - `ADMIN_PASSWORD` - Password for admin dashboard login
   - `AGENT_ID` - Your agent ID from Supabase
   - `FLASK_ENV` - Set to `production`
   - `FLASK_SECRET_KEY` - A random string for securing Flask sessions

5. **Deploy**:
   - Click "Create Web Service"
   - Render will build and deploy your application
   - Once deployment is successful, you can access your dashboard at the URL provided by Render

## Option 2: Deploy to Heroku

Heroku is another popular platform for deploying web applications.

### Steps for Heroku Deployment:

1. **Install the Heroku CLI**:
   - Download and install from [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

2. **Login to Heroku**:
   ```bash
   heroku login
   ```

3. **Create a Heroku App**:
   ```bash
   heroku create notary-voice-admin
   ```

4. **Set Environment Variables**:
   ```bash
   heroku config:set SUPABASE_URL=your_supabase_url
   heroku config:set SUPABASE_KEY=your_supabase_key
   heroku config:set ADMIN_USERNAME=your_admin_username
   heroku config:set ADMIN_PASSWORD=your_admin_password
   heroku config:set AGENT_ID=your_agent_id
   heroku config:set FLASK_ENV=production
   heroku config:set FLASK_SECRET_KEY=your_secret_key
   ```

5. **Deploy to Heroku**:
   ```bash
   git push heroku main
   ```

6. **Open Your Application**:
   ```bash
   heroku open
   ```

## Option 3: Deploy to PythonAnywhere

PythonAnywhere is a cloud-based Python development and hosting environment.

### Steps for PythonAnywhere Deployment:

1. **Create a PythonAnywhere Account**:
   - Go to [pythonanywhere.com](https://www.pythonanywhere.com) and sign up

2. **Upload Your Code**:
   - Use the Files tab to upload your code or clone from Git

3. **Set Up a Virtual Environment**:
   ```bash
   mkvirtualenv --python=python3.9 notary-agent
   pip install -r requirements.txt
   ```

4. **Configure Web App**:
   - Go to the Web tab and create a new web app
   - Select Flask and Python 3.9
   - Set the working directory to your project folder
   - Set WSGI configuration file to point to your app

5. **Set Environment Variables**:
   - Edit the WSGI configuration file to include your environment variables

6. **Reload the Web App**:
   - Click the "Reload" button on the Web tab

## Important Security Notes

1. **Never commit your `.env` file to version control**
2. **Use strong, unique passwords for your admin dashboard**
3. **Regularly update your dependencies**
4. **Consider adding IP restrictions if your hosting provider supports it**
5. **Enable HTTPS for your deployed application**

## Troubleshooting

If you encounter issues during deployment:

1. Check your environment variables are set correctly
2. Review the logs from your hosting provider
3. Ensure your Python version matches the one specified in `runtime.txt`
4. Make sure all dependencies are correctly listed in `requirements.txt`

For assistance, refer to your hosting provider's documentation or contact our support team. 