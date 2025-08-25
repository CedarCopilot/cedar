import type {
	OpenAIParams,
	ProviderImplementation,
	InferProviderConfig,
	StructuredParams,
} from '@/store/agentConnection/AgentConnectionTypes';
import { handleEventStream } from '@/store/agentConnection/agentUtils';

type OpenAIConfig = InferProviderConfig<'openai'>;

export const openAIProvider: ProviderImplementation<
	OpenAIParams,
	OpenAIConfig
> = {
	callLLM: async (params, config) => {
		const { prompt, model, systemPrompt, temperature, maxTokens, ...rest } =
			params;

		const messages = [
			...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
			{ role: 'user', content: prompt },
		];

		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${config.apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages,
				temperature,
				max_tokens: maxTokens,
				...rest,
			}),
		});

		return openAIProvider.handleResponse(response);
	},

	streamLLM: (params, config, handler) => {
		const abortController = new AbortController();

		const completion = (async () => {
			try {
				const { prompt, model, systemPrompt, temperature, maxTokens, ...rest } =
					params;

				const messages = [
					...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
					{ role: 'user', content: prompt },
				];

				const response = await fetch(
					'https://api.openai.com/v1/chat/completions',
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${config.apiKey}`,
						},
						body: JSON.stringify({
							model,
							messages,
							temperature,
							max_tokens: maxTokens,
							stream: true,
							...rest,
						}),
						signal: abortController.signal,
					}
				);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				// OpenAI uses SSE format, our unified parser handles it automatically
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

	handleResponse: async (response) => {
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return {
			content: data.choices?.[0]?.message?.content || '',
			usage: data.usage
				? {
						promptTokens: data.usage.prompt_tokens,
						completionTokens: data.usage.completion_tokens,
						totalTokens: data.usage.total_tokens,
					}
				: undefined,
			metadata: {
				model: data.model,
				id: data.id,
			},
		};
	},

	callLLMStructured: async (params, config) => {
		const {
			prompt,
			model,
			systemPrompt,
			temperature,
			maxTokens,
			schema,
			schemaName,
			schemaDescription,
			...rest
		} = params as OpenAIParams & StructuredParams;

		const messages = [
			...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
			{ role: 'user', content: prompt },
		];

		const body: Record<string, unknown> = {
			model,
			messages,
			temperature,
			max_tokens: maxTokens,
			...rest,
		};

		// Add response_format for structured output if schema is provided
		if (schema) {
			body.response_format = {
				type: 'json_schema',
				json_schema: {
					name: schemaName || 'response',
					description: schemaDescription,
					schema: schema,
					strict: true,
				},
			};
		}

		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${config.apiKey}`,
			},
			body: JSON.stringify(body),
		});

		const result = await openAIProvider.handleResponse(response);

		// If we have structured output, parse it and add to object field
		if (schema && result.content) {
			try {
				result.object = JSON.parse(result.content);
			} catch {
				// If parsing fails, leave object undefined
			}
		}

		return result;
	},

	voiceLLM: async (params, config) => {
		// For custom backends using OpenAI format, use the same approach as Mastra
		// This allows custom backends to implement their own voice endpoints
		const { audioData, voiceSettings, context } = params;

		// Use the endpoint from voiceSettings if provided, otherwise default
		const voiceEndpoint = voiceSettings.endpoint || '/voice';
		const fullUrl = voiceEndpoint.startsWith('http')
			? voiceEndpoint
			: voiceEndpoint; // Relative URLs will be relative to current origin

		const formData = new FormData();
		formData.append('audio', audioData, 'recording.webm');
		formData.append('settings', JSON.stringify(voiceSettings));
		if (context) {
			formData.append('context', context);
		}

		const response = await fetch(fullUrl, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.apiKey}`,
			},
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
};
