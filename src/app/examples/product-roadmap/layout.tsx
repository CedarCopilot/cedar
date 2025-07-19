'use client';

import { CedarCopilot } from 'cedar';
import type { ProviderConfig } from 'cedar';
import { ReactNode } from 'react';

export default function ProductRoadmapLayout({
	children,
}: {
	children: ReactNode;
}) {
	// Configure Mastra provider to connect to the local Mastra dev server
	// When you run `npm run dev` in the product_roadmap-agent directory,
	// Mastra starts a server on port 4111 by default with API endpoints
	const llmProvider: ProviderConfig = {
		provider: 'mastra',
		apiKey: 'not-needed-for-local', // API key is not needed for local Mastra agent
		baseURL:
			process.env.NODE_ENV === 'development'
				? 'http://localhost:4111'
				: 'https://modern-lemon-whale.mastra.cloud', // Mastra dev server default port
	};

	return <CedarCopilot llmProvider={llmProvider}>{children}</CedarCopilot>;
}
