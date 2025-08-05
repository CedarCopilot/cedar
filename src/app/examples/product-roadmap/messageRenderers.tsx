// src/app/examples/product-roadmap/messageRenderers.tsx
'use client';

import { useEffect } from 'react';
import { useCedarStore } from 'cedar-os';
import { MastraMessage, MessageProcessor } from 'cedar-os';

import { mastraProcessors } from '@/chatMessages/MastraProcessors';
/* 1 — all default Mastra processors */

/* 2 — optionally add / override your own  ------------------ */

import type { CustomMessage, Message, ActionMessage } from 'cedar-os';

/* custom tool-call processor that overrides the default */
const CustomToolCallRenderer: React.FC<{
	message: Message;
}> = ({ message }) => {
	const toolMsg = message as MastraMessage<'tool-call'>;
	const { toolName } = toolMsg.payload as {
		toolName?: string;
	};

	return (
		<div className='border-l-4 border-blue-500 pl-3 py-2 my-2 bg-blue-50'>
			<div className='flex items-center gap-2'>
				<span className='text-blue-700 font-semibold'>
					🔧 {toolName ?? 'tool'}
				</span>
				<span className='text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded'>
					Tool Call
				</span>
			</div>
		</div>
	);
};

const customToolCallProcessor: MessageProcessor = {
	type: 'tool-call',
	namespace: 'custom',
	priority: 10, // Higher than default (0)
	render: CustomToolCallRenderer,
	validate: (msg): msg is MastraMessage<'tool-call'> =>
		msg.type === 'tool-call',
};

/* ---------------------------------------------------------------------------
 * Example of a completely custom message type (not Mastra-related)
 * This message is emitted with `{ type: 'alert', level: 'info' | 'warning' | 'error', text: string }`
 * --------------------------------------------------------------------------*/

type AlertLevel = 'info' | 'warning' | 'error';
export type AlertMessage = CustomMessage<
	'alert',
	{ level: AlertLevel; text: string }
>;

const AlertRendererComponent: React.FC<{ message: Message }> = ({
	message,
}) => {
	const alertMessage = message as AlertMessage;
	const colour =
		alertMessage.level === 'error'
			? 'border-red-500 text-red-600'
			: alertMessage.level === 'warning'
			? 'border-yellow-500 text-yellow-600'
			: 'border-blue-500 text-blue-600';
	return (
		<div className={`border-l-4 pl-2 my-1 text-xs ${colour}`}>
			{alertMessage.text}
		</div>
	);
};

const alertProcessor: MessageProcessor = {
	type: 'alert',
	namespace: 'custom',
	priority: 0,
	render: AlertRendererComponent,
	validate: (msg): msg is AlertMessage =>
		msg.type === 'alert' &&
		typeof msg.level === 'string' &&
		typeof msg.text === 'string',
};

/* ---------------------------------------------------------------------------
 * Custom processor for "addNode" actions - shows special rendering for node additions
 * This handles action messages where setterKey is "addNode"
 * --------------------------------------------------------------------------*/

const AddNodeRenderer: React.FC<{ message: Message }> = ({ message }) => {
	const actionMsg = message as ActionMessage;

	return (
		<div className='border-l-4 border-green-500 bg-green-50 p-4 my-2 rounded-r'>
			<div className='flex items-center gap-3 mb-2'>
				<span className='text-2xl'>🌳</span>
				<div>
					<h4 className='font-semibold text-green-700'>
						Node Added to Roadmap
					</h4>
					<p className='text-sm text-green-600'>New node has been created</p>
				</div>
			</div>

			<div className='mt-2 text-xs text-green-600'>
				✅ State updated: {actionMsg.stateKey}.{actionMsg.setterKey}
			</div>
		</div>
	);
};

const addNodeProcessor: MessageProcessor = {
	type: 'action',
	namespace: 'roadmap',
	priority: 15, // Higher than default to override default action processor

	// Execute business logic with custom logging
	execute: (obj, store) => {
		const actionMsg = obj as ActionMessage;

		// Custom logging for addNode actions
		console.group('🌳 Add Node Action Processor');
		console.log('Action received:', {
			type: actionMsg.type,
			stateKey: actionMsg.stateKey,
			setterKey: actionMsg.setterKey,
			args: actionMsg.args,
		});

		// Execute the state setter
		if (actionMsg.stateKey && actionMsg.setterKey) {
			const args = Array.isArray(actionMsg.args) ? actionMsg.args : [];
			console.log(
				'Executing setter:',
				actionMsg.stateKey,
				actionMsg.setterKey,
				args
			);
			store.executeCustomSetter(
				actionMsg.stateKey,
				actionMsg.setterKey,
				...args
			);
		}

		console.log('Node addition processed successfully');
		console.groupEnd();

		// Add to chat with custom message
		store.addMessage(actionMsg);
	},

	// Custom rendering for addNode actions
	render: AddNodeRenderer,

	// Only handle action messages where setterKey is "addNode"
	validate: (msg): msg is ActionMessage =>
		msg.type === 'action' && (msg as ActionMessage).setterKey === 'addNode',
};

/* ---------------------------------------------------------- */

export function ProductRoadmapMessageRenderers() {
	const registerProcessors = useCedarStore((s) => s.registerMessageProcessors);
	const unregisterProcessor = useCedarStore(
		(s) => s.unregisterMessageProcessor
	);

	useEffect(() => {
		// Register all Mastra processors
		registerProcessors(mastraProcessors);

		// Register custom tool-call processor (higher priority overrides default)
		registerProcessors([customToolCallProcessor]);

		// Register custom alert processor
		registerProcessors([alertProcessor]);

		// Register custom addNode action processor
		registerProcessors([addNodeProcessor]);

		return () => {
			/* tidy up on unmount (hot-reload etc.) */
			// Unregister Mastra processors
			mastraProcessors.forEach((processor) => {
				unregisterProcessor(processor.type, 'mastra');
			});
			// Unregister custom processors
			unregisterProcessor('tool-call', 'custom');
			unregisterProcessor('alert', 'custom');
			unregisterProcessor('action', 'roadmap');
		};
	}, [registerProcessors, unregisterProcessor]);

	return null; // this component only performs registration
}
