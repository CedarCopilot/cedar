import { StateCreator } from 'zustand';
import type { CedarStore } from '@/store/CedarOSTypes';
import type {
	VoiceStreamEvent,
	StructuredResponseType,
	VoiceLLMResponse,
} from '@/store/agentConnection/AgentConnectionTypes';

export interface VoiceState {
	// Voice state
	isVoiceEnabled: boolean;
	isListening: boolean;
	isSpeaking: boolean;
	voicePermissionStatus: 'granted' | 'denied' | 'prompt' | 'not-supported';
	audioStream: MediaStream | null;
	audioContext: AudioContext | null;
	mediaRecorder: MediaRecorder | null;
	voiceError: string | null;

	// Voice settings
	voiceSettings: {
		language: string;
		voiceId?: string;
		pitch?: number;
		rate?: number;
		volume?: number;
		useBrowserTTS?: boolean;
		autoAddToMessages?: boolean;
		endpoint?: string; // Voice endpoint URL
		stream?: boolean; // Enable streaming voice responses
	};
}

export interface VoiceActions {
	// Permission management
	requestVoicePermission: () => Promise<void>;
	checkVoiceSupport: () => boolean;

	// Voice control
	startListening: () => Promise<void>;
	stopListening: () => void;
	toggleVoice: () => void;

	// Audio streaming
	streamAudioToEndpoint: (audioData: Blob) => Promise<void>;
	handleLLMVoice: (response: VoiceLLMResponse) => Promise<void>;
	playAudioResponse: (audioUrl: string | ArrayBuffer) => Promise<void>;

	// Settings
	setVoiceEndpoint: (endpoint: string) => void;
	updateVoiceSettings: (settings: Partial<VoiceState['voiceSettings']>) => void;

	// State management
	setVoiceError: (error: string | null) => void;
	resetVoiceState: () => void;
}

export type VoiceSlice = VoiceState & VoiceActions;

const initialVoiceState: VoiceState = {
	isVoiceEnabled: false,
	isListening: false,
	isSpeaking: false,
	voicePermissionStatus: 'prompt',
	audioStream: null,
	audioContext: null,
	mediaRecorder: null,
	voiceError: null,
	voiceSettings: {
		language: 'en-US',
		pitch: 1.0,
		rate: 1.0,
		volume: 1.0,
		useBrowserTTS: false,
		autoAddToMessages: true, // Default to true for automatic message integration
		stream: false, // Default to false for backward compatibility
	},
};

export const createVoiceSlice: StateCreator<CedarStore, [], [], VoiceSlice> = (
	set,
	get
) => ({
	...initialVoiceState,

	checkVoiceSupport: () => {
		if (typeof window === 'undefined') return false;
		return !!(
			navigator.mediaDevices &&
			typeof navigator.mediaDevices.getUserMedia === 'function' &&
			window.MediaRecorder &&
			window.AudioContext
		);
	},

	requestVoicePermission: async () => {
		try {
			if (!get().checkVoiceSupport()) {
				set({
					voicePermissionStatus: 'not-supported',
					voiceError: 'Voice features are not supported in this browser',
				});
				return;
			}

			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			// Create audio context for processing
			const audioContext = new AudioContext();

			set({
				audioStream: stream,
				audioContext,
				voicePermissionStatus: 'granted',
				voiceError: null,
			});
		} catch (error) {
			set({
				voicePermissionStatus: 'denied',
				voiceError:
					error instanceof Error
						? error.message
						: 'Failed to get microphone permission',
			});
		}
	},

	startListening: async () => {
		const state = get();

		if (state.voicePermissionStatus !== 'granted') {
			await get().requestVoicePermission();
			if (get().voicePermissionStatus !== 'granted') {
				return;
			}
		}

		if (!state.audioStream) {
			set({ voiceError: 'No audio stream available' });
			return;
		}

		try {
			const mediaRecorder = new MediaRecorder(state.audioStream, {
				mimeType: 'audio/webm;codecs=opus',
			});

			const audioChunks: Blob[] = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
				await get().streamAudioToEndpoint(audioBlob);
			};

			mediaRecorder.start();
			set({
				mediaRecorder,
				isListening: true,
				voiceError: null,
			});
		} catch (error) {
			set({
				voiceError:
					error instanceof Error ? error.message : 'Failed to start recording',
			});
		}
	},

	stopListening: () => {
		const { mediaRecorder } = get();

		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
		}

		set({ isListening: false });
	},

	toggleVoice: () => {
		const { isListening } = get();

		if (isListening) {
			get().stopListening();
		} else {
			get().startListening();
		}
	},

	streamAudioToEndpoint: async (audioData: Blob) => {
		const { voiceSettings } = get();

		try {
			set({ isSpeaking: false });

			// Set processing state to true when starting voice processing
			get().setIsProcessing(true);

			// Check if we have a provider configured
			const providerConfig = get().providerConfig;
			if (!providerConfig) {
				throw new Error('No provider configured for voice');
			}

			// For Mastra/custom providers with explicit endpoints, check if endpoint is configured
			if (
				(providerConfig.provider === 'mastra' ||
					providerConfig.provider === 'custom') &&
				!voiceSettings.endpoint
			) {
				throw new Error('Voice endpoint not configured');
			}

			// Get the stringified additional context from the store
			const contextString = get().stringifyAdditionalContext();

			const voiceParams = {
				audioData,
				voiceSettings,
				context: contextString,
				prompt: '',
			};

			// Check if voice streaming is enabled
			if (voiceSettings.stream) {
				// Use streaming voice method - follow same pattern as streamLLM
				const streamResponse = get().voiceStreamLLM(
					voiceParams,
					async (event: VoiceStreamEvent) => {
						switch (event.type) {
							case 'transcription':
								// Pass transcription to handleLLMVoice
								await get().handleLLMVoice({
									content: '',
									transcription: event.transcription,
								});
								break;
							case 'chunk':
								// Pass text content directly to handleLLMVoice
								await get().handleLLMVoice({ content: event.content });
								break;
							case 'audio':
								// Pass complete audio response to handleLLMVoice
								await get().handleLLMVoice({
									content: '',
									audioData: event.audioData,
									audioFormat: event.audioFormat,
								});
								break;
							case 'object':
								// Pass structured objects to handleLLMVoice
								await get().handleLLMVoice({
									content: '',
									object: Array.isArray(event.object)
										? event.object
										: [event.object],
								});
								break;
							case 'done':
								// Stream completed - no additional processing needed
								break;
							case 'error':
								console.error('Voice stream error:', event.error);
								set({
									voiceError:
										event.error.message || 'Voice streaming error occurred',
								});
								break;
						}
					}
				);

				// Wait for streaming to complete
				await streamResponse.completion;
			} else {
				// Use the non-streaming agent connection's voiceLLM method
				const response = await get().voiceLLM(voiceParams);

				// Handle the response using the existing handleLLMVoice function
				await get().handleLLMVoice(response);
			}

			// Voice processing completed successfully (streaming or non-streaming)
			get().setIsProcessing(false);
		} catch (error) {
			set({
				voiceError:
					error instanceof Error ? error.message : 'Failed to process voice',
			});
			// Set processing state to false on error
			get().setIsProcessing(false);
		}
	},

	handleLLMVoice: async (response: VoiceLLMResponse) => {
		const { voiceSettings } = get();

		try {
			set({ isSpeaking: false });
			let handled = false;

			// Handle audio playback (voice-specific)
			if (response.audioData && response.audioFormat) {
				const binaryString = atob(response.audioData);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				const audioBuffer = bytes.buffer;
				await get().playAudioResponse(audioBuffer);
				handled = true;
			} else if (response.audioUrl) {
				await get().playAudioResponse(response.audioUrl);
				handled = true;
			} else if (response.content && voiceSettings.useBrowserTTS) {
				if ('speechSynthesis' in window) {
					const utterance = new SpeechSynthesisUtterance(response.content);
					utterance.lang = voiceSettings.language;
					utterance.rate = voiceSettings.rate || 1;
					utterance.pitch = voiceSettings.pitch || 1;
					utterance.volume = voiceSettings.volume || 1;

					set({ isSpeaking: true });
					utterance.onend = () => set({ isSpeaking: false });

					speechSynthesis.speak(utterance);
					handled = true;
				}
			}

			// Handle transcription (voice-specific)
			if (voiceSettings.autoAddToMessages && response.transcription) {
				const { addMessage } = get();
				addMessage({
					type: 'text',
					role: 'user',
					content: response.transcription,
					metadata: {
						source: 'voice',
						timestamp: new Date().toISOString(),
					},
				});
				handled = true;
			}

			// Build items array for handleLLMResponse
			const items: (string | StructuredResponseType)[] = [];

			// Add content if present
			if (response.content && !handled) {
				items.push(response.content);
				handled = true;
			}

			// Add object if present - cast to StructuredResponseType for compatibility
			if (response.object && !handled) {
				if (Array.isArray(response.object)) {
					items.push(...response.object);
				} else {
					items.push(response.object);
				}
			}

			// Delegate message parsing to handleLLMResponse if we have items
			if (items.length > 0) {
				const { handleLLMResponse } = get();
				await handleLLMResponse(items);
			}

			// Note: processing state is now cleared after streaming/non-streaming completion in streamAudioToEndpoint
		} catch (error) {
			set({
				voiceError:
					error instanceof Error ? error.message : 'Failed to process voice',
			});
			// Set processing state to false on error
			get().setIsProcessing(false);
		}
	},

	playAudioResponse: async (audioData: string | ArrayBuffer) => {
		try {
			set({ isSpeaking: true });

			const audio = new Audio();

			if (typeof audioData === 'string') {
				audio.src = audioData;
			} else {
				const blob = new Blob([audioData], { type: 'audio/mpeg' });
				audio.src = URL.createObjectURL(blob);
			}

			audio.onended = () => {
				set({ isSpeaking: false });
				if (typeof audioData !== 'string') {
					URL.revokeObjectURL(audio.src);
				}
			};

			await audio.play();
		} catch (error) {
			set({
				isSpeaking: false,
				voiceError:
					error instanceof Error ? error.message : 'Failed to play audio',
			});
		}
	},

	setVoiceEndpoint: (endpoint: string) => {
		set((state) => ({
			voiceSettings: {
				...state.voiceSettings,
				endpoint,
			},
		}));
	},

	updateVoiceSettings: (settings: Partial<VoiceState['voiceSettings']>) => {
		set((state) => ({
			voiceSettings: {
				...state.voiceSettings,
				...settings,
			},
		}));
	},

	setVoiceError: (error: string | null) => {
		set({ voiceError: error });
	},

	resetVoiceState: () => {
		const { audioStream, audioContext, mediaRecorder } = get();

		// Clean up resources
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
		}

		if (audioStream) {
			audioStream.getTracks().forEach((track) => track.stop());
		}

		if (audioContext && audioContext.state !== 'closed') {
			audioContext.close();
		}

		set(initialVoiceState);
	},
});
