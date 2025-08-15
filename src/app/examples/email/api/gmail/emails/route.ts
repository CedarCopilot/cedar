import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createGmailClient } from '@/app/examples/email/gmail/lib/auth';
import { listGmailEmails } from '@/app/examples/email/gmail/lib/service';

export async function GET(request: NextRequest) {
	try {
		// Get tokens from cookies
		const cookieStore = await cookies();
		const tokensString = cookieStore.get('gmail_tokens')?.value;

		if (!tokensString) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		const tokens = JSON.parse(tokensString);
		const gmail = createGmailClient(tokens);

		// Get query parameters
		const searchParams = request.nextUrl.searchParams;
		const query = searchParams.get('q') || undefined;
		const maxResults = parseInt(searchParams.get('maxResults') || '50');

		// Fetch emails
		const emails = await listGmailEmails(gmail, query, maxResults);

		return NextResponse.json({ emails });
	} catch (error) {
		console.error('Error fetching Gmail emails:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch emails' },
			{ status: 500 }
		);
	}
}
