import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createGmailClient } from '../../../gmail/lib/auth';
import { sendGmailEmail } from '../../../gmail/lib/service';

export async function POST(request: NextRequest) {
	try {
		// Get tokens from cookies
		const cookieStore = await cookies();
		const tokensString = cookieStore.get('gmail_tokens')?.value;

		if (!tokensString) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		const tokens = JSON.parse(tokensString);
		const gmail = createGmailClient(tokens);

		// Get email data from request body
		const { to, subject, body, cc, bcc } = await request.json();

		if (!to || !subject || !body) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			);
		}

		// Send email
		await sendGmailEmail(gmail, to, subject, body, cc, bcc);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error sending Gmail email:', error);
		return NextResponse.json(
			{ error: 'Failed to send email' },
			{ status: 500 }
		);
	}
}
