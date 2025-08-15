import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Email schema definitions
const EmailAddressSchema = z.object({
	email: z.string().email(),
	name: z.string().optional(),
});

const EmailSchema = z.object({
	id: z.string(),
	subject: z.string(),
	from: EmailAddressSchema,
	to: z.array(EmailAddressSchema),
	cc: z.array(EmailAddressSchema).optional(),
	bcc: z.array(EmailAddressSchema).optional(),
	body: z.string(),
	date: z.string(),
	isRead: z.boolean(),
	isStarred: z.boolean(),
	isImportant: z.boolean(),
	labels: z.array(z.string()),
});

// Tool to compose an email
export const composeEmailTool = createTool({
	id: 'compose-email',
	description: 'Compose a new email with the given details',
	inputSchema: z.object({
		to: z
			.array(z.string().email())
			.describe('List of recipient email addresses'),
		subject: z.string().describe('Email subject'),
		body: z.string().describe('Email body content'),
		cc: z.array(z.string().email()).optional().describe('CC recipients'),
		bcc: z.array(z.string().email()).optional().describe('BCC recipients'),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		draft: z.object({
			to: z.array(EmailAddressSchema),
			subject: z.string(),
			body: z.string(),
			cc: z.array(EmailAddressSchema).optional(),
			bcc: z.array(EmailAddressSchema).optional(),
		}),
	}),
	execute: async ({ context }) => {
		const draft = {
			to: context.to.map((email) => ({ email })),
			subject: context.subject,
			body: context.body,
			cc: context.cc?.map((email) => ({ email })),
			bcc: context.bcc?.map((email) => ({ email })),
		};

		return {
			success: true,
			draft,
		};
	},
});

// Tool to summarize an email or email thread
export const summarizeEmailTool = createTool({
	id: 'summarize-email',
	description: 'Summarize the content of an email or email thread',
	inputSchema: z.object({
		emails: z.array(EmailSchema).describe('Email(s) to summarize'),
		style: z
			.enum(['brief', 'detailed', 'action-items'])
			.optional()
			.default('brief'),
	}),
	outputSchema: z.object({
		summary: z.string(),
		keyPoints: z.array(z.string()),
		actionItems: z.array(z.string()).optional(),
	}),
	execute: async ({ context }) => {
		// In a real implementation, this would use AI to summarize
		// For now, we'll create a basic summary based on the emails

		const summary = `Thread with ${context.emails.length} email(s) about "${context.emails[0].subject}"`;
		const keyPoints = [
			`Started by ${
				context.emails[0].from.name || context.emails[0].from.email
			}`,
			`${context.emails.length} messages in thread`,
			`Latest message on ${context.emails[context.emails.length - 1].date}`,
		];

		return {
			summary,
			keyPoints,
			actionItems:
				context.style === 'action-items'
					? ['Review and respond', 'Follow up if needed']
					: undefined,
		};
	},
});

// Tool to search emails
export const searchEmailsTool = createTool({
	id: 'search-emails',
	description: 'Search for emails based on various criteria',
	inputSchema: z.object({
		query: z.string().optional().describe('Search query'),
		from: z.string().optional().describe('Sender email or name'),
		to: z.string().optional().describe('Recipient email or name'),
		subject: z.string().optional().describe('Subject contains'),
		hasAttachment: z.boolean().optional().describe('Has attachments'),
		isUnread: z.boolean().optional().describe('Only unread emails'),
		isStarred: z.boolean().optional().describe('Only starred emails'),
		label: z.string().optional().describe('Has specific label'),
		dateFrom: z.string().optional().describe('Emails after this date'),
		dateTo: z.string().optional().describe('Emails before this date'),
	}),
	outputSchema: z.object({
		results: z.array(EmailSchema),
		count: z.number(),
	}),
	execute: async () => {
		// Mock implementation - in real app, this would query the email store
		return {
			results: [],
			count: 0,
		};
	},
});

// Tool to generate email reply
export const generateReplyTool = createTool({
	id: 'generate-reply',
	description: 'Generate a reply to an email',
	inputSchema: z.object({
		originalEmail: EmailSchema.describe('The email to reply to'),
		tone: z
			.enum(['formal', 'casual', 'friendly', 'professional'])
			.optional()
			.default('professional'),
		includeContext: z.boolean().optional().default(true),
		keyPoints: z
			.array(z.string())
			.optional()
			.describe('Key points to include in the reply'),
	}),
	outputSchema: z.object({
		subject: z.string(),
		body: z.string(),
		to: z.array(EmailAddressSchema),
	}),
	execute: async ({ context }) => {
		const { originalEmail, tone, keyPoints } = context;

		// Generate appropriate subject
		const subject = originalEmail.subject.startsWith('Re:')
			? originalEmail.subject
			: `Re: ${originalEmail.subject}`;

		// Generate reply body based on tone
		let greeting = '';
		let closing = '';

		switch (tone) {
			case 'formal':
				greeting = `Dear ${originalEmail.from.name || 'Sir/Madam'}`;
				closing = 'Yours sincerely';
				break;
			case 'casual':
				greeting = `Hey ${originalEmail.from.name?.split(' ')[0] || 'there'}`;
				closing = 'Cheers';
				break;
			case 'friendly':
				greeting = `Hi ${originalEmail.from.name?.split(' ')[0] || 'there'}`;
				closing = 'Best regards';
				break;
			case 'professional':
			default:
				greeting = `Hello ${originalEmail.from.name || ''}`;
				closing = 'Best regards';
				break;
		}

		const body = `${greeting},

Thank you for your email regarding "${originalEmail.subject}".

${keyPoints ? keyPoints.map((point) => `• ${point}`).join('\n') + '\n\n' : ''}

I'll review this and get back to you shortly.

${closing},
[Your Name]`;

		return {
			subject,
			body,
			to: [originalEmail.from],
		};
	},
});

// Tool to organize emails with labels
export const organizeEmailTool = createTool({
	id: 'organize-email',
	description: 'Organize emails by applying labels or moving to folders',
	inputSchema: z.object({
		emailIds: z.array(z.string()).describe('Email IDs to organize'),
		action: z.enum(['label', 'archive', 'delete', 'star', 'mark-important']),
		label: z
			.string()
			.optional()
			.describe('Label to apply (if action is label)'),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		affectedCount: z.number(),
		message: z.string(),
	}),
	execute: async ({ context }) => {
		const { emailIds, action, label } = context;

		let message = '';
		switch (action) {
			case 'label':
				message = `Applied label "${label}" to ${emailIds.length} email(s)`;
				break;
			case 'archive':
				message = `Archived ${emailIds.length} email(s)`;
				break;
			case 'delete':
				message = `Deleted ${emailIds.length} email(s)`;
				break;
			case 'star':
				message = `Starred ${emailIds.length} email(s)`;
				break;
			case 'mark-important':
				message = `Marked ${emailIds.length} email(s) as important`;
				break;
		}

		return {
			success: true,
			affectedCount: emailIds.length,
			message,
		};
	},
});

// Tool to analyze email patterns
export const analyzeEmailPatternsTool = createTool({
	id: 'analyze-email-patterns',
	description: 'Analyze email patterns and provide insights',
	inputSchema: z.object({
		timeRange: z
			.enum(['day', 'week', 'month', 'year'])
			.optional()
			.default('week'),
		analysisType: z
			.enum(['volume', 'senders', 'response-time', 'categories'])
			.optional()
			.default('volume'),
	}),
	outputSchema: z.object({
		insights: z.array(z.string()),
		statistics: z.record(z.any()),
		recommendations: z.array(z.string()),
	}),
	execute: async ({ context }) => {
		const { timeRange } = context;

		// Mock analysis results
		const insights = [
			`You receive an average of 50 emails per ${timeRange}`,
			`Peak email time is between 9 AM and 11 AM`,
			`30% of emails remain unread after 24 hours`,
		];

		const statistics = {
			totalEmails: 350,
			unreadEmails: 105,
			averageResponseTime: '4 hours',
			topSenders: ['john@example.com', 'team@company.com'],
		};

		const recommendations = [
			'Consider setting up filters for newsletter emails',
			'Schedule dedicated time for email processing',
			'Use labels to organize project-related emails',
		];

		return {
			insights,
			statistics,
			recommendations,
		};
	},
});

// Export all tools
export const emailTools = {
	composeEmailTool,
	summarizeEmailTool,
	searchEmailsTool,
	generateReplyTool,
	organizeEmailTool,
	analyzeEmailPatternsTool,
};
