import { StateCreator } from 'zustand';
import { CedarStore } from '../types';
import type {
	Message,
	MessageInput,
	MessageRenderer,
	MessageRendererRegistry,
	MessageRendererConfig,
} from './types';

// Define the messages slice
export interface MessagesSlice {
	// State
	messages: Message[];
	isProcessing: boolean;
	showChat: boolean;

	// Message renderer registry
	messageRenderers: MessageRendererRegistry;

	// Actions
	setMessages: (messages: Message[]) => void;
	addMessage: (message: MessageInput) => Message;
	updateMessage: (id: string, updates: Partial<Message>) => void;
	deleteMessage: (id: string) => void;
	clearMessages: () => void;
	setIsProcessing: (isProcessing: boolean) => void;
	setShowChat: (showChat: boolean) => void;

	// Renderer management
	registerMessageRenderer: (type: string, renderer: MessageRenderer) => void;
	unregisterMessageRenderer: (type: string) => void;
	getMessageRenderer: (type: string) => MessageRenderer | undefined;

	// Utility methods
	getMessageById: (id: string) => Message | undefined;
	getMessagesByRole: (role: Message['role']) => Message[];
}

// Create the messages slice
export const createMessagesSlice: StateCreator<
	CedarStore,
	[],
	[],
	MessagesSlice
> = (set, get) => {
	return {
		// Default state
		messages: [],
		isProcessing: false,
		showChat: false,
		messageRenderers: {},

		// Actions
		setMessages: (messages: Message[]) => set({ messages }),

		setShowChat: (showChat: boolean) => set({ showChat }),

		addMessage: (messageData: MessageInput): Message => {
			const newMessage: Message = {
				...messageData,
				id: `message-${Date.now()}-${Math.random()
					.toString(36)
					.substring(2, 9)}`,
				createdAt: new Date().toISOString(),
			} as unknown as Message;

			set((state) => ({
				messages: [...state.messages, newMessage],
			}));

			return newMessage;
		},

		updateMessage: (id: string, updates: Partial<Message>) => {
			set((state) => ({
				messages: state.messages.map((msg) =>
					msg.id === id ? ({ ...msg, ...updates } as Message) : msg
				),
			}));
		},

		deleteMessage: (id: string) => {
			set((state) => ({
				messages: state.messages.filter((msg) => msg.id !== id),
			}));
		},

		clearMessages: () => set({ messages: [] }),

		setIsProcessing: (isProcessing: boolean) => set({ isProcessing }),

		// Renderer management
		registerMessageRenderer: (type: string, renderer: MessageRenderer) => {
			set((state) => ({
				messageRenderers: {
					...state.messageRenderers,
					[type]: renderer,
				},
			}));
		},

		unregisterMessageRenderer: (type: string) => {
			set((state) => {
				const { [type]: removed, ...rest } = state.messageRenderers;
				// Use the variable to avoid linter warning
				void removed;
				return { messageRenderers: rest };
			});
		},

		getMessageRenderer: (type: string) => {
			return get().messageRenderers[type];
		},

		// Utility methods
		getMessageById: (id: string) => {
			return get().messages.find((msg) => msg.id === id);
		},

		getMessagesByRole: (role: Message['role']) => {
			return get().messages.filter((msg) => msg.role === role);
		},
	};
};
