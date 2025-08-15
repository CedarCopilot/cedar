export interface Email {
	id: string;
	threadId: string;
	from: EmailAddress;
	to: EmailAddress[];
	cc?: EmailAddress[];
	bcc?: EmailAddress[];
	subject: string;
	body: string;
	bodyPreview: string;
	date: Date;
	isRead: boolean;
	isStarred: boolean;
	isImportant: boolean;
	isDraft: boolean;
	isSent: boolean;
	isTrash: boolean;
	isSpam: boolean;
	labels: Label[];
	attachments?: Attachment[];
	inReplyTo?: string;
	references?: string[];
}

export interface EmailAddress {
	email: string;
	name?: string;
	avatar?: string;
}

export interface Label {
	id: string;
	name: string;
	color: string;
}

export interface Attachment {
	id: string;
	filename: string;
	size: number;
	mimeType: string;
	url?: string;
}

export interface EmailThread {
	id: string;
	emails: Email[];
	subject: string;
	participants: EmailAddress[];
	lastMessageDate: Date;
	unreadCount: number;
	isStarred: boolean;
	isImportant: boolean;
	labels: Label[];
}

export interface ComposeEmailData {
	to: EmailAddress[];
	cc?: EmailAddress[];
	bcc?: EmailAddress[];
	subject: string;
	body: string;
	attachments?: Attachment[];
	isDraft?: boolean;
	inReplyTo?: string;
}

export interface ComposeDraft {
	id: string;
	mode: 'new' | 'reply' | 'replyAll' | 'forward';
	data: Partial<ComposeEmailData>;
	isMinimized?: boolean;
	isFullscreen?: boolean;
	createdAt: Date;
	isInline?: boolean; // For inline compose in email detail pages
	parentEmailId?: string; // For inline compose, the email being replied to
}

export type EmailView =
	| 'inbox'
	| 'starred'
	| 'important'
	| 'sent'
	| 'drafts'
	| 'trash'
	| 'spam'
	| 'all';

export interface EmailFilter {
	view: EmailView;
	searchQuery?: string;
	labels?: string[];
	hasAttachment?: boolean;
	isUnread?: boolean;
	dateRange?: {
		from: Date;
		to: Date;
	};
}

export interface EmailSettings {
	displayDensity: 'comfortable' | 'cozy' | 'compact';
	theme: 'light' | 'dark';
	conversationView: boolean;
	previewPane: boolean;
	readingPane: 'right' | 'bottom' | 'off';
}
