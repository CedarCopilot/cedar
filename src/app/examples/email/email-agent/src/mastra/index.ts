import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { emailAgent } from './agents/email-agent';
import { registerApiRoute } from '@mastra/core/server';
import { z } from 'zod';
import type { Context } from 'hono';
import { Agent } from '@mastra/core';

// Define the chat request schema for Cedar compatibility
const ChatRequestSchema = z.object({
	prompt: z.string(), // Cedar sends 'prompt' not 'messages'
	model: z.string().optional(),
	temperature: z.number().optional(),
	maxTokens: z.number().optional(),
	systemPrompt: z.string().optional(),
});

// Chat handler - regular text generation
async function handleChatMessage(c: Context) {
	try {
		const body = await c.req.json();
		const { prompt, temperature, maxTokens, systemPrompt } =
			ChatRequestSchema.parse(body);

		const agent = c.get('mastra').getAgent('emailAgent') as Agent;
		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404);
		}

		// Convert prompt to messages format for the agent
		const messages = [
			...(systemPrompt
				? [{ role: 'system' as const, content: systemPrompt }]
				: []),
			{ role: 'user' as const, content: prompt },
		];

		const response = await agent.generate(messages, {
			temperature,
			maxTokens,
			maxSteps: 3, // Allow tool usage for email operations
			onStepFinish: ({ text, toolCalls, toolResults }) => {
				console.log('Step completed:', { text, toolCalls, toolResults });
			},
		});

		// Return in Cedar's expected format
		return c.json({
			text: response.text, // Cedar expects 'text' field
			usage: response.usage,
		});
	} catch (error) {
		console.error('Chat error:', error);
		return c.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			500
		);
	}
}

// Streaming handler - for real-time responses
async function handleChatMessageStream(c: Context) {
	try {
		const body = await c.req.json();
		const { prompt, temperature, maxTokens, systemPrompt } =
			ChatRequestSchema.parse(body);

		const agent = c.get('mastra').getAgent('emailAgent');
		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404);
		}

		// Convert prompt to messages format for the agent
		const messages = [
			...(systemPrompt
				? [{ role: 'system' as const, content: systemPrompt }]
				: []),
			{ role: 'user' as const, content: prompt },
		];

		const stream = await agent.stream(messages, {
			temperature,
			maxTokens,
		});

		// Create a TransformStream to convert the agent's stream to SSE format
		const encoder = new TextEncoder();
		const transformStream = new TransformStream({
			async transform(chunk, controller) {
				// Format as Server-Sent Events
				controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
			},
			flush(controller) {
				// Send the done event
				controller.enqueue(encoder.encode(`event: done\ndata: \n\n`));
			},
		});

		// Pipe the text stream through our transform
		const reader = stream.textStream.getReader();
		const writer = transformStream.writable.getWriter();

		(async () => {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					await writer.write(value);
				}
			} finally {
				await writer.close();
			}
		})();

		return new Response(transformStream.readable, {
			status: 200,
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			},
		});
	} catch (error) {
		console.error('Stream error:', error);
		return c.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			500
		);
	}
}

// Define API routes
const apiRoutes = [
	registerApiRoute('/chat', {
		method: 'POST',
		handler: handleChatMessage,
		openapi: {
			requestBody: {
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								prompt: {
									type: 'string',
									description: 'The prompt to send to the agent',
								},
								model: {
									type: 'string',
								},
								temperature: {
									type: 'number',
								},
								maxTokens: {
									type: 'number',
								},
								systemPrompt: {
									type: 'string',
								},
							},
							required: ['prompt'],
						},
					},
				},
			},
		},
	}),
	registerApiRoute('/chat/stream', {
		method: 'POST',
		handler: handleChatMessageStream,
		openapi: {
			requestBody: {
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								prompt: {
									type: 'string',
									description: 'The prompt to send to the agent',
								},
								model: {
									type: 'string',
								},
								temperature: {
									type: 'number',
								},
								maxTokens: {
									type: 'number',
								},
								systemPrompt: {
									type: 'string',
								},
							},
							required: ['prompt'],
						},
					},
				},
			},
		},
	}),
];

export const mastra = new Mastra({
	agents: { emailAgent },
	storage: new LibSQLStore({
		// stores telemetry, evals, ... into memory storage
		url: ':memory:',
	}),
	server: {
		apiRoutes,
		cors: {
			origin: '*',
			credentials: true,
		},
	},
	logger: new PinoLogger({
		name: 'Mastra',
		level: 'info',
	}),
});
