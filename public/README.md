# Notary Voice Agent Dashboard

This is the frontend dashboard for the Notary Voice Agent application. It provides a user interface for notaries to manage their calls, messages, and client interactions.

## Features

- **Call Management**: Make and receive calls, view call history, listen to recordings
- **Message Management**: Send and receive text messages with clients
- **Client Management**: View and manage client information
- **Recording Access**: Listen to call recordings and view transcripts
- **Analytics**: View call and performance metrics

## Deployment

This frontend is designed to be deployed on Netlify and communicate with a separate backend API.

### Deployment Configuration

- **Base directory**: Leave empty
- **Build command**: Leave empty (or use `echo "No build step needed"`)
- **Publish directory**: `public`

### Backend API Configuration

To connect this frontend with your backend API, edit the `js/config.js` file:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-backend-api-url.com/api',
    // Other configuration settings...
};
```

## Demo Access

For demonstration purposes, you can log in with the following credentials:

- Username: `admin`
- Password: `admin123`

## Local Development

To run this frontend locally for development:

1. Clone this repository
2. Change to the `public` directory
3. Run with a local web server (e.g., `python -m http.server` or use a tool like Live Server in VS Code)

## License

Copyright © 2025 Notary Voice Agent 