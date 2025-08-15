# Adding Google Credentials to Your Project

## Quick Setup

You need to add your Google OAuth credentials to the `.env` file in the project root.

### Step 1: Add to .env file

Add these lines to your `.env` file (located at the project root):

```bash
# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/examples/email/api/auth/google/callback
```

### Step 2: Get Your Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Credentials"
4. Find your OAuth 2.0 Client ID
5. Click on it to see the Client ID and Client Secret
6. Copy and paste them into your `.env` file

### Step 3: Verify Redirect URI

Make sure your OAuth client in Google Cloud Console has this redirect URI:

- `http://localhost:3000/examples/email/api/auth/google/callback`

### Step 4: Restart Your Development Server

After adding the credentials, restart your Next.js development server:

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

### Example .env file

Your `.env` file should look something like this:

```
# Other environment variables...

# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-1234567890abcdefghijk
GOOGLE_REDIRECT_URI=http://localhost:3000/examples/email/api/auth/google/callback
```

### Troubleshooting

If you still get errors:

1. **Check the console logs** - The API route now logs whether credentials are found
2. **Verify the redirect URI** matches exactly in Google Cloud Console
3. **Make sure the Gmail API is enabled** in your Google Cloud project
4. **Check that your email is in the test users list** if the app is in testing mode

### Security Note

- Never commit your `.env` file to Git
- Keep your credentials secret
- In production, use environment variables from your hosting provider
