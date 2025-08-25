import type {
	InferProviderConfig,
	MastraParams,
	ProviderImplementation,
	StructuredParams,
	VoiceParams,
} from '@/store/agentConnection/AgentConnectionTypes';
import { handleEventStream } from '@/store/agentConnection/agentUtils';

type MastraConfig = InferProviderConfig<'mastra'>;

// Helper functions for voice methods
const createVoiceHeaders = (config: MastraConfig): Record<string, string> => {
	const headers: Record<string, string> = {};

	// Only add Authorization header if apiKey is provided
	if (config.apiKey) {
		headers.Authorization = `Bearer ${config.apiKey}`;
	}

	return headers;
};

const resolveVoiceEndpoint = (
	voiceSettings: VoiceParams['voiceSettings'],
	config: MastraConfig
): string => {
	// Use the endpoint from voiceSettings if provided, otherwise use voiceRoute from config
	const voiceEndpoint = voiceSettings.endpoint || config.voiceRoute || '/voice';
	return voiceEndpoint.startsWith('http')
		? voiceEndpoint
		: `${config.baseURL}${voiceEndpoint}`;
};

const createVoiceFormData = (params: VoiceParams): FormData => {
	const { audioData, voiceSettings, context, ...rest } = params;

	const formData = new FormData();
	formData.append('audio', audioData, 'recording.webm');
	formData.append('settings', JSON.stringify(voiceSettings));

	if (context) {
		formData.append('context', context);
	}

	for (const [key, value] of Object.entries(rest)) {
		if (value === undefined || value === null) continue;
		if (typeof value === 'object') {
			formData.append(key, JSON.stringify(value));
		} else {
			formData.append(key, String(value));
		}
	}

	return formData;
};

export const mastraProvider: ProviderImplementation<
	MastraParams,
	MastraConfig
> = {
	callLLM: async (params, config) => {
		const { route, prompt, systemPrompt, temperature, maxTokens, ...rest } =
			params;

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		// Only add Authorization header if apiKey is provided
		if (config.apiKey) {
			headers.Authorization = `Bearer ${config.apiKey}`;
		}

		const response = await fetch(`${config.baseURL}${route}`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				prompt,
				systemPrompt,
				temperature,
				maxTokens,
				...rest,
			}),
		});

		return mastraProvider.handleResponse(response);
	},

	callLLMStructured: async (params, config) => {
		const {
			route,
			prompt,
			systemPrompt,
			temperature,
			maxTokens,
			schema,
			schemaName,
			schemaDescription,
			...rest
		} = params as MastraParams & StructuredParams;

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		// Only add Authorization header if apiKey is provided
		if (config.apiKey) {
			headers.Authorization = `Bearer ${config.apiKey}`;
		}

		const body: Record<string, unknown> = {
			prompt,
			systemPrompt,
			temperature,
			maxTokens,
			...rest,
		};

		// Add schema information for structured output
		if (schema) {
			body.schema = schema;
			body.schemaName = schemaName;
			body.schemaDescription = schemaDescription;
		}

		const response = await fetch(`${config.baseURL}${route}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});

		return mastraProvider.handleResponse(response);
	},

	streamLLM: (params, config, handler) => {
		const abortController = new AbortController();

		const completion = (async () => {
			try {
				const { route, prompt, systemPrompt, temperature, maxTokens, ...rest } =
					params;

				const headers: Record<string, string> = {
					'Content-Type': 'application/json',
				};

				// Only add Authorization header if apiKey is provided
				if (config.apiKey) {
					headers.Authorization = `Bearer ${config.apiKey}`;
				}

				const response = await fetch(`${config.baseURL}${route}/stream`, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						prompt,
						systemPrompt,
						temperature,
						maxTokens,
						...rest,
					}),
					signal: abortController.signal,
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				await handleEventStream(response, handler);
			} catch (error) {
				if (error instanceof Error && error.name !== 'AbortError') {
					handler({ type: 'error', error });
				}
			}
		})();

		return {
			abort: () => abortController.abort(),
			completion,
		};
	},

	voiceLLM: async (params, config) => {
		const headers = createVoiceHeaders(config);
		const fullUrl = resolveVoiceEndpoint(params.voiceSettings, config);
		const formData = createVoiceFormData(params);

		const response = await fetch(fullUrl, {
			method: 'POST',
			headers,
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Voice endpoint returned ${response.status}`);
		}

		// Handle different response types
		const contentType = response.headers.get('content-type');

		if (contentType?.includes('audio')) {
			// Audio response - return as base64
			const audioBuffer = await response.arrayBuffer();
			const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
			return {
				content: '',
				audioData: base64,
				audioFormat: contentType,
			};
		} else if (contentType?.includes('application/json')) {
			// JSON response
			const data = await response.json();
			return {
				content: data.text || data.content || '',
				transcription: data.transcription,
				audioData: data.audioData,
				audioUrl: data.audioUrl,
				audioFormat: data.audioFormat,
				usage: data.usage,
				metadata: data.metadata,
				object: data.object,
			};
		} else {
			// Plain text response
			const text = await response.text();
			return {
				content: text,
			};
		}
	},

	voiceStreamLLM: (params, config, handler) => {
		const abortController = new AbortController();

		const completion = (async () => {
			try {
				const headers = createVoiceHeaders(config);
				const baseUrl = resolveVoiceEndpoint(params.voiceSettings, config);
				const streamUrl = `${baseUrl}/stream`;
				const formData = createVoiceFormData(params);

				const response = await fetch(streamUrl, {
					method: 'POST',
					headers,
					body: formData,
					signal: abortController.signal,
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				// Use handleEventStream with voice-aware object handling
				await handleEventStream(response, (event) => {
					// Handle audio events that come through as object events
					if (event.type === 'object' && event.object) {
						const objects = Array.isArray(event.object)
							? event.object
							: [event.object];

						// Check if any of these objects are audio events
						for (const obj of objects) {
							if (
								obj &&
								typeof obj === 'object' &&
								'type' in obj &&
								obj.type === 'audio'
							) {
								// Transform Mastra audio object to VoiceStreamEvent
								const audioObj = obj as {
									type: 'audio';
									audioData?: string;
									audioFormat?: string;
								};
								if (audioObj.audioData) {
									handler({
										type: 'audio',
										audioData: audioObj.audioData,
										audioFormat: audioObj.audioFormat,
									});
									// Continue processing other objects in the array if any
									continue;
								}
							} else if (
								obj &&
								typeof obj === 'object' &&
								'type' in obj &&
								obj.type === 'transcription'
							) {
								const transcriptionObj = obj as {
									type: 'transcription';
									transcription: string;
								};
								handler({
									type: 'transcription',
									transcription: transcriptionObj.transcription,
								});
								// Continue processing other objects in the array if any
								continue;
							} else {
								handler(event);
							}
						}
					} else {
						// Pass through all other events (chunk, done, error, metadata)
						handler(event);
					}
				});
			} catch (error) {
				if (error instanceof Error && error.name !== 'AbortError') {
					handler({ type: 'error', error });
				}
			}
		})();

		return {
			abort: () => abortController.abort(),
			completion,
		};
	},

	handleResponse: async (response) => {
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		// Mastra returns structured output in the 'object' field when using JSON Schema
		return {
			content: data.text || data.content || '',
			usage: data.usage,
			metadata: {
				model: data.model,
				id: data.id,
			},
			object: data.object, // Include the structured output if present
		};
	},

	// This can be safely removed
	handleStreamResponse: (chunk) => {
		return { type: 'chunk', content: chunk };
	},
};

/**
 * All event types emitted by a Mastra agent stream.
 */
export type MastraStreamedResponseType =
	| 'start'
	| 'step-start'
	| 'tool-call'
	| 'tool-result'
	| 'step-finish'
	| 'tool-output'
	| 'step-result'
	| 'step-output'
	| 'finish';

/**
 * Strongly-typed wrapper around a Mastra structured response message.
 * Extends Cedar's `CustomMessage` so it is compatible with the message system.
 */
export type MastraStreamedResponse<
	T extends MastraStreamedResponseType = MastraStreamedResponseType
> = {
	type: T;
	runId: string;
	from: string;
	// TODO: update once Mastra releases new types
	payload: Record<string, unknown>;
};
