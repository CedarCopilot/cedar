import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Gmail API scopes
export const GMAIL_SCOPES = [
	'https://www.googleapis.com/auth/gmail.readonly',
	'https://www.googleapis.com/auth/gmail.send',
	'https://www.googleapis.com/auth/gmail.compose',
	'https://www.googleapis.com/auth/gmail.modify',
	'https://www.googleapis.com/auth/gmail.labels',
];

// Initialize OAuth2 client
export function getOAuth2Client(): OAuth2Client {
	return new google.auth.OAuth2(
		process.env.GOOGLE_CLIENT_ID,
		process.env.GOOGLE_CLIENT_SECRET,
		process.env.GOOGLE_REDIRECT_URI ||
			'http://localhost:3000/examples/email/api/auth/google/callback'
	);
}

// Generate auth URL
export function getAuthUrl(state?: string): string {
	const oauth2Client = getOAuth2Client();

	return oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: GMAIL_SCOPES,
		state: state,
		prompt: 'consent', // Force consent screen to get refresh token
	});
}

// Get tokens from authorization code
export async function getTokensFromCode(code: string) {
	const oauth2Client = getOAuth2Client();
	const { tokens } = await oauth2Client.getToken(code);
	return tokens;
}

// Create authenticated Gmail client
export function createGmailClient(tokens: {
	access_token?: string | null;
	refresh_token?: string | null;
	expiry_date?: number | null;
	token_type?: string | null;
	scope?: string;
}) {
	const oauth2Client = getOAuth2Client();
	oauth2Client.setCredentials(tokens);

	return google.gmail({ version: 'v1', auth: oauth2Client });
}
