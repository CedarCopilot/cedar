'use client';

import { ReactNode, useMemo, useState, memo } from 'react';
import { CedarCopilot } from 'cedar-os';
import type { ProviderConfig } from 'cedar-os';
import { SidePanelCedarChat } from '@/chatComponents/SidePanelCedarChat';
import { Mail } from 'lucide-react';
import { Header } from './layout/Header';
import { Sidebar } from './layout/Sidebar';
import { ComposeManager } from './drafts/ComposeManager';
import { usePathname } from 'next/navigation';

function EmailLayout({ children }: { children: ReactNode }) {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const pathname = usePathname();

	const isDetailRoute = useMemo(
		() =>
			pathname?.includes('/examples/email/inbox/') &&
			pathname !== '/examples/email/inbox',
		[pathname]
	);

	const llmProvider = useMemo<ProviderConfig>(
		() => ({
			provider: 'mastra',
			baseURL: process.env.NEXT_PUBLIC_MASTRA_URL || 'http://localhost:4112',
			apiKey: process.env.NEXT_PUBLIC_MASTRA_API_KEY,
		}),
		[]
	);

	return (
		<CedarCopilot llmProvider={llmProvider}>
			<SidePanelCedarChat
				side='right'
				title='Email Assistant'
				collapsedLabel='Need help with your emails?'
				showCollapsedButton={true}
				companyLogo={<Mail className='w-6 h-6 text-blue-600' />}
				dimensions={{ width: 400, minWidth: 350, maxWidth: 600 }}
				resizable={true}
				className='z-50'>
				<div className='relative h-screen flex flex-col bg-white dark:bg-gray-900'>
					<Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
					<div className='relative flex-1 flex overflow-hidden'>
						<Sidebar isOpen={sidebarOpen} />
						<main className='flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 p-2'>
							{children}
						</main>
					</div>
					{/* Always render compose manager but hide inline compose on detail routes */}
					<ComposeManager hideInlineCompose={isDetailRoute} />
				</div>
			</SidePanelCedarChat>
		</CedarCopilot>
	);
}

export default memo(EmailLayout);
