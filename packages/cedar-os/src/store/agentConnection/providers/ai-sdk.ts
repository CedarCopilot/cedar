import type {
	AISDKParams,
	InferProviderConfig,
	AISDKStructuredParams,
	LLMResponse,
	StreamHandler,
	StreamResponse,
	StreamEvent,
	VoiceParams,
	VoiceLLMResponse,
} from '@/store/agentConnection/AgentConnectionTypes';
import type { StructuredResponseType } from '@/store/agentConnection/AgentConnectionTypes';
import {
	generateText,
	streamText,
	type LanguageModel,
	generateObject,
	experimental_transcribe as transcribe,
	experimental_generateSpeech as generateSpeech,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createMistral } from '@ai-sdk/mistral';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createXai } from '@ai-sdk/xai';

type AISDKConfig = InferProviderConfig<'ai-sdk'>;

// Specialized provider implementation for AI SDK
export interface AISDKProviderImplementation {
	callLLM: (params: AISDKParams, config: AISDKConfig) => Promise<LLMResponse>;
	callLLMStructured: (
		params: AISDKStructuredParams,
		config: AISDKConfig
	) => Promise<LLMResponse>;
	streamLLM: (
		params: AISDKParams,
		config: AISDKConfig,
		handler: StreamHandler
	) => StreamResponse;
	voiceLLM: (
		params: VoiceParams,
		config: AISDKConfig
	) => Promise<VoiceLLMResponse>;
	handleResponse: (response: Response) => Promise<LLMResponse>;
}

// Direct mapping of provider names to their implementations
const providerImplementations = {
	openai: (apiKey: string) => createOpenAI({ apiKey }),
	anthropic: (apiKey: string) => createAnthropic({ apiKey }),
	google: (apiKey: string) => createGoogleGenerativeAI({ apiKey }),
	mistral: (apiKey: string) => createMistral({ apiKey }),
	groq: (apiKey: string) => createGroq({ apiKey }),
	xai: (apiKey: string) => createXai({ apiKey }),
} as const;

// Helper function to parse model string and get provider/model
function parseModelString(modelString: string) {
	const [provider, ...modelParts] = modelString.split('/');
	const model = modelParts.join('/'); // Handle cases like "openai/gpt-4o-mini"

	if (!provider || !model) {
		throw new Error(
			`Invalid model format: ${modelString}. Expected format: "provider/model" (e.g., "openai/gpt-4o", "anthropic/claude-3-sonnet")`
		);
	}

	return { provider, model };
}

export const aiSDKProvider: AISDKProviderImplementation = {
	callLLM: async (params, config) => {
		const {
			model: modelString,
			prompt,
			systemPrompt,
			temperature,
			...rest
		} = params;

		// Parse the model string to get provider and model
		const { provider: providerName, model } = parseModelString(modelString);

		// Get the provider config
		const providerConfig =
			config.providers[providerName as keyof typeof config.providers];
		if (!providerConfig) {
			throw new Error(
				`Provider ${providerName} not configured. Available providers: ${Object.keys(
					config.providers
				).join(', ')}`
			);
		}

		// Get the provider implementation
		const getProvider =
			providerImplementations[
				providerName as keyof typeof providerImplementations
			];
		if (!getProvider) {
			throw new Error(
				`Provider ${providerName} not supported. Supported providers: ${Object.keys(
					providerImplementations
				).join(', ')}`
			);
		}

		const provider = getProvider(providerConfig.apiKey);

		// For Google, we need to handle the model name differently
		const modelName =
			providerName === 'google'
				? model.replace('gemini-', '') // Google SDK expects model without 'gemini-' prefix
				: model;

		// Get the model instance - cast to LanguageModel (V2)
		const modelInstance = provider(modelName) as LanguageModel;

		const result = await generateText({
			model: modelInstance,
			prompt,
			system: systemPrompt,
			temperature,
			maxRetries: 3,
			...rest,
		});

		return {
			content: result.text,
			usage: result.usage
				? {
						promptTokens:
							(result.usage as { promptTokens?: number }).promptTokens || 0,
						completionTokens:
							(result.usage as { completionTokens?: number })
								.completionTokens || 0,
						totalTokens: result.usage.totalTokens || 0,
					}
				: undefined,
			metadata: {
				model: modelString,
				finishReason: result.finishReason,
			},
		};
	},

	callLLMStructured: async (params, config) => {
		const {
			model: modelString,
			prompt,
			systemPrompt,
			temperature,
			schema, // This is now statically typed as z.ZodType<unknown>
			schemaName,
			schemaDescription,
			...rest
		} = params;

		// Parse the model string to get provider and model
		const { provider: providerName, model } = parseModelString(modelString);

		// Get the provider config
		const providerConfig =
			config.providers[providerName as keyof typeof config.providers];
		if (!providerConfig) {
			throw new Error(
				`Provider ${providerName} not configured. Available providers: ${Object.keys(
					config.providers
				).join(', ')}`
			);
		}

		// Get the provider implementation
		const getProvider =
			providerImplementations[
				providerName as keyof typeof providerImplementations
			];
		if (!getProvider) {
			throw new Error(
				`Provider ${providerName} not supported. Supported providers: ${Object.keys(
					providerImplementations
				).join(', ')}`
			);
		}

		const provider = getProvider(providerConfig.apiKey);

		// For Google, we need to handle the model name differently
		const modelName =
			providerName === 'google'
				? model.replace('gemini-', '') // Google SDK expects model without 'gemini-' prefix
				: model;

		// Get the model instance - cast to LanguageModel (V2)
		const modelInstance = provider(modelName) as LanguageModel;

		// Use generateObject with the Zod schema (no runtime validation needed, it's statically typed)
		const result = await generateObject({
			model: modelInstance,
			prompt,
			system: systemPrompt,
			temperature,
			schema, // Already typed as z.ZodType<unknown>
			...(schemaName ? { schemaName } : {}),
			...(schemaDescription ? { schemaDescription } : {}),
			maxRetries: 3,
			...rest,
		});

		return {
			content: JSON.stringify(result.object),
			object: result.object as StructuredResponseType,
			usage: result.usage
				? {
						promptTokens:
							(result.usage as { promptTokens?: number }).promptTokens || 0,
						completionTokens:
							(result.usage as { completionTokens?: number })
								.completionTokens || 0,
						totalTokens: result.usage.totalTokens || 0,
					}
				: undefined,
			metadata: {
				model: modelString,
				finishReason: result.finishReason,
			},
		};
	},

	streamLLM: (params, config, handler) => {
		const abortController = new AbortController();

		const completion = (async () => {
			try {
				const {
					model: modelString,
					prompt,
					systemPrompt,
					temperature,
					...rest
				} = params;

				// Parse the model string to get provider and model
				const { provider: providerName, model } = parseModelString(modelString);

				// Get the provider config
				const providerConfig =
					config.providers[providerName as keyof typeof config.providers];
				if (!providerConfig) {
					throw new Error(
						`Provider ${providerName} not configured. Available providers: ${Object.keys(
							config.providers
						).join(', ')}`
					);
				}

				// Get the provider implementation
				const getProvider =
					providerImplementations[
						providerName as keyof typeof providerImplementations
					];
				if (!getProvider) {
					throw new Error(
						`Provider ${providerName} not supported. Supported providers: ${Object.keys(
							providerImplementations
						).join(', ')}`
					);
				}

				const provider = getProvider(providerConfig.apiKey);

				// For Google, we need to handle the model name differently
				const modelName =
					providerName === 'google'
						? model.replace('gemini-', '') // Google SDK expects model without 'gemini-' prefix
						: model;

				// Get the model instance - cast to LanguageModel (V2)
				const modelInstance = provider(modelName) as LanguageModel;

				const result = await streamText({
					model: modelInstance,
					prompt,
					system: systemPrompt,
					temperature,
					maxRetries: 3,
					abortSignal: abortController.signal,
					...rest,
				});

				// Track completed items for completion summary
				const completedItems: (string | object)[] = [];
				let fullTextContent = '';

				for await (const chunk of result.textStream) {
					fullTextContent += chunk;
					handler({ type: 'chunk', content: chunk });
				}

				// Add the complete text message to completed items
				if (fullTextContent.trim()) {
					completedItems.push(fullTextContent.trim());
				}

				// Signal completion with completed items summary
				handler({ type: 'done', completedItems });
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
		const { audioData, voiceSettings, context } = params;

		// First, transcribe the audio using AI SDK
		// Use OpenAI's whisper-1 model for transcription
		const openaiConfig = config.providers.openai;
		if (!openaiConfig) {
			throw new Error('OpenAI provider not configured for transcription');
		}

		// Create OpenAI provider instance
		const openai = createOpenAI({ apiKey: openaiConfig.apiKey });
		const transcriptionModel = openai.transcription('whisper-1');

		// Convert Blob to ArrayBuffer for transcription
		const audioBuffer = await audioData.arrayBuffer();

		// Transcribe the audio
		const transcript = await transcribe({
			model: transcriptionModel,
			audio: audioBuffer,
		});

		// Now generate a response based on the transcription
		const responseModelString = 'openai/gpt-4o-mini'; // Default response model
		const { provider: responseProviderName, model: responseModel } =
			parseModelString(responseModelString);

		const responseProviderConfig =
			config.providers[responseProviderName as keyof typeof config.providers];
		if (!responseProviderConfig) {
			throw new Error(`Provider ${responseProviderName} not configured`);
		}

		const responseProvider =
			providerImplementations[
				responseProviderName as keyof typeof providerImplementations
			];
		if (!responseProvider) {
			throw new Error(`Provider ${responseProviderName} not supported`);
		}

		const responseProviderInstance = responseProvider(
			responseProviderConfig.apiKey
		);
		const modelInstance = responseProviderInstance(
			responseModel
		) as LanguageModel;

		// Generate response
		const systemPrompt = context
			? `Context: ${context}\n\nRespond naturally to the user's voice input.`
			: "Respond naturally to the user's voice input.";

		const result = await generateText({
			model: modelInstance,
			prompt: transcript.text,
			system: systemPrompt,
			temperature: 0.7,
			maxRetries: 3,
		});

		// Generate speech if not using browser TTS
		let generatedAudioData: string | undefined;
		let audioFormat: string | undefined;

		if (!voiceSettings.useBrowserTTS) {
			try {
				// Use OpenAI's TTS model
				const speechModel = openai.speech('tts-1');

				const speech = await generateSpeech({
					model: speechModel,
					text: result.text,
					voice:
						(voiceSettings.voiceId as
							| 'alloy'
							| 'echo'
							| 'fable'
							| 'onyx'
							| 'nova'
							| 'shimmer') || 'alloy',
				});

				// Convert audio data to base64
				// The speech result contains the audio as a Uint8Array
				const audioUint8Array = speech as unknown as { audioData: Uint8Array };
				const base64Audio = btoa(
					String.fromCharCode(...audioUint8Array.audioData)
				);
				generatedAudioData = base64Audio;
				audioFormat = 'audio/mpeg'; // OpenAI returns MP3 format
			} catch (error) {
				console.warn(
					'Failed to generate speech, falling back to text response:',
					error
				);
			}
		}

		// Return response with transcription and optionally generated audio
		return {
			content: result.text,
			transcription: transcript.text,
			audioData: generatedAudioData,
			audioFormat,
			usage: result.usage
				? {
						promptTokens:
							(result.usage as { promptTokens?: number }).promptTokens || 0,
						completionTokens:
							(result.usage as { completionTokens?: number })
								.completionTokens || 0,
						totalTokens: result.usage.totalTokens || 0,
					}
				: undefined,
			metadata: {
				model: responseModelString,
				transcriptionModel: 'openai/whisper-1',
				language: transcript.language,
				durationInSeconds: transcript.durationInSeconds,
				speechModel: generatedAudioData ? 'openai/tts-1' : undefined,
			},
		};
	},

	handleResponse: async (response) => {
		// AI SDK handles responses internally, this is for custom implementations
		const data = await response.json();
		return {
			content: data.text || '',
			usage: data.usage,
			metadata: data.metadata,
		};
	},
};
