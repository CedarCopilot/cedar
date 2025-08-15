import { NextResponse } from 'next/server';
import { getAuthUrl } from '../../../gmail/lib/auth';

export async function GET() {
	try {
		// Check if environment variables are set
		if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
			console.error(
				'Missing Google OAuth credentials in environment variables'
			);
			console.error(
				'GOOGLE_CLIENT_ID:',
				process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing'
			);
			console.error(
				'GOOGLE_CLIENT_SECRET:',
				process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing'
			);

			return NextResponse.redirect('/examples/email?error=config_missing');
		}

		// Generate a random state for security
		const state = Math.random().toString(36).substring(7);

		// Get the auth URL
		const authUrl = getAuthUrl(state);
		console.log('Generated auth URL:', authUrl); // Debug log

		// Store state in a cookie for verification later
		const response = NextResponse.redirect(authUrl);
		response.cookies.set('gmail_auth_state', state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 10, // 10 minutes
		});

		return response;
	} catch (error) {
		console.error('Error initiating Google auth:', error);
		return NextResponse.redirect('/examples/email?error=auth_failed');
	}
}
