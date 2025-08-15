# Gmail Integration Setup Guide

This guide will help you set up Gmail integration for the email app.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Give your project a name (e.g., "Email App")
4. Click "Create"

## Step 2: Enable Gmail API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:

   - Choose "External" user type
   - Fill in the required fields (app name, user support email, etc.)
   - Add your email to test users
   - Add the following scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.compose`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/gmail.labels`

4. Back in credentials, create OAuth client ID:

   - Application type: "Web application"
   - Name: "Email App Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - Your production URL (if applicable)
   - Authorized redirect URIs:
     - `http://localhost:3000/examples/email/api/auth/google/callback`
     - Your production callback URL (if applicable)

5. Copy the Client ID and Client Secret

## Step 4: Configure Environment Variables

Create a `.env.local` file in your project root:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/examples/email/api/auth/google/callback

# For production, update the redirect URI
# GOOGLE_REDIRECT_URI=https://yourdomain.com/examples/email/api/auth/google/callback
```

## Step 5: Test the Integration

1. Start your Next.js app: `npm run dev`
2. Navigate to `http://localhost:3000/examples/email`
3. Click "Connect Gmail Account"
4. Authorize the app to access your Gmail
5. You should see your real emails appear!

## Security Considerations

1. **Never commit credentials**: Keep your `.env.local` file in `.gitignore`
2. **Use HTTPS in production**: OAuth requires secure connections
3. **Limit scopes**: Only request the permissions you need
4. **Token storage**: In production, store tokens securely (database, encrypted cookies)

## Troubleshooting

### "Redirect URI mismatch" error

- Ensure the redirect URI in Google Cloud Console exactly matches your app's callback URL
- Check for trailing slashes or protocol differences (http vs https)

### "Access blocked" error

- Make sure you've added your email to test users in OAuth consent screen
- Verify the app is not in "Testing" mode if you need broader access

### Emails not loading

- Check browser console for errors
- Verify all required scopes are enabled
- Ensure tokens are being stored and retrieved correctly

## Production Deployment

When deploying to production:

1. Update redirect URIs in Google Cloud Console
2. Update environment variables with production values
3. Implement secure token storage (database instead of cookies)
4. Consider implementing token refresh logic
5. Add error handling for expired tokens

## API Limits

Gmail API has the following limits:

- 250 quota units per user per second
- 1,000,000,000 quota units per day
- Each API call costs different quota units (e.g., list=5, get=5, send=100)

Monitor your usage in Google Cloud Console → APIs & Services → Gmail API → Quotas.

## Next Steps

- Implement token refresh for long-lived sessions
- Add support for attachments
- Implement batch operations for better performance
- Add support for Gmail filters and search operators
- Implement push notifications for new emails
