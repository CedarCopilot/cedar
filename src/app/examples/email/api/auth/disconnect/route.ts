import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
	try {
		const cookieStore = await cookies();

		// Clear Gmail tokens
		cookieStore.delete('gmail_tokens');
		cookieStore.delete('gmail_auth_state');

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error disconnecting Gmail:', error);
		return NextResponse.json(
			{ error: 'Failed to disconnect' },
			{ status: 500 }
		);
	}
}
