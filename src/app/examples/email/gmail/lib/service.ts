import { gmail_v1 } from 'googleapis';
import {
	Email,
	EmailAddress,
	Label,
	Attachment,
} from '@/app/examples/email/types';

// Convert Gmail message to our Email type
export async function convertGmailMessage(
	gmail: gmail_v1.Gmail,
	message: gmail_v1.Schema$Message
): Promise<Email> {
	// Get full message details
	const fullMessage = await gmail.users.messages.get({
		userId: 'me',
		id: message.id!,
		format: 'full',
	});

	const msg = fullMessage.data;
	const headers = (msg.payload?.headers ??
		[]) as gmail_v1.Schema$MessagePartHeader[];

	// Extract header values
	const getHeader = (name: string): string =>
		(headers.find(
			(h: gmail_v1.Schema$MessagePartHeader) =>
				h.name?.toLowerCase() === name.toLowerCase()
		)?.value || '') as string;

	// Parse email addresses
	const parseEmailAddress = (headerValue: string): EmailAddress => {
		const match = headerValue.match(/^(.*?)\s*<(.+)>$/);
		if (match) {
			return { name: match[1].trim(), email: match[2].trim() };
		}
		return { email: headerValue.trim() };
	};

	const parseEmailAddresses = (headerValue: string): EmailAddress[] => {
		if (!headerValue) return [];
		return headerValue.split(',').map((addr) => parseEmailAddress(addr.trim()));
	};

	// Extract body
	const getBody = (payload: gmail_v1.Schema$MessagePart): string => {
		if (payload.body?.data) {
			return Buffer.from(payload.body.data, 'base64').toString('utf-8');
		}

		if (payload.parts) {
			for (const part of payload.parts) {
				if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
					const body = getBody(part);
					if (body) return body;
				}
			}
		}

		return '';
	};

	const body = msg.payload ? getBody(msg.payload) : '';
	const bodyPreview = body.substring(0, 100) + (body.length > 100 ? '...' : '');

	// Extract labels
	const labelIds = (msg.labelIds ?? []) as string[];
	const labels: Label[] = labelIds
		.filter(
			(id: string) =>
				![
					'INBOX',
					'SENT',
					'DRAFT',
					'TRASH',
					'SPAM',
					'UNREAD',
					'STARRED',
					'IMPORTANT',
				].includes(id)
		)
		.map((id: string) => ({
			id,
			name: id.replace(/_/g, ' '),
			color: '#4285f4', // Default blue color
		}));

	// Extract attachments
	const attachments: Attachment[] = [];
	const extractAttachments = (parts: gmail_v1.Schema$MessagePart[]) => {
		for (const part of parts) {
			if (part.filename && part.body?.attachmentId) {
				attachments.push({
					id: part.body.attachmentId,
					filename: part.filename,
					size: part.body.size || 0,
					mimeType: part.mimeType || 'application/octet-stream',
				});
			}
			if (part.parts) {
				extractAttachments(part.parts);
			}
		}
	};

	if (msg.payload?.parts) {
		extractAttachments(msg.payload.parts);
	}

	return {
		id: msg.id!,
		threadId: msg.threadId!,
		from: parseEmailAddress(getHeader('from')),
		to: parseEmailAddresses(getHeader('to')),
		cc: parseEmailAddresses(getHeader('cc')),
		bcc: parseEmailAddresses(getHeader('bcc')),
		subject: getHeader('subject'),
		body,
		bodyPreview,
		date: new Date(parseInt(msg.internalDate || '0')),
		isRead: !labelIds.includes('UNREAD'),
		isStarred: labelIds.includes('STARRED'),
		isImportant: labelIds.includes('IMPORTANT'),
		isDraft: labelIds.includes('DRAFT'),
		isSent: labelIds.includes('SENT'),
		isTrash: labelIds.includes('TRASH'),
		isSpam: labelIds.includes('SPAM'),
		labels,
		attachments: attachments.length > 0 ? attachments : undefined,
		inReplyTo: getHeader('in-reply-to') || undefined,
		references: getHeader('references')?.split(' ') || undefined,
	};
}

// List emails from Gmail
export async function listGmailEmails(
	gmail: gmail_v1.Gmail,
	query?: string,
	maxResults: number = 50
): Promise<Email[]> {
	try {
		const response = await gmail.users.messages.list({
			userId: 'me',
			q: query,
			maxResults,
		});

		const messages = response.data.messages || [];
		const emails: Email[] = [];

		// Fetch full details for each message
		for (const message of messages) {
			try {
				const email = await convertGmailMessage(gmail, message);
				emails.push(email);
			} catch (error) {
				console.error(`Error converting message ${message.id}:`, error);
			}
		}

		return emails;
	} catch (error) {
		console.error('Error listing Gmail emails:', error);
		throw error;
	}
}

// Send email via Gmail
export async function sendGmailEmail(
	gmail: gmail_v1.Gmail,
	to: EmailAddress[],
	subject: string,
	body: string,
	cc?: EmailAddress[],
	bcc?: EmailAddress[]
): Promise<void> {
	try {
		// Create email content
		const toAddresses = to
			.map((addr: EmailAddress) =>
				addr.name ? `"${addr.name}" <${addr.email}>` : addr.email
			)
			.join(', ');

		const ccAddresses = cc
			?.map((addr: EmailAddress) =>
				addr.name ? `"${addr.name}" <${addr.email}>` : addr.email
			)
			.join(', ');

		const bccAddresses = bcc
			?.map((addr: EmailAddress) =>
				addr.name ? `"${addr.name}" <${addr.email}>` : addr.email
			)
			.join(', ');

		const emailContent = [
			'Content-Type: text/plain; charset="UTF-8"',
			'MIME-Version: 1.0',
			`To: ${toAddresses}`,
			`Subject: ${subject}`,
		];

		if (ccAddresses) {
			emailContent.push(`Cc: ${ccAddresses}`);
		}
		if (bccAddresses) {
			emailContent.push(`Bcc: ${bccAddresses}`);
		}

		emailContent.push('', body);

		const message = emailContent.join('\n');
		const encodedMessage = Buffer.from(message)
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');

		await gmail.users.messages.send({
			userId: 'me',
			requestBody: {
				raw: encodedMessage,
			},
		});
	} catch (error) {
		console.error('Error sending Gmail email:', error);
		throw error;
	}
}

// Get Gmail labels
export async function getGmailLabels(gmail: gmail_v1.Gmail): Promise<Label[]> {
	try {
		const response = await gmail.users.labels.list({
			userId: 'me',
		});

		const labels = response.data.labels || [];

		return labels
			.filter((label: gmail_v1.Schema$Label) => label.type === 'user') // Only user-created labels
			.map((label: gmail_v1.Schema$Label) => ({
				id: label.id!,
				name: label.name!,
				color: label.color?.backgroundColor || '#4285f4',
			}));
	} catch (error) {
		console.error('Error fetching Gmail labels:', error);
		throw error;
	}
}

// Mark emails as read/unread
export async function modifyGmailMessages(
	gmail: gmail_v1.Gmail,
	messageIds: string[],
	addLabelIds?: string[],
	removeLabelIds?: string[]
): Promise<void> {
	try {
		await gmail.users.messages.batchModify({
			userId: 'me',
			requestBody: {
				ids: messageIds,
				addLabelIds,
				removeLabelIds,
			},
		});
	} catch (error) {
		console.error('Error modifying Gmail messages:', error);
		throw error;
	}
}

// Delete emails permanently
export async function deleteGmailMessages(
	gmail: gmail_v1.Gmail,
	messageIds: string[]
): Promise<void> {
	try {
		for (const id of messageIds) {
			await gmail.users.messages.delete({
				userId: 'me',
				id,
			});
		}
	} catch (error) {
		console.error('Error deleting Gmail messages:', error);
		throw error;
	}
}
