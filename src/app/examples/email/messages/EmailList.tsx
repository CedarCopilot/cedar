'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
	Star,
	Archive,
	Trash2,
	Mail,
	Clock,
	Tag,
	MoreVertical,
	RefreshCw,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useEmailStore } from '@/app/examples/email/store/emailStore';
import { Email } from '@/app/examples/email/types';
import { useRouter } from 'next/navigation';

export function EmailList() {
	const {
		emails,
		filter,
		searchQuery,
		selectedEmailIds,
		toggleEmailSelection,
		selectAllEmails,
		clearSelection,
		toggleStar,
		markAsRead,
		settings,
	} = useEmailStore();

	const router = useRouter();
	const [, setHoveredEmailId] = useState<string | null>(null);

	const prefetchEmail = (id: string) => {
		try {
			// Prefetch the detail route for snappier navigation
			router.prefetch?.(`/examples/email/inbox/${id}`);
		} catch {}
	};

	// Filter emails based on current view and search
	const filteredEmails = useMemo(() => {
		let filtered = emails.filter((email) => {
			// Filter by view
			switch (filter.view) {
				case 'inbox':
					return (
						!email.isSent && !email.isDraft && !email.isTrash && !email.isSpam
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
					return true;
			}
		});

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(email) =>
					email.subject.toLowerCase().includes(query) ||
					email.body.toLowerCase().includes(query) ||
					email.from.name?.toLowerCase().includes(query) ||
					email.from.email.toLowerCase().includes(query)
			);
		}

		// Sort by date (newest first)
		return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
	}, [emails, filter.view, searchQuery]);

	const allSelected =
		filteredEmails.length > 0 &&
		filteredEmails.every((email) => selectedEmailIds.includes(email.id));

	const handleSelectAll = () => {
		if (allSelected) {
			clearSelection();
		} else {
			selectAllEmails();
		}
	};

	const formatEmailDate = (date: Date): string => {
		const now = new Date();
		const emailDate = new Date(date);
		const diffInHours =
			(now.getTime() - emailDate.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 24) {
			return emailDate.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true,
			});
		} else if (diffInHours < 24 * 7) {
			return emailDate.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
			});
		} else {
			return emailDate.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			});
		}
	};

	const getRowDensityClass = () => {
		switch (settings.displayDensity) {
			case 'compact':
				return 'py-1';
			case 'cozy':
				return 'py-2';
			default:
				return 'py-3';
		}
	};

	// Sectioning helpers and data
	const toLower = (s: string) => s.toLowerCase();
	const includesAny = (text: string, keywords: string[]) => {
		const t = toLower(text || '');
		return keywords.some((k) => t.includes(k));
	};

	const meetingKeywords = [
		'meeting',
		'schedule',
		'calendar',
		'invite',
		'reschedule',
		'zoom',
		'google meet',
		'call',
		'appointment',
	];

	const importantEmails = filteredEmails.filter((e) => e.isImportant);
	const importantIds = new Set(importantEmails.map((e) => e.id));

	const meetingEmails = filteredEmails.filter((e) => {
		if (importantIds.has(e.id)) return false;
		return (
			includesAny(e.subject, meetingKeywords) ||
			includesAny(e.body, meetingKeywords)
		);
	});
	const meetingIds = new Set(meetingEmails.map((e) => e.id));

	const responseEmails = filteredEmails.filter((e) => {
		if (importantIds.has(e.id) || meetingIds.has(e.id)) return false;
		const subject = toLower(e.subject || '');
		const isReplySubject = subject.startsWith('re:');
		const referencesExist =
			Array.isArray(e.references) && e.references.length > 0;
		const inReply = !!e.inReplyTo;
		const fromNotMe = e.from.email !== 'me@gmail.com';
		return fromNotMe && (isReplySubject || referencesExist || inReply);
	});

	const anySectionHasItems =
		importantEmails.length + meetingEmails.length + responseEmails.length > 0;

	return (
		<div className='flex-1 bg-white dark:bg-gray-900 rounded-lg overflow-hidden'>
			{/* Toolbar */}
			<div className='border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-2'>
				<Checkbox
					checked={allSelected}
					onCheckedChange={handleSelectAll}
					className='mr-2'
				/>

				{selectedEmailIds.length > 0 ? (
					<>
						<button className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
							<Archive className='w-4 h-4 text-gray-600 dark:text-gray-400' />
						</button>
						<button className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
							<Trash2 className='w-4 h-4 text-gray-600 dark:text-gray-400' />
						</button>
						<button
							onClick={() => markAsRead(selectedEmailIds)}
							className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
							<Mail className='w-4 h-4 text-gray-600 dark:text-gray-400' />
						</button>
						<button className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
							<Clock className='w-4 h-4 text-gray-600 dark:text-gray-400' />
						</button>
						<button className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
							<Tag className='w-4 h-4 text-gray-600 dark:text-gray-400' />
						</button>
						<button className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
							<MoreVertical className='w-4 h-4 text-gray-600 dark:text-gray-400' />
						</button>
					</>
				) : (
					<button className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
						<RefreshCw className='w-4 h-4 text-gray-600 dark:text-gray-400' />
					</button>
				)}

				<div className='ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
					<span>
						1-{Math.min(50, filteredEmails.length)} of {filteredEmails.length}
					</span>
					<button className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded'>
						<ChevronLeft className='w-4 h-4' />
					</button>
					<button className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded'>
						<ChevronRight className='w-4 h-4' />
					</button>
				</div>
			</div>

			{/* Email sections */}
			<div
				className='overflow-y-auto'
				style={{ maxHeight: 'calc(100vh - 200px)' }}>
				{!anySectionHasItems ? (
					<div className='flex flex-col items-center justify-center py-20 text-gray-500'>
						<Mail className='w-12 h-12 mb-4 text-gray-300' />
						<p className='text-lg'>No emails in {filter.view}</p>
					</div>
				) : (
					<div className='divide-y divide-gray-200 dark:divide-gray-800'>
						{/* Important */}
						<section className='py-4'>
							<h2 className='px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'>
								Important
							</h2>
							{importantEmails.length === 0 ? (
								<p className='px-4 py-6 text-sm text-gray-500'>
									No important emails
								</p>
							) : (
								importantEmails.map((email) => (
									<EmailListItem
										key={email.id}
										email={email}
										isSelected={selectedEmailIds.includes(email.id)}
										onHover={(id) => {
											setHoveredEmailId(id);
											if (id) prefetchEmail(id);
										}}
										onToggleSelect={() => toggleEmailSelection(email.id)}
										onToggleStar={() => toggleStar(email.id)}
										densityClass={getRowDensityClass()}
										formatDate={formatEmailDate}
									/>
								))
							)}
						</section>

						{/* Meeting schedules */}
						<section className='py-4'>
							<h2 className='px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'>
								Meeting schedules
							</h2>
							{meetingEmails.length === 0 ? (
								<p className='px-4 py-6 text-sm text-gray-500'>
									No meeting-related emails
								</p>
							) : (
								meetingEmails.map((email) => (
									<EmailListItem
										key={email.id}
										email={email}
										isSelected={selectedEmailIds.includes(email.id)}
										onHover={setHoveredEmailId}
										onToggleSelect={() => toggleEmailSelection(email.id)}
										onToggleStar={() => toggleStar(email.id)}
										densityClass={getRowDensityClass()}
										formatDate={formatEmailDate}
									/>
								))
							)}
						</section>

						{/* Responses */}
						<section className='py-4'>
							<h2 className='px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'>
								Responses
							</h2>
							{responseEmails.length === 0 ? (
								<p className='px-4 py-6 text-sm text-gray-500'>No responses</p>
							) : (
								responseEmails.map((email) => (
									<EmailListItem
										key={email.id}
										email={email}
										isSelected={selectedEmailIds.includes(email.id)}
										onHover={setHoveredEmailId}
										onToggleSelect={() => toggleEmailSelection(email.id)}
										onToggleStar={() => toggleStar(email.id)}
										densityClass={getRowDensityClass()}
										formatDate={formatEmailDate}
									/>
								))
							)}
						</section>
					</div>
				)}
			</div>
		</div>
	);
}

interface EmailListItemProps {
	email: Email;
	isSelected: boolean;
	onHover: (id: string | null) => void;
	onToggleSelect: () => void;
	onToggleStar: () => void;
	densityClass: string;
	formatDate: (date: Date) => string;
}

function EmailListItem({
	email,
	isSelected,
	onHover,
	onToggleSelect,
	onToggleStar,
	densityClass,
	formatDate,
}: EmailListItemProps) {
	return (
		<Link
			href={`/examples/email/inbox/${email.id}`}
			prefetch={true}
			className='block'>
			<div
				className={`border-b border-gray-100 dark:border-gray-800 hover:shadow-sm transition-all cursor-pointer ${
					isSelected
						? 'bg-blue-50 dark:bg-blue-900/20'
						: 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
				} ${!email.isRead ? 'font-semibold' : ''}`}
				onMouseEnter={() => onHover(email.id)}
				onMouseLeave={() => onHover(null)}>
				<div className={`flex items-center gap-3 px-4 ${densityClass}`}>
					<Checkbox
						checked={isSelected}
						onChange={(e) => {
							e.stopPropagation();
							onToggleSelect();
						}}
						onClick={(e) => e.stopPropagation()}
					/>

					<button
						onClick={(e) => {
							e.stopPropagation();
							e.preventDefault();
							onToggleStar();
						}}
						className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ${
							email.isStarred
								? 'text-yellow-500'
								: 'text-gray-400 dark:text-gray-600'
						}`}>
						<Star
							className='w-4 h-4'
							fill={email.isStarred ? 'currentColor' : 'none'}
						/>
					</button>

					{email.isImportant && (
						<div className='w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-yellow-500' />
					)}

					<div className='flex-1 flex items-center gap-4 min-w-0'>
						<div className='w-48 flex items-center gap-2'>
							{email.from.avatar ? (
								<img
									src={email.from.avatar}
									alt={email.from.name || email.from.email}
									className='w-8 h-8 rounded-full'
								/>
							) : (
								<div className='w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-sm font-medium'>
									{(email.from.name || email.from.email)[0].toUpperCase()}
								</div>
							)}
							<span className='truncate text-sm'>
								{email.from.name || email.from.email}
							</span>
						</div>

						<div className='flex-1 flex items-center gap-2 min-w-0'>
							<span className='truncate text-sm'>{email.subject}</span>
							<span className='text-gray-500 dark:text-gray-500 font-normal'>
								{' '}
								-{' '}
							</span>
							<span className='truncate text-sm text-gray-600 dark:text-gray-400 font-normal'>
								{email.bodyPreview}
							</span>
						</div>

						{email.labels.length > 0 && (
							<div className='flex gap-1'>
								{email.labels.map((label) => (
									<span
										key={label.id}
										className='px-2 py-0.5 text-xs rounded-full'
										style={{
											backgroundColor: `${label.color}20`,
											color: label.color,
										}}>
										{label.name}
									</span>
								))}
							</div>
						)}

						{email.attachments && email.attachments.length > 0 && (
							<div className='text-gray-500 dark:text-gray-500'>📎</div>
						)}

						<span className='text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap'>
							{formatDate(email.date)}
						</span>
					</div>
				</div>
			</div>
		</Link>
	);
}
