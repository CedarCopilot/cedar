import type { StateCreator } from 'zustand';
import type { CedarStore } from '@/store/CedarOSTypes';
import { getProviderImplementation } from '@/store/agentConnection/providers/index';
import type {
	AISDKParams,
	AISDKStructuredParams,
	AnthropicParams,
	BaseParams,
	CustomParams,
	LLMResponse,
	MastraParams,
	OpenAIParams,
	ProviderConfig,
	StreamHandler,
	StreamResponse,
	StructuredParams,
	VoiceParams,
	VoiceLLMResponse,
	ResponseProcessor,
	ResponseProcessorRegistry,
	StructuredResponseType,
	VoiceStreamHandler,
	VoiceStreamEvent,
} from '@/store/agentConnection/AgentConnectionTypes';

import { useCedarStore } from '@/store/CedarStore';
import { getCedarState } from '@/store/CedarStore';
import { sanitizeJson } from '@/utils/sanitizeJson';
import {
	defaultResponseProcessors,
	initializeResponseProcessorRegistry,
} from './responseProcessors/initializeResponseProcessorRegistry';

// Parameters for sending a message
export interface SendMessageParams {
	model?: string;
	systemPrompt?: string;
	route?: string;
	temperature?: number;
	// Optional conversation/thread ID
	conversationId?: string;
	threadId?: string;
	userId?: string;
	// Enable streaming responses
	stream?: boolean;
	[key: string]: any;
}

// Helper type to get params based on provider config
type GetParamsForConfig<T> = T extends { provider: 'openai' }
	? OpenAIParams
	: T extends { provider: 'anthropic' }
	? AnthropicParams
	: T extends { provider: 'mastra' }
	? MastraParams
	: T extends { provider: 'ai-sdk' }
	? AISDKParams
	: T extends { provider: 'custom' }
	? CustomParams
	: BaseParams;

export interface AgentConnectionSlice {
	// State
	isConnected: boolean;
	isStreaming: boolean;
	providerConfig: ProviderConfig | null;
	currentAbortController: AbortController | null;
	responseProcessors: ResponseProcessorRegistry;

	// Core methods - properly typed based on current provider config
	callLLM: <T extends ProviderConfig = ProviderConfig>(
		params: T extends ProviderConfig
			? GetParamsForConfig<T>
			: ProviderConfig extends infer U
			? GetParamsForConfig<U>
			: never
	) => Promise<LLMResponse>;

	callLLMStructured: <T extends ProviderConfig = ProviderConfig>(
		params: T extends ProviderConfig
			? GetParamsForConfig<T> & StructuredParams
			: ProviderConfig extends infer U
			? GetParamsForConfig<U> & StructuredParams
			: never
	) => Promise<LLMResponse>;

	streamLLM: <T extends ProviderConfig = ProviderConfig>(
		params: T extends ProviderConfig
			? GetParamsForConfig<T>
			: ProviderConfig extends infer U
			? GetParamsForConfig<U>
			: never,
		handler: StreamHandler
	) => StreamResponse;

	// Voice LLM methods
	voiceLLM: (params: VoiceParams) => Promise<VoiceLLMResponse>;
	voiceStreamLLM: (
		params: VoiceParams,
		handler: VoiceStreamHandler
	) => StreamResponse;

	// High-level methods that use callLLM/streamLLM
	sendMessage: (params?: SendMessageParams) => Promise<void>;
	handleLLMResponse: (
		items: (string | StructuredResponseType)[]
	) => Promise<void>;

	// Response processor methods
	registerResponseProcessor: <T extends StructuredResponseType>(
		processor: ResponseProcessor<T>
	) => void;
	getResponseProcessors: (type: string) => ResponseProcessor | undefined;
	processStructuredResponse: (obj: StructuredResponseType) => Promise<boolean>;

	// Configuration methods
	setProviderConfig: (config: ProviderConfig) => void;

	// Connection management
	connect: () => Promise<void>;
	disconnect: () => void;

	// Utility methods
	cancelStream: () => void;

	// Notifications
	notificationInterval?: number;
	subscribeToNotifications: () => void;
	unsubscribeFromNotifications: () => void;
}

// Create a typed version of the slice that knows about the provider
export type TypedAgentConnectionSlice<T extends ProviderConfig> = Omit<
	AgentConnectionSlice,
	'callLLM' | 'streamLLM' | 'callLLMStructured' | 'voiceLLM' | 'voiceStreamLLM'
> & {
	callLLM: (params: GetParamsForConfig<T>) => Promise<LLMResponse>;
	callLLMStructured: (
		params: GetParamsForConfig<T> & StructuredParams
	) => Promise<LLMResponse>;
	streamLLM: (
		params: GetParamsForConfig<T>,
		handler: StreamHandler
	) => StreamResponse;
	voiceLLM: (params: VoiceParams) => Promise<VoiceLLMResponse>;
	voiceStreamLLM: (
		params: VoiceParams,
		handler: VoiceStreamHandler
	) => StreamResponse;
};

export const improvePrompt = async (
	prompt: string,
	handler?: StreamHandler
): Promise<string> => {
	const systemPrompt = `You are an AI assistant that helps improve prompts for clarity and specificity. 
Given a user's prompt, analyze it and enhance it to be more specific, detailed, and effective.
Focus on adding context, clarifying ambiguities, and structuring the prompt for better results.
Return only the improved prompt without explanations or meta-commentary.`;

	const store = useCedarStore.getState();

	if (handler) {
		// Use streaming if handler is provided
		store.streamLLM(
			{
				prompt,
				systemPrompt,
			},
			handler
		);

		// Wait for completion and return the final content
		let improvedPrompt = '';
		const originalHandler = handler;

		await new Promise<void>((resolve) => {
			handler = (event) => {
				if (event.type === 'chunk') {
					improvedPrompt += event.content;
				} else if (event.type === 'done') {
					resolve();
				}
				originalHandler(event);
			};
		});

		return improvedPrompt;
	} else {
		// Use non-streaming version
		const response = await store.callLLM({
			prompt,
			systemPrompt,
			temperature: 0.7,
			maxTokens: 1000,
		});

		return response.content;
	}
};
export const createAgentConnectionSlice: StateCreator<
	CedarStore,
	[],
	[],
	AgentConnectionSlice
> = (set, get) => ({
	// Default state
	isConnected: false,
	isStreaming: false,
	providerConfig: null,
	currentAbortController: null,
	notificationInterval: undefined,
	responseProcessors: initializeResponseProcessorRegistry(
		defaultResponseProcessors as ResponseProcessor<StructuredResponseType>[]
	),

	// Core methods with runtime type checking
	callLLM: async (
		params:
			| OpenAIParams
			| AnthropicParams
			| MastraParams
			| AISDKParams
			| CustomParams
	) => {
		const config = get().providerConfig;
		if (!config) {
			throw new Error('No LLM provider configured');
		}

		// Runtime validation based on provider type
		switch (config.provider) {
			case 'openai':
			case 'anthropic':
				if (!('model' in params)) {
					throw new Error(
						`${config.provider} provider requires 'model' parameter`
					);
				}
				break;
			case 'mastra':
				if (!('route' in params)) {
					throw new Error("Mastra provider requires 'route' parameter");
				}
				break;
			case 'ai-sdk':
				if (!('model' in params)) {
					throw new Error("AI SDK provider requires 'model' parameter");
				}
				break;
		}

		// Log the request
		const requestId = get().logAgentRequest(params, config.provider);

		try {
			const provider = getProviderImplementation(config);
			// Type assertion is safe after runtime validation
			// We need to use unknown here as an intermediate type for the complex union types
			const response = await provider.callLLM(
				params as unknown as never,
				config as never
			);

			// Log the successful response
			get().logAgentResponse(requestId, response);

			return response;
		} catch (error) {
			// Log the error
			get().logAgentError(requestId, error as Error);
			throw error;
		}
	},

	callLLMStructured: async (
		params:
			| (OpenAIParams & StructuredParams)
			| (AnthropicParams & StructuredParams)
			| (MastraParams & StructuredParams)
			| (AISDKParams & AISDKStructuredParams)
			| (CustomParams & StructuredParams)
	) => {
		const config = get().providerConfig;
		if (!config) {
			throw new Error('No LLM provider configured');
		}

		// Runtime validation based on provider type
		switch (config.provider) {
			case 'openai':
			case 'anthropic':
				if (!('model' in params)) {
					throw new Error(
						`${config.provider} provider requires 'model' parameter`
					);
				}
				break;
			case 'mastra':
				if (!('route' in params)) {
					throw new Error("Mastra provider requires 'route' parameter");
				}
				break;
			case 'ai-sdk':
				if (!('model' in params)) {
					throw new Error("AI SDK provider requires 'model' parameter");
				}
				// For AI SDK, validate that schema is a Zod schema at runtime
				if (
					params.schema &&
					typeof params.schema === 'object' &&
					!('_def' in params.schema)
				) {
					throw new Error(
						'AI SDK requires a Zod schema for structured output. Please provide a valid Zod schema.'
					);
				}
				break;
		}

		// Log the request
		const requestId = get().logAgentRequest(params, config.provider);

		try {
			const provider = getProviderImplementation(config);
			// Type assertion is safe after runtime validation
			const response = await provider.callLLMStructured(
				params as unknown as never,
				config as never
			);

			// Log the successful response
			get().logAgentResponse(requestId, response);

			return response;
		} catch (error) {
			// Log the error
			get().logAgentError(requestId, error as Error);
			throw error;
		}
	},

	streamLLM: (
		params:
			| OpenAIParams
			| AnthropicParams
			| MastraParams
			| AISDKParams
			| CustomParams,
		handler: StreamHandler
	) => {
		const config = get().providerConfig;
		if (!config) {
			throw new Error('No LLM provider configured');
		}

		// Runtime validation based on provider type
		switch (config.provider) {
			case 'openai':
			case 'anthropic':
				if (!('model' in params)) {
					throw new Error(
						`${config.provider} provider requires 'model' parameter`
					);
				}
				break;
			case 'mastra':
				if (!('route' in params)) {
					throw new Error("Mastra provider requires 'route' parameter");
				}
				break;
			case 'ai-sdk':
				if (!('model' in params)) {
					throw new Error("AI SDK provider requires 'model' parameter");
				}
				break;
		}

		// Log the stream start
		const streamId = get().logStreamStart(params, config.provider);

		const provider = getProviderImplementation(config);
		const abortController = new AbortController();

		set({ currentAbortController: abortController, isStreaming: true });

		// Wrap the handler to log stream events
		const wrappedHandler: StreamHandler = (event) => {
			if (event.type === 'chunk') {
				get().logStreamChunk(streamId, event.content);
			} else if (event.type === 'done') {
				get().logStreamEnd(streamId, event.completedItems);
			} else if (event.type === 'error') {
				get().logAgentError(streamId, event.error);
			} else if (event.type === 'object') {
				get().logStreamObject(streamId, event.object);
			}
			handler(event);
		};

		// Wrap the provider's streamLLM to handle state updates
		// Type assertion is safe after runtime validation
		// We need to use unknown here as an intermediate type for the complex union types
		const originalResponse = provider.streamLLM(
			params as unknown as never,
			config as never,
			wrappedHandler
		);

		// Wrap the completion to update state when done
		const wrappedCompletion = originalResponse.completion.finally(() => {
			set({ isStreaming: false, currentAbortController: null });
		});

		return {
			abort: () => {
				originalResponse.abort();
				abortController.abort();
			},
			completion: wrappedCompletion,
		};
	},

	// Voice LLM method
	voiceLLM: async (params: VoiceParams) => {
		const config = get().providerConfig;
		if (!config) {
			throw new Error('No LLM provider configured');
		}

		// Augment params for Mastra provider to include resourceId & threadId
		let voiceParams: VoiceParams = params;
		if (config.provider === 'mastra') {
			const resourceId = getCedarState('userId') as string | undefined;
			const threadId = getCedarState('threadId') as string | undefined;
			voiceParams = {
				...params,
				resourceId,
				threadId,
			} as typeof voiceParams;
		}

		try {
			const provider = getProviderImplementation(config);
			// Type assertion is safe after runtime validation
			const response = await provider.voiceLLM(
				voiceParams as unknown as never,
				config as never
			);

			return response;
		} catch (error) {
			throw error;
		}
	},

	// Voice streaming LLM method
	voiceStreamLLM: (params: VoiceParams, handler: VoiceStreamHandler) => {
		const config = get().providerConfig;
		if (!config) {
			throw new Error('No LLM provider configured');
		}

		// Augment params for Mastra provider to include resourceId & threadId
		let voiceParams: VoiceParams = params;
		if (config.provider === 'mastra') {
			const resourceId = getCedarState('userId') as string | undefined;
			const threadId = getCedarState('threadId') as string | undefined;
			voiceParams = {
				...params,
				resourceId,
				threadId,
			} as typeof voiceParams;
		}

		// Log the stream start
		const streamId = get().logStreamStart(voiceParams, config.provider);

		const provider = getProviderImplementation(config);
		const abortController = new AbortController();

		set({ currentAbortController: abortController, isStreaming: true });

		// Wrap the handler to log stream events
		const wrappedHandler: VoiceStreamHandler = (event: VoiceStreamEvent) => {
			if (event.type === 'chunk') {
				get().logStreamChunk(streamId, event.content);
			} else if (event.type === 'done') {
				get().logStreamEnd(streamId, event.completedItems);
			} else if (event.type === 'error') {
				get().logAgentError(streamId, event.error);
			} else if (event.type === 'object') {
				get().logStreamObject(streamId, event.object);
			} else if (event.type === 'transcription') {
				get().logStreamChunk(streamId, event.transcription);
			} else if (event.type === 'audio') {
				// Log audio event (could be enhanced with audio-specific logging)
				get().logStreamChunk(
					streamId,
					`[AUDIO: ${event.audioFormat || 'unknown'}]`
				);
			}
			handler(event);
		};

		// Check if provider has voiceStreamLLM, fallback to voiceLLM if not
		const providerImplementation = provider as unknown as Record<
			string,
			unknown
		>;
		if (typeof providerImplementation.voiceStreamLLM === 'function') {
			// Provider supports voice streaming
			const originalResponse = providerImplementation.voiceStreamLLM(
				voiceParams as unknown as never,
				config as never,
				wrappedHandler
			);

			// Wrap the completion to update state when done
			const wrappedCompletion = originalResponse.completion.finally(() => {
				set({ isStreaming: false, currentAbortController: null });
			});

			return {
				abort: () => {
					originalResponse.abort();
					abortController.abort();
				},
				completion: wrappedCompletion,
			};
		} else {
			// Fallback to non-streaming voiceLLM for backward compatibility
			const completion = (async () => {
				try {
					const response = await provider.voiceLLM(
						voiceParams as unknown as never,
						config as never
					);

					// Simulate streaming events for compatibility
					if (response.content) {
						wrappedHandler({ type: 'chunk', content: response.content });
					}
					if (response.audioData || response.audioUrl) {
						wrappedHandler({
							type: 'audio',
							audioData: response.audioData || response.audioUrl || '',
							audioFormat: response.audioFormat,
						});
					}
					if (response.object) {
						wrappedHandler({
							type: 'object',
							object: Array.isArray(response.object)
								? response.object
								: [response.object],
						});
					}

					// Send done event
					const completedItems: (string | StructuredResponseType)[] = [];
					if (response.content) completedItems.push(response.content);
					if (response.object) {
						const objects = Array.isArray(response.object)
							? response.object
							: [response.object];
						completedItems.push(...objects);
					}

					wrappedHandler({ type: 'done', completedItems });
				} catch (error) {
					if (error instanceof Error && error.name !== 'AbortError') {
						wrappedHandler({ type: 'error', error });
					}
				}
			})();

			// Wrap the completion to update state when done
			const wrappedCompletion = completion.finally(() => {
				set({ isStreaming: false, currentAbortController: null });
			});

			return {
				abort: () => {
					abortController.abort();
				},
				completion: wrappedCompletion,
			};
		}
	},

	// Handle LLM response
	handleLLMResponse: async (itemsToProcess) => {
		const state = get();

		for (const item of itemsToProcess) {
			if (typeof item === 'string') {
				// Handle text content - append to latest message
				state.appendToLatestMessage(item, !state.isStreaming);
			} else if (item && typeof item === 'object') {
				const structuredResponse = item;

				// Try to process with registered response processors (including defaults)
				const processed = await state.processStructuredResponse(
					structuredResponse
				);

				if (!processed) {
					// No processor handled this response, log it and add it to the chat
					state.addMessage({
						role: 'bot',
						...structuredResponse,
					});
				}
			}
		}
	},

	// Response processor methods
	registerResponseProcessor: <T extends StructuredResponseType>(
		processor: ResponseProcessor<T>
	) => {
		set((state) => {
			const type = processor.type;
			return {
				responseProcessors: {
					...state.responseProcessors,
					[type]: processor,
				} as ResponseProcessorRegistry,
			};
		});
	},

	getResponseProcessors: (type: string) => {
		return get().responseProcessors[type];
	},

	processStructuredResponse: async (obj) => {
		const state = get();

		if (!obj.type || typeof obj.type !== 'string') {
			return false;
		}

		const processor = state.getResponseProcessors(obj.type);

		if (!processor) {
			return false;
		}

		// Validate if needed
		if (processor.validate && !processor.validate(obj)) {
			return false;
		}

		try {
			await processor.execute(obj as StructuredResponseType, state);
			return true;
		} catch (error) {
			console.error(
				`Error executing response processor for type ${obj.type}:`,
				error
			);
			return false;
		}
	},

	sendMessage: async (params?: SendMessageParams) => {
		const { model, systemPrompt, route, temperature, stream } = params || {};
		const state = get();

		// Set processing state
		state.setIsProcessing(true);

		try {
			// Step 1: Get the stringified chatInput & additionalContext
			const editorContent = state.stringifyEditor();
			const fullContext = state.stringifyInputContext();

			// Step 2: Unify it into a single string to send to the LLM
			const unifiedMessage = fullContext;

			// Step 3: Add the stringified chatInputContent as a message from the user
			state.addMessage({
				role: 'user' as const,
				type: 'text' as const,
				content: editorContent,
			});

			// Clear the chat specific contextEntries (mentions)
			state.clearMentions();

			// Step 4: Build params based on provider type
			const config = state.providerConfig;
			if (!config) {
				throw new Error('No provider configured');
			}

			let llmParams: BaseParams = {
				prompt: unifiedMessage,
				systemPrompt,
				temperature,
			};

			const threadId =
				params?.threadId || (getCedarState('threadId') as string | null);
			const userId = params?.userId || getCedarState('userId');

			// Add provider-specific params
			switch (config.provider) {
				case 'openai':
				case 'anthropic':
					llmParams = { ...llmParams, model: model || 'gpt-4o-mini' };
					break;
				case 'mastra':
					const chatPath = config.chatPath || '/chat';

					llmParams = {
						...llmParams,
						// we're overriding the prompt since we pass in additionalContext as a raw object.
						prompt: editorContent,
						additionalContext: state.stringifyAdditionalContext(),
						route: route || `${chatPath}`,
						resourceId: userId,
						threadId,
					};
					break;
				case 'ai-sdk':
					llmParams = { ...llmParams, model: model || 'openai/gpt-4o-mini' };
					break;
				case 'custom':
					llmParams = {
						...llmParams,
						prompt: editorContent,
						additionalContext: sanitizeJson(state.additionalContext),
						userId,
						threadId,
					};
					break;
			}

			// Step 5: Make the LLM call (streaming and non-streaming branches)
			if (stream) {
				// Capture current message count so we know which ones are new during the stream
				const startIdx = get().messages.length;

				const streamResponse = state.streamLLM(llmParams, async (event) => {
					switch (event.type) {
						case 'chunk':
							// Process single text chunk as array of one
							await state.handleLLMResponse([event.content]);
							break;
						case 'object':
							// Process object(s) - handle both single and array
							await state.handleLLMResponse(
								Array.isArray(event.object) ? event.object : [event.object]
							);
							break;
						case 'done':
							// Stream completed - no additional processing needed
							break;
						case 'error':
							console.error('Stream error:', event.error);
							break;
					}
				});

				// Wait for stream to complete
				await streamResponse.completion;

				// Persist any new messages added during the stream (from startIdx onwards)
				const newMessages = get().messages.slice(startIdx);
				for (const m of newMessages) {
					await state.persistMessageStorageMessage(m);
				}
			} else {
				// Non-streaming approach – call the LLM and process all items at once
				const response = await state.callLLM(llmParams);

				// Process response content as array of one
				if (response.content) {
					await state.handleLLMResponse([response.content]);
				}

				// Process structured output if present
				if (response.object) {
					await state.handleLLMResponse(
						Array.isArray(response.object) ? response.object : [response.object]
					);
				}
			}

			// Clear the chat input content after successful send
			state.setChatInputContent({
				type: 'doc',
				content: [{ type: 'paragraph', content: [] }],
			});
		} catch (error) {
			console.error('Error sending message:', error);
			state.addMessage({
				role: 'assistant' as const,
				type: 'text' as const,
				content: 'An error occurred while sending your message.',
			});
		} finally {
			state.setIsProcessing(false);
		}
	},

	// Configuration methods
	setProviderConfig: (config) => {
		set({ providerConfig: config });

		// If it's a Mastra provider with a voiceRoute, update the voice endpoint
		if (config.provider === 'mastra' && config.voiceRoute) {
			const voiceEndpoint = `${config.baseURL}${config.voiceRoute}`;
			get().updateVoiceSettings({ endpoint: voiceEndpoint });
		}
	},

	// Connection management
	connect: async () => {
		// Provider-specific connection logic can be added here
		set({ isConnected: true });
	},

	disconnect: () => {
		const state = get();
		state.cancelStream();
		set({ isConnected: false });
	},

	// Utility methods
	cancelStream: () => {
		const { currentAbortController } = get();
		if (currentAbortController) {
			currentAbortController.abort();
		}
	},

	/* ------------------------------------------------------------------
	 * Notification polling for Mastra threads
	 * ------------------------------------------------------------------*/

	subscribeToNotifications: () => {
		if (get().notificationInterval !== undefined) return; // already polling

		const provider = get().providerConfig;
		if (!provider || provider.provider !== 'mastra') return;

		const baseURL = provider.baseURL;
		const threadId = getCedarState('threadId') as string | undefined;
		if (!threadId) return;

		const endpoint = `${baseURL}/chat/notifications`;

		get().notificationInterval = window.setInterval(async () => {
			try {
				const response = await fetch(endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ threadId }),
				});

				if (!response.ok) throw new Error(`HTTP ${response.status}`);

				const data = await response.json();
				if (Array.isArray(data?.notifications)) {
					for (const msg of data.notifications) {
						get().addMessage(msg);
					}
				}
			} catch (err) {
				console.warn('Notification polling error:', err);
			}
		}, 60000);
	},

	unsubscribeFromNotifications: () => {
		const id = get().notificationInterval;
		if (id !== undefined) {
			clearInterval(id);
			set({ notificationInterval: undefined });
		}
	},
});
