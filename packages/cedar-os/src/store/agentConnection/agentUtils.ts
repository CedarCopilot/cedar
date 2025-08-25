/**
 * Enhanced Server-Sent Events (SSE) stream parser
 *
 * This function handles parsing of streaming responses from various LLM providers:
 * - OpenAI: Uses delta format with choices array
 * - Mastra: Uses custom object types
 * - AI SDK: Uses direct text streaming (handled internally by AI SDK)
 * - Raw text: Plain text chunks
 *
 * Key responsibilities:
 * 1. Parse SSE format (data: content\n\n)
 * 2. Handle mixed text/JSON content streams
 * 3. Accumulate text messages and track completed items
 * 4. Call handler immediately for real-time processing
 * 5. Provide completion summary with all items
 */

import type { StreamHandler } from '@/store/agentConnection/AgentConnectionTypes';

/**
 * Process raw content chunks to handle encoding and newlines
 * Converts escaped newlines (\n) and actual newlines to proper line breaks
 */
const processContentChunk = (rawChunk: string): string => {
	return rawChunk.replace(/(\\n|\n)/g, '\n');
};

/**
 * Main SSE stream handler - processes Server-Sent Events from LLM providers
 *
 * @param response - HTTP Response object with streaming body
 * @param handler - StreamHandler to call for each parsed event (chunk, object, done, error)
 */
export async function handleEventStream(
	response: Response,
	handler: StreamHandler
): Promise<void> {
	if (!response.ok || !response.body) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	// Set up streaming infrastructure
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	const completedItems: (string | object)[] = []; // Track all processed items for completion logging
	let currentTextMessage = ''; // Accumulate text chunks into messages

	// JSON buffering system for partial JSON objects
	let jsonBuffer = '';
	let isJsonBuffering = false;
	let braceDepth = 0;
	const MAX_JSON_BUFFER_SIZE = 1024 * 1024; // 1MB limit to prevent memory issues

	/**
	 * Parse Server-Sent Event format
	 * Standard SSE format: "event: type\ndata: content\n\n"
	 * Most providers only use the data field
	 */
	const parseSSEEvent = (raw: string) => {
		let eventType = 'message';
		let data = '';

		for (const line of raw.split('\n')) {
			if (line.startsWith('event:')) {
				eventType = line.slice(6).trim();
			} else if (line.startsWith('data:')) {
				data += line.slice(5).trim(); // Trim leading space after 'data:'
			}
		}

		return { eventType, data };
	};

	/**
	 * Attempt to parse accumulated JSON buffer
	 * Returns true if valid JSON was parsed, false otherwise
	 */
	const tryParseJsonBuffer = (): boolean => {
		if (!jsonBuffer.trim()) return false;

		try {
			const parsed = JSON.parse(jsonBuffer);
			
			// Reset buffer state
			jsonBuffer = '';
			isJsonBuffering = false;
			braceDepth = 0;

			// Process the parsed object using existing logic
			processParsedObject(parsed);
			return true;
		} catch {
			// Not valid JSON yet, continue buffering
			return false;
		}
	};

	/**
	 * Check if this is a Mastra-specific response
	 * Mastra uses custom event types and structure
	 */
	const isMastraResponse = (obj: any): boolean => {
		return (
			obj.type &&
			typeof obj.type === 'string' &&
			['start', 'step-start', 'tool-call', 'tool-result', 'step-finish', 'tool-output', 'step-result', 'step-output', 'finish'].includes(obj.type) &&
			obj.runId &&
			obj.from
		);
	};

	/**
	 * Process a successfully parsed JSON object
	 * Extracted from the main processDataContent function for reusability
	 */
	const processParsedObject = (parsed: any) => {
		// If the parsed value is a primitive (number, string, boolean, null),
		// treat it as plain text content rather than a structured object.
		// This handles cases where providers stream individual tokens like "292" or "•"
		if (parsed === null || typeof parsed !== 'object') {
			const processedContent = processContentChunk(String(parsed));
			currentTextMessage += processedContent;
			handler({ type: 'chunk', content: processedContent });
			return;
		}

		// OpenAI format: {"choices": [{"delta": {...}}]}
		if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
			const delta = parsed.choices[0].delta;

			// Process text content from delta
			if (delta.content) {
				const processedContent = processContentChunk(delta.content);
				currentTextMessage += processedContent;
				handler({ type: 'chunk', content: processedContent });
			}

			// Process structured data (tool calls, function calls)
			// Skip role-only deltas which don't contain actual content
			if (delta.tool_calls || delta.function_call) {
				// Save any accumulated text before processing object
				if (currentTextMessage.trim()) {
					completedItems.push(currentTextMessage.trim());
					currentTextMessage = '';
				}
				handler({ type: 'object', object: delta });
				completedItems.push(delta);
			}

			// Empty delta indicates completion for some providers
			if (Object.keys(delta).length === 0) {
				return;
			}
		}
		// 1. Direct content (may accompany a structured object)
		if (typeof parsed.content === 'string' && parsed.content.length > 0) {
			const processedContent = processContentChunk(parsed.content);
			currentTextMessage += processedContent;
			handler({ type: 'chunk', content: processedContent });
		}

		// 2. Mastra/custom structured object handling
		//    a) Inline object        -> {"type": "action", ... }
		//    b) Nested under object  -> {"object": {"type": "action", ...}}
		//    c) Mastra responses     -> {"type": "step-start", "runId": "...", "from": "...", "payload": {...}}
		if (
			parsed.type ||
			(parsed.object && (parsed.object as { type?: string }).type) ||
			isMastraResponse(parsed)
		) {
			const structuredObject = parsed.type
				? parsed
				: (parsed.object as object);

			// Flush any accumulated text before sending the object event
			if (currentTextMessage.trim()) {
				completedItems.push(currentTextMessage.trim());
				currentTextMessage = '';
			}

			handler({ type: 'object', object: structuredObject });
			completedItems.push(structuredObject);
		}

		// 3. Fallback for generic JSON without recognised fields but still valuable
		if (
			!parsed.choices &&
			!parsed.type &&
			!(parsed.object && (parsed.object as { type?: string }).type) &&
			!parsed.content
		) {
			// Flush accumulated text first
			if (currentTextMessage.trim()) {
				completedItems.push(currentTextMessage.trim());
				currentTextMessage = '';
			}

			handler({ type: 'object', object: parsed });
			completedItems.push(parsed);
		}
	};

	/**
	 * Process the data content from SSE events
	 * Handles multiple content formats:
	 * 1. OpenAI delta format: {"choices": [{"delta": {"content": "text"}}]}
	 * 2. Custom object format: {"type": "action", "data": {...}}
	 * 3. Direct content: {"content": "text"}
	 * 4. Plain text: raw string content
	 * 5. Partial JSON objects streamed across multiple chunks
	 */
	const processDataContent = (data: string) => {
		// Skip completion markers that signal end of stream
		if (data.trim() === '[DONE]' || data.trim() === 'done') {
			return;
		}

		// Check if this chunk starts with { and we're not already buffering
		if (!isJsonBuffering && data.trim().startsWith('{')) {
			// Start JSON buffering immediately for this chunk
			isJsonBuffering = true;
			jsonBuffer = data;
			braceDepth = (data.match(/\{/g) || []).length - (data.match(/\}/g) || []).length;
			return;
		}
		


		// If we're in JSON buffering mode, accumulate chunks
		if (isJsonBuffering) {
			// Update brace depth for this chunk
			braceDepth += (data.match(/\{/g) || []).length - (data.match(/\}/g) || []).length;
			
			// Add to buffer
			jsonBuffer += data;
			
			// Check buffer size limit
			if (jsonBuffer.length > MAX_JSON_BUFFER_SIZE) {
				// Buffer too large, flush as text and reset
				const processedContent = processContentChunk(jsonBuffer);
				currentTextMessage += processedContent;
				handler({ type: 'chunk', content: processedContent });
				
				jsonBuffer = '';
				isJsonBuffering = false;
				braceDepth = 0;
				return;
			}

			// Try to parse the accumulated buffer
			if (braceDepth === 0 && tryParseJsonBuffer()) {
							return; // Successfully parsed and processed
			}

			// Still buffering, don't process as text yet
			return;
		}

		// Attempt JSON parsing first (most common case for complete objects)
		try {
			const parsed = JSON.parse(data);
			processParsedObject(parsed);
		} catch {
			// Not valid JSON, treat as plain text content
			// Note: Don't use data.trim() here as it would filter out space-only chunks
			if (data && data !== '[DONE]' && data !== 'done') {
				const processedContent = processContentChunk(data);
				currentTextMessage += processedContent;
				handler({ type: 'chunk', content: processedContent });
			}
		}
	};

	try {
		// Main streaming loop - read and process SSE events
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			// Decode bytes to string and add to buffer
			buffer += decoder.decode(value, { stream: true });



			// Process complete SSE events (delimited by \n\n)
			let eventBoundary: number;
			while ((eventBoundary = buffer.indexOf('\n\n')) !== -1) {
				const rawEvent = buffer.slice(0, eventBoundary);
				buffer = buffer.slice(eventBoundary + 2);

				if (!rawEvent.trim()) continue; // Skip empty events

				const { eventType, data } = parseSSEEvent(rawEvent);

				// Check for stream completion signals
				if (eventType.trim() === 'done' || data.trim() === '[DONE]') {
					break;
				} else {
					processDataContent(data);
				}
			}


		}

		// Finalize any remaining accumulated text
		if (currentTextMessage.trim()) {
			completedItems.push(currentTextMessage.trim());
		}

		// Handle any remaining JSON buffer content
		if (isJsonBuffering && jsonBuffer.trim()) {
			// Try one final parse attempt
			if (!tryParseJsonBuffer()) {
				// If still can't parse, treat as text content and send as chunk
				const processedContent = processContentChunk(jsonBuffer);
				currentTextMessage += processedContent;
				handler({ type: 'chunk', content: processedContent });
				completedItems.push(processedContent);
			}
		}

		// Signal completion with summary of all processed items
		handler({ type: 'done', completedItems });
	} catch (error) {
		handler({ type: 'error', error: error as Error });
		throw error;
	}
}
