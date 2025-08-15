import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createGmailClient } from '@/app/examples/email/gmail/lib/auth';
import { getGmailLabels } from '@/app/examples/email/gmail/lib/service';

export async function GET() {
	try {
		// Get tokens from cookies
		const cookieStore = await cookies();
		const tokensString = cookieStore.get('gmail_tokens')?.value;

		if (!tokensString) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		const tokens = JSON.parse(tokensString);
		const gmail = createGmailClient(tokens);

		// Fetch labels
		const labels = await getGmailLabels(gmail);

		return NextResponse.json({ labels });
	} catch (error) {
		console.error('Error fetching Gmail labels:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch labels' },
			{ status: 500 }
		);
	}
}
