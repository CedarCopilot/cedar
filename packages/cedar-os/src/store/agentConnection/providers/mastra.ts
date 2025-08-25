import type {
	InferProviderConfig,
	MastraParams,
	ProviderImplementation,
	StructuredParams,
} from '@/store/agentConnection/AgentConnectionTypes';
import { handleEventStream } from '@/store/agentConnection/agentUtils';

type MastraConfig = InferProviderConfig<'mastra'>;

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
		const { audioData, voiceSettings, context, ...rest } = params;

		const headers: Record<string, string> = {};

		// Only add Authorization header if apiKey is provided
		if (config.apiKey) {
			headers.Authorization = `Bearer ${config.apiKey}`;
		}

		// Use the endpoint from voiceSettings if provided, otherwise use voiceRoute from config
		const voiceEndpoint =
			voiceSettings.endpoint || config.voiceRoute || '/voice';
		const fullUrl = voiceEndpoint.startsWith('http')
			? voiceEndpoint
			: `${config.baseURL}${voiceEndpoint}`;

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
	T extends MastraStreamedResponseType = MastraStreamedResponseType,
> = {
	type: T;
	runId: string;
	from: string;
	// TODO: update once Mastra releases new types
	payload: Record<string, unknown>;
};
