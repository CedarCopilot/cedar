import { handleEventStream } from '@/store/agentConnection/agentUtils';
import type { StreamHandler } from '@/store/agentConnection/AgentConnectionTypes';

// Mock Response object for testing
const createMockResponse = (chunks: string[]): Response => {
	let chunkIndex = 0;
	
	const stream = new ReadableStream({
		start(controller) {
			// Simulate streaming chunks synchronously for reliable testing
			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				// Format as SSE event
				const sseChunk = `data: ${chunk}\n\n`;
				controller.enqueue(new TextEncoder().encode(sseChunk));
			}
			controller.close();
		}
	});

	return new Response(stream);
};

describe('handleEventStream - JSON Buffering', () => {
	let handler: StreamHandler;
	let receivedEvents: any[];

	beforeEach(() => {
		receivedEvents = [];
		handler = (event) => {
			receivedEvents.push(event);
		};
	});

	it('should buffer and reconstruct partial JSON objects', async () => {
		const chunks = [
			'{',
			'"type": "action"',
			', "data": {"key": "value"}',
			'}'
		];

		const response = createMockResponse(chunks);
		await handleEventStream(response, handler);

		// Should receive the complete object, not individual chunks
		expect(receivedEvents).toHaveLength(2); // object + done
		expect(receivedEvents[0]).toEqual({
			type: 'object',
			object: {
				type: 'action',
				data: { key: 'value' }
			}
		});
		expect(receivedEvents[1].type).toBe('done');
	});

	it('should handle nested JSON objects correctly', async () => {
		const chunks = [
			'{',
			'"type": "nested"',
			', "data": {',
			'"inner": {',
			'"value": 42',
			'}',
			'}',
			'}'
		];

		const response = createMockResponse(chunks);
		await handleEventStream(response, handler);

		expect(receivedEvents[0]).toEqual({
			type: 'object',
			object: {
				type: 'nested',
				data: {
					inner: {
						value: 42
					}
				}
			}
		});
	});

	it('should handle mixed JSON and text content', async () => {
		const chunks = [
			'Hello world',
			'{',
			'"type": "action"',
			'}',
			'More text'
		];

		const response = createMockResponse(chunks);
		await handleEventStream(response, handler);

		// Should have: chunk (Hello world), object, chunk (More text), done
		expect(receivedEvents).toHaveLength(4);
		expect(receivedEvents[0]).toEqual({
			type: 'chunk',
			content: 'Hello world'
		});
		expect(receivedEvents[1]).toEqual({
			type: 'object',
			object: { type: 'action' }
		});
		expect(receivedEvents[2]).toEqual({
			type: 'chunk',
			content: 'More text'
		});
	});

	it('should handle malformed JSON gracefully', async () => {
		const chunks = [
			'{',
			'"type": "action"',
			// Missing closing brace - malformed JSON
		];

		const response = createMockResponse(chunks);
		await handleEventStream(response, handler);

		// Should fall back to treating as text when stream ends
		expect(receivedEvents[1].type).toBe('done');
		expect(receivedEvents[1].completedItems).toContain('{"type": "action"');
	});

	it('should handle complete JSON objects in single chunks', async () => {
		const chunks = [
			'{"type": "complete", "data": "single chunk"}'
		];

		const response = createMockResponse(chunks);
		await handleEventStream(response, handler);

		expect(receivedEvents[0]).toEqual({
			type: 'object',
			object: {
				type: 'complete',
				data: 'single chunk'
			}
		});
	});

	it('should respect buffer size limits', async () => {
		// Create a very long JSON object that exceeds buffer limit
		const longKey = 'x'.repeat(1024 * 1024); // 1MB
		const chunks = [
			'{',
			`"${longKey}": "value"`,
			'}'
		];

		const response = createMockResponse(chunks);
		await handleEventStream(response, handler);

		// Should fall back to text processing when buffer limit exceeded
		expect(receivedEvents[0].type).toBe('chunk');
	});

	it('should handle Mastra-specific responses correctly', async () => {
		const chunks = [
			'{',
			'"type": "step-start"',
			', "runId": "test-123"',
			', "from": "agent"',
			', "payload": {"key": "value"}',
			'}'
		];

		const response = createMockResponse(chunks);
		await handleEventStream(response, handler);

		// Should receive the complete Mastra object, not individual chunks
		expect(receivedEvents).toHaveLength(2); // object + done
		expect(receivedEvents[0]).toEqual({
			type: 'object',
			object: {
				type: 'step-start',
				runId: 'test-123',
				from: 'agent',
				payload: { key: 'value' }
			}
		});
		expect(receivedEvents[1].type).toBe('done');
	});
});
