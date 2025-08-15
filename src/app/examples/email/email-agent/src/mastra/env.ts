import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

// Export environment variables with validation
export const env = {
	OPENAI_API_KEY: process.env.OPENAI_API_KEY,
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI:
		process.env.GOOGLE_REDIRECT_URI ||
		'http://localhost:3000/examples/email/api/auth/google/callback',
};

// Validate required environment variables
if (!env.OPENAI_API_KEY) {
	console.warn('WARNING: OPENAI_API_KEY is not set in environment variables');
	console.warn('Voice features will not work without it');
}
