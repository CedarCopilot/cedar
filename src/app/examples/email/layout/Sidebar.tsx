'use client';

import {
	Inbox,
	Star,
	Clock,
	Send,
	FileText,
	Trash2,
	AlertCircle,
	Plus,
	ChevronDown,
	Tag,
} from 'lucide-react';
import { useEmailStore } from '@/app/examples/email/store/emailStore';
import { EmailView } from '@/app/examples/email/types';

interface SidebarProps {
	isOpen: boolean;
}

interface NavItem {
	icon: React.ReactNode;
	label: string;
	view: EmailView;
	count?: number;
}

export function Sidebar({ isOpen }: SidebarProps) {
	const { filter, setView, emails, labels, createComposeDraft } =
		useEmailStore();

	// Calculate counts for each view
	const getEmailCount = (view: EmailView): number => {
		return emails.filter((email) => {
			switch (view) {
				case 'inbox':
					return (
						!email.isSent &&
						!email.isDraft &&
						!email.isTrash &&
						!email.isSpam &&
						!email.isRead
					);
				case 'starred':
					return email.isStarred;
				case 'important':
					return email.isImportant;
				case 'sent':
					return email.isSent;
				case 'drafts':
					return email.isDraft;
				case 'trash':
					return email.isTrash;
				case 'spam':
					return email.isSpam;
				default:
					return false;
			}
		}).length;
	};

	const navItems: NavItem[] = [
		{
			icon: <Inbox className='w-5 h-5' />,
			label: 'Inbox',
			view: 'inbox',
			count: getEmailCount('inbox'),
		},
		{
			icon: <Star className='w-5 h-5' />,
			label: 'Starred',
			view: 'starred',
		},
		{
			icon: <Clock className='w-5 h-5' />,
			label: 'Snoozed',
			view: 'inbox', // Using inbox for now
		},
		{
			icon: <Send className='w-5 h-5' />,
			label: 'Sent',
			view: 'sent',
		},
		{
			icon: <FileText className='w-5 h-5' />,
			label: 'Drafts',
			view: 'drafts',
			count: getEmailCount('drafts'),
		},
		{
			icon: <Trash2 className='w-5 h-5' />,
			label: 'Trash',
			view: 'trash',
		},
		{
			icon: <AlertCircle className='w-5 h-5' />,
			label: 'Spam',
			view: 'spam',
			count: getEmailCount('spam'),
		},
	];

	return (
		<aside
			className={`${
				isOpen ? 'w-64' : 'w-20'
			} transition-all duration-300 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col`}>
			{/* Compose button */}
			<div className='p-4'>
				<button
					onClick={() => createComposeDraft('new')}
					className={`${
						isOpen ? 'w-full px-6 py-3 gap-3' : 'w-14 h-14 p-0'
					} bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-gray-700 dark:text-gray-200 rounded-2xl flex items-center justify-center transition-all shadow-sm hover:shadow-md`}>
					<Plus className='w-5 h-5' />
					{isOpen && <span className='font-medium'>Compose</span>}
				</button>
			</div>

			{/* Navigation items */}
			<nav className='flex-1 overflow-y-auto'>
				<ul className='space-y-1 px-2'>
					{navItems.map((item, index) => {
						const isActive = filter.view === item.view;
						return (
							<li key={index}>
								<button
									onClick={() => setView(item.view)}
									className={`w-full flex items-center gap-4 px-4 py-2 rounded-full transition-all ${
										isActive
											? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium'
											: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
									}`}>
									<span
										className={
											isActive ? 'text-red-600 dark:text-red-400' : ''
										}>
										{item.icon}
									</span>
									{isOpen && (
										<>
											<span className='flex-1 text-left text-sm'>
												{item.label}
											</span>
											{item.count && item.count > 0 && (
												<span
													className={`text-xs ${
														isActive
															? 'font-bold'
															: 'text-gray-500 dark:text-gray-500'
													}`}>
													{item.count}
												</span>
											)}
										</>
									)}
								</button>
							</li>
						);
					})}
				</ul>

				{/* Labels section */}
				{isOpen && (
					<div className='mt-6 px-2'>
						<button className='w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
							<ChevronDown className='w-4 h-4' />
							<span className='flex-1 text-left'>Labels</span>
							<Plus className='w-4 h-4' />
						</button>

						<ul className='mt-2 space-y-1'>
							{labels.map((label) => (
								<li key={label.id}>
									<button className='w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
										<Tag className='w-4 h-4' style={{ color: label.color }} />
										<span className='flex-1 text-left'>{label.name}</span>
									</button>
								</li>
							))}
						</ul>
					</div>
				)}
			</nav>

			{/* Storage info */}
			{isOpen && (
				<div className='p-4 border-t border-gray-200 dark:border-gray-700'>
					<div className='text-xs text-gray-500 dark:text-gray-500'>
						<div className='flex justify-between mb-1'>
							<span>15 GB of 15 GB used</span>
						</div>
						<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1'>
							<div
								className='bg-blue-500 h-1 rounded-full'
								style={{ width: '60%' }}
							/>
						</div>
					</div>
				</div>
			)}
		</aside>
	);
}
