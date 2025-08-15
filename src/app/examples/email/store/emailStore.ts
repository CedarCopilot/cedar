import { create } from 'zustand';
import {
	Email,
	EmailFilter,
	EmailSettings,
	EmailView,
	ComposeEmailData,
	ComposeDraft,
	Label,
	EmailThread,
} from '../types';

interface EmailStore {
	// Email data
	emails: Email[];
	threads: EmailThread[];
	labels: Label[];

	// UI State
	selectedEmailIds: string[];
	selectedThreadId: string | null;

	// Compose drafts (multiple compose windows)
	composeDrafts: ComposeDraft[];

	// Legacy single compose support (for backward compatibility)
	isComposeOpen: boolean;
	composeMode: 'new' | 'reply' | 'replyAll' | 'forward';
	composeData: Partial<ComposeEmailData>;

	// Filter and search
	filter: EmailFilter;
	searchQuery: string;

	// Settings
	settings: EmailSettings;

	// Gmail integration
	isGmailConnected: boolean;
	isLoading: boolean;
	error: string | null;

	// Actions
	setEmails: (emails: Email[]) => void;
	addEmail: (email: Email) => void;
	updateEmail: (id: string, updates: Partial<Email>) => void;
	deleteEmails: (ids: string[]) => void;

	// Thread actions
	setThreads: (threads: EmailThread[]) => void;
	selectThread: (threadId: string | null) => void;

	// Selection actions
	selectEmail: (id: string) => void;
	selectMultipleEmails: (ids: string[]) => void;
	clearSelection: () => void;
	toggleEmailSelection: (id: string) => void;
	selectAllEmails: () => void;

	// Email actions
	markAsRead: (ids: string[]) => void;
	markAsUnread: (ids: string[]) => void;
	toggleStar: (id: string) => void;
	toggleImportant: (id: string) => void;
	moveToTrash: (ids: string[]) => void;
	moveToSpam: (ids: string[]) => void;
	permanentlyDelete: (ids: string[]) => void;
	applyLabel: (ids: string[], labelId: string) => void;
	removeLabel: (ids: string[], labelId: string) => void;

	// Compose actions (legacy)
	openCompose: (
		mode: 'new' | 'reply' | 'replyAll' | 'forward',
		email?: Email
	) => void;
	closeCompose: () => void;
	updateComposeData: (data: Partial<ComposeEmailData>) => void;
	sendEmail: () => void;
	saveDraft: () => void;

	// Multiple compose drafts actions
	createComposeDraft: (
		mode: 'new' | 'reply' | 'replyAll' | 'forward',
		email?: Email,
		isInline?: boolean,
		parentEmailId?: string
	) => string;
	updateComposeDraft: (id: string, updates: Partial<ComposeDraft>) => void;
	updateComposeDraftData: (id: string, data: Partial<ComposeEmailData>) => void;
	closeComposeDraft: (id: string) => void;
	sendEmailFromDraft: (id: string) => void;
	saveDraftFromCompose: (id: string) => void;

	// Filter and search
	setFilter: (filter: Partial<EmailFilter>) => void;
	setSearchQuery: (query: string) => void;
	setView: (view: EmailView) => void;

	// Settings
	updateSettings: (settings: Partial<EmailSettings>) => void;

	// Label management
	addLabel: (label: Label) => void;
	updateLabel: (id: string, updates: Partial<Label>) => void;
	deleteLabel: (id: string) => void;
}

// Mock data generator
const generateMockEmails = (): Email[] => {
	const senders = [
		{
			email: 'john.doe@gmail.com',
			name: 'John Doe',
			avatar: 'https://i.pravatar.cc/150?u=john',
		},
		{
			email: 'jane.smith@gmail.com',
			name: 'Jane Smith',
			avatar: 'https://i.pravatar.cc/150?u=jane',
		},
		{
			email: 'team@github.com',
			name: 'GitHub',
			avatar: 'https://i.pravatar.cc/150?u=github',
		},
		{
			email: 'noreply@medium.com',
			name: 'Medium Daily Digest',
			avatar: 'https://i.pravatar.cc/150?u=medium',
		},
		{
			email: 'notifications@linkedin.com',
			name: 'LinkedIn',
			avatar: 'https://i.pravatar.cc/150?u=linkedin',
		},
	];

	const subjects = [
		'Meeting tomorrow at 3 PM',
		'Project update - Q4 2024',
		'Your pull request has been merged',
		'New article: "10 Tips for Better Code"',
		'Someone viewed your profile',
		'Weekly team sync notes',
		'Important: Security update required',
		'Invitation: Product launch event',
		'Your order has been shipped',
		'Reminder: Submit your timesheet',
	];

	const bodies = [
		'Hi there,\n\nI wanted to reach out about our upcoming meeting. Please make sure to review the attached documents before we meet.\n\nBest regards',
		"Hello team,\n\nHere's a quick update on our project progress. We've completed 75% of the planned features and are on track for the deadline.\n\nThanks",
		'Great work on the recent pull request! Your changes have been reviewed and merged into the main branch.\n\nThe CI/CD pipeline has been triggered.',
		"Check out this week's top articles on Medium. We think you'll find them interesting based on your reading history.",
		'Your LinkedIn profile was viewed by 5 people this week. Update your profile to attract more views.',
	];

	const emails: Email[] = [];
	const now = new Date();

	for (let i = 0; i < 50; i++) {
		const sender = senders[Math.floor(Math.random() * senders.length)];
		const subject = subjects[Math.floor(Math.random() * subjects.length)];
		const body = bodies[Math.floor(Math.random() * bodies.length)];
		const date = new Date(
			now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000
		); // Random date within last 30 days

		emails.push({
			id: `email-${i}`,
			threadId: `thread-${Math.floor(i / 3)}`, // Group emails into threads
			from: sender,
			to: [{ email: 'me@gmail.com', name: 'Me' }],
			subject: subject,
			body: body,
			bodyPreview: body.substring(0, 100) + '...',
			date: date,
			isRead: Math.random() > 0.3,
			isStarred: Math.random() > 0.8,
			isImportant: Math.random() > 0.7,
			isDraft: false,
			isSent: false,
			isTrash: false,
			isSpam: false,
			labels: [],
			attachments:
				Math.random() > 0.7
					? [
							{
								id: `attachment-${i}`,
								filename: 'document.pdf',
								size: 1024 * 1024 * Math.random() * 10,
								mimeType: 'application/pdf',
							},
					  ]
					: undefined,
		});
	}

	return emails;
};

const mockLabels: Label[] = [
	{ id: 'work', name: 'Work', color: '#4285f4' },
	{ id: 'personal', name: 'Personal', color: '#0f9d58' },
	{ id: 'important', name: 'Important', color: '#ea4335' },
	{ id: 'todo', name: 'To Do', color: '#fbbc04' },
	{ id: 'projects', name: 'Projects', color: '#673ab7' },
];

export const useEmailStore = create<EmailStore>((set, get) => ({
	// Initial state
	emails: generateMockEmails(),
	threads: [],
	labels: mockLabels,
	selectedEmailIds: [],
	selectedThreadId: null,

	// Multiple compose drafts
	composeDrafts: [],

	// Legacy single compose
	isComposeOpen: false,
	composeMode: 'new',
	composeData: {},
	filter: { view: 'inbox' },
	searchQuery: '',
	settings: {
		displayDensity: 'comfortable',
		theme: 'light',
		conversationView: true,
		previewPane: true,
		readingPane: 'right',
	},
	isGmailConnected: false,
	isLoading: false,
	error: null,

	// Actions
	setEmails: (emails) => set({ emails }),

	addEmail: (email) =>
		set((state) => ({
			emails: [...state.emails, email],
		})),

	updateEmail: (id, updates) =>
		set((state) => ({
			emails: state.emails.map((email) =>
				email.id === id ? { ...email, ...updates } : email
			),
		})),

	deleteEmails: (ids) =>
		set((state) => ({
			emails: state.emails.filter((email) => !ids.includes(email.id)),
			selectedEmailIds: state.selectedEmailIds.filter(
				(id) => !ids.includes(id)
			),
		})),

	// Thread actions
	setThreads: (threads) => set({ threads }),
	selectThread: (threadId) => set({ selectedThreadId: threadId }),

	// Selection actions
	selectEmail: (id) => set({ selectedEmailIds: [id] }),

	selectMultipleEmails: (ids) => set({ selectedEmailIds: ids }),

	clearSelection: () => set({ selectedEmailIds: [] }),

	toggleEmailSelection: (id) =>
		set((state) => ({
			selectedEmailIds: state.selectedEmailIds.includes(id)
				? state.selectedEmailIds.filter((emailId) => emailId !== id)
				: [...state.selectedEmailIds, id],
		})),

	selectAllEmails: () =>
		set((state) => {
			const visibleEmails = state.emails.filter((email) => {
				switch (state.filter.view) {
					case 'inbox':
						return (
							!email.isSent && !email.isDraft && !email.isTrash && !email.isSpam
						);
					case 'starred':
						return email.isStarred;
					case 'important':
						return email.isImportant;
					case 'sent':
						return email.isSent;
					case 'drafts':
						return email.isDraft;
					case 'trash':
						return email.isTrash;
					case 'spam':
						return email.isSpam;
					default:
						return true;
				}
			});
			return { selectedEmailIds: visibleEmails.map((email) => email.id) };
		}),

	// Email actions
	markAsRead: (ids) =>
		set((state) => ({
			emails: state.emails.map((email) =>
				ids.includes(email.id) ? { ...email, isRead: true } : email
			),
		})),

	markAsUnread: (ids) =>
		set((state) => ({
			emails: state.emails.map((email) =>
				ids.includes(email.id) ? { ...email, isRead: false } : email
			),
		})),

	toggleStar: (id) =>
		set((state) => ({
			emails: state.emails.map((email) =>
				email.id === id ? { ...email, isStarred: !email.isStarred } : email
			),
		})),

	toggleImportant: (id) =>
		set((state) => ({
			emails: state.emails.map((email) =>
				email.id === id ? { ...email, isImportant: !email.isImportant } : email
			),
		})),

	moveToTrash: (ids) =>
		set((state) => ({
			emails: state.emails.map((email) =>
				ids.includes(email.id) ? { ...email, isTrash: true } : email
			),
			selectedEmailIds: [],
		})),

	moveToSpam: (ids) =>
		set((state) => ({
			emails: state.emails.map((email) =>
				ids.includes(email.id) ? { ...email, isSpam: true } : email
			),
			selectedEmailIds: [],
		})),

	permanentlyDelete: (ids) =>
		set((state) => ({
			emails: state.emails.filter((email) => !ids.includes(email.id)),
			selectedEmailIds: [],
		})),

	applyLabel: (ids, labelId) =>
		set((state) => ({
			emails: state.emails.map((email) => {
				if (ids.includes(email.id)) {
					const label = state.labels.find((l) => l.id === labelId);
					if (label && !email.labels.some((l) => l.id === labelId)) {
						return { ...email, labels: [...email.labels, label] };
					}
				}
				return email;
			}),
		})),

	removeLabel: (ids, labelId) =>
		set((state) => ({
			emails: state.emails.map((email) =>
				ids.includes(email.id)
					? { ...email, labels: email.labels.filter((l) => l.id !== labelId) }
					: email
			),
		})),

	// Compose actions
	openCompose: (mode, email) => {
		let composeData: Partial<ComposeEmailData> = {};

		if (email && mode !== 'new') {
			switch (mode) {
				case 'reply':
					composeData = {
						to: [email.from],
						subject: `Re: ${email.subject}`,
						inReplyTo: email.id,
					};
					break;
				case 'replyAll':
					composeData = {
						to: [
							email.from,
							...email.to.filter((addr) => addr.email !== 'me@gmail.com'),
						],
						cc: email.cc,
						subject: `Re: ${email.subject}`,
						inReplyTo: email.id,
					};
					break;
				case 'forward':
					composeData = {
						subject: `Fwd: ${email.subject}`,
						body: `\n\n---------- Forwarded message ---------\nFrom: ${
							email.from.name || email.from.email
						}\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.body}`,
					};
					break;
			}
		}

		set({ isComposeOpen: true, composeMode: mode, composeData });
	},

	closeCompose: () => set({ isComposeOpen: false, composeData: {} }),

	updateComposeData: (data) =>
		set((state) => ({
			composeData: { ...state.composeData, ...data },
		})),

	sendEmail: () => {
		const { composeData } = get();
		const newEmail: Email = {
			id: `email-${Date.now()}`,
			threadId: `thread-${Date.now()}`,
			from: { email: 'me@gmail.com', name: 'Me' },
			to: composeData.to || [],
			cc: composeData.cc,
			bcc: composeData.bcc,
			subject: composeData.subject || '',
			body: composeData.body || '',
			bodyPreview: (composeData.body || '').substring(0, 100) + '...',
			date: new Date(),
			isRead: true,
			isStarred: false,
			isImportant: false,
			isDraft: false,
			isSent: true,
			isTrash: false,
			isSpam: false,
			labels: [],
			attachments: composeData.attachments,
			inReplyTo: composeData.inReplyTo,
		};

		set((state) => ({
			emails: [...state.emails, newEmail],
			isComposeOpen: false,
			composeData: {},
		}));
	},

	saveDraft: () => {
		const { composeData } = get();
		const draftEmail: Email = {
			id: `draft-${Date.now()}`,
			threadId: `thread-${Date.now()}`,
			from: { email: 'me@gmail.com', name: 'Me' },
			to: composeData.to || [],
			cc: composeData.cc,
			bcc: composeData.bcc,
			subject: composeData.subject || '',
			body: composeData.body || '',
			bodyPreview: (composeData.body || '').substring(0, 100) + '...',
			date: new Date(),
			isRead: true,
			isStarred: false,
			isImportant: false,
			isDraft: true,
			isSent: false,
			isTrash: false,
			isSpam: false,
			labels: [],
			attachments: composeData.attachments,
		};

		set((state) => ({
			emails: [...state.emails, draftEmail],
			isComposeOpen: false,
			composeData: {},
		}));
	},

	// Multiple compose drafts actions
	createComposeDraft: (mode, email, isInline = false, parentEmailId) => {
		const draftId = `compose-${Date.now()}-${Math.random()
			.toString(36)
			.substr(2, 9)}`;
		let composeData: Partial<ComposeEmailData> = {};

		if (email && mode !== 'new') {
			switch (mode) {
				case 'reply':
					composeData = {
						to: [email.from],
						subject: `Re: ${email.subject}`,
						inReplyTo: email.id,
					};
					break;
				case 'replyAll':
					composeData = {
						to: [
							email.from,
							...email.to.filter((addr) => addr.email !== 'me@gmail.com'),
						],
						cc: email.cc,
						subject: `Re: ${email.subject}`,
						inReplyTo: email.id,
					};
					break;
				case 'forward':
					composeData = {
						subject: `Fwd: ${email.subject}`,
						body: `\n\n---------- Forwarded message ---------\nFrom: ${
							email.from.name || email.from.email
						}\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.body}`,
					};
					break;
			}
		}

		const newDraft: ComposeDraft = {
			id: draftId,
			mode,
			data: composeData,
			isMinimized: false,
			isFullscreen: false,
			createdAt: new Date(),
			isInline,
			parentEmailId,
		};

		set((state) => ({
			composeDrafts: [...state.composeDrafts, newDraft],
		}));

		return draftId;
	},

	updateComposeDraft: (id, updates) =>
		set((state) => ({
			composeDrafts: state.composeDrafts.map((draft) =>
				draft.id === id ? { ...draft, ...updates } : draft
			),
		})),

	updateComposeDraftData: (id, data) =>
		set((state) => ({
			composeDrafts: state.composeDrafts.map((draft) =>
				draft.id === id ? { ...draft, data: { ...draft.data, ...data } } : draft
			),
		})),

	closeComposeDraft: (id) =>
		set((state) => ({
			composeDrafts: state.composeDrafts.filter((draft) => draft.id !== id),
		})),

	sendEmailFromDraft: (id) => {
		const { composeDrafts } = get();
		const draft = composeDrafts.find((d) => d.id === id);

		if (!draft) return;

		const newEmail: Email = {
			id: `email-${Date.now()}`,
			threadId: `thread-${Date.now()}`,
			from: { email: 'me@gmail.com', name: 'Me' },
			to: draft.data.to || [],
			cc: draft.data.cc,
			bcc: draft.data.bcc,
			subject: draft.data.subject || '',
			body: draft.data.body || '',
			bodyPreview: (draft.data.body || '').substring(0, 100) + '...',
			date: new Date(),
			isRead: true,
			isStarred: false,
			isImportant: false,
			isDraft: false,
			isSent: true,
			isTrash: false,
			isSpam: false,
			labels: [],
			attachments: draft.data.attachments,
			inReplyTo: draft.data.inReplyTo,
		};

		set((state) => ({
			emails: [...state.emails, newEmail],
			composeDrafts: state.composeDrafts.filter((d) => d.id !== id),
		}));
	},

	saveDraftFromCompose: (id) => {
		const { composeDrafts } = get();
		const draft = composeDrafts.find((d) => d.id === id);

		if (!draft) return;

		const draftEmail: Email = {
			id: `draft-${Date.now()}`,
			threadId: `thread-${Date.now()}`,
			from: { email: 'me@gmail.com', name: 'Me' },
			to: draft.data.to || [],
			cc: draft.data.cc,
			bcc: draft.data.bcc,
			subject: draft.data.subject || '',
			body: draft.data.body || '',
			bodyPreview: (draft.data.body || '').substring(0, 100) + '...',
			date: new Date(),
			isRead: true,
			isStarred: false,
			isImportant: false,
			isDraft: true,
			isSent: false,
			isTrash: false,
			isSpam: false,
			labels: [],
			attachments: draft.data.attachments,
		};

		set((state) => ({
			emails: [...state.emails, draftEmail],
			composeDrafts: state.composeDrafts.filter((d) => d.id !== id),
		}));
	},

	// Filter and search
	setFilter: (filter) =>
		set((state) => ({
			filter: { ...state.filter, ...filter },
		})),

	setSearchQuery: (searchQuery) => set({ searchQuery }),

	setView: (view) =>
		set((state) => ({
			filter: { ...state.filter, view },
		})),

	// Settings
	updateSettings: (settings) =>
		set((state) => ({
			settings: { ...state.settings, ...settings },
		})),

	// Label management
	addLabel: (label) =>
		set((state) => ({
			labels: [...state.labels, label],
		})),

	updateLabel: (id, updates) =>
		set((state) => ({
			labels: state.labels.map((label) =>
				label.id === id ? { ...label, ...updates } : label
			),
		})),

	deleteLabel: (id) =>
		set((state) => ({
			labels: state.labels.filter((label) => label.id !== id),
			emails: state.emails.map((email) => ({
				...email,
				labels: email.labels.filter((label) => label.id !== id),
			})),
		})),
}));
