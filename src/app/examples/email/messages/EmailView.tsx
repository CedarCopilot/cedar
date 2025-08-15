'use client';

import { memo } from 'react';
import {
	ArrowLeft,
	Archive,
	Trash2,
	Mail,
	Clock,
	Tag,
	MoreVertical,
	Reply,
	ReplyAll,
	Forward,
	Star,
} from 'lucide-react';
import { useEmailStore } from '@/app/examples/email/store/emailStore';
import { Email } from '@/app/examples/email/types';
import { format } from 'date-fns';

interface EmailViewProps {
	email: Email;
	onClose: () => void;
}

function EmailView({ email, onClose }: EmailViewProps) {
	const { toggleStar, markAsRead, moveToTrash, createComposeDraft } =
		useEmailStore();

	// Mark as read when viewing (only if not already read)
	if (!email.isRead) {
		markAsRead([email.id]);
	}

	return (
		<div className='bg-white dark:bg-gray-900 rounded-lg overflow-hidden flex flex-col'>
			{/* Toolbar */}
			<div className='border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-2'>
				<button
					onClick={onClose}
					className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
					<ArrowLeft className='w-4 h-4 text-gray-600 dark:text-gray-400' />
				</button>

				<div className='flex items-center gap-1 ml-2'>
					<button className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
						<Archive className='w-4 h-4 text-gray-600 dark:text-gray-400' />
					</button>
					<button
						onClick={() => moveToTrash([email.id])}
						className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
						<Trash2 className='w-4 h-4 text-gray-600 dark:text-gray-400' />
					</button>
					<button className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
						<Mail className='w-4 h-4 text-gray-600 dark:text-gray-400' />
					</button>
					<button className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
						<Clock className='w-4 h-4 text-gray-600 dark:text-gray-400' />
					</button>
					<button className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
						<Tag className='w-4 h-4 text-gray-600 dark:text-gray-400' />
					</button>

					<div className='w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1' />

					<button className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'>
						<MoreVertical className='w-4 h-4 text-gray-600 dark:text-gray-400' />
					</button>
				</div>
			</div>

			{/* Email content */}
			<div className='flex-1 overflow-y-auto'>
				<div className='p-6'>
					{/* Subject */}
					<div className='flex items-start justify-between mb-4'>
						<h1 className='text-2xl font-normal text-gray-900 dark:text-gray-100'>
							{email.subject}
						</h1>
						<button
							onClick={() => toggleStar(email.id)}
							className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 ${
								email.isStarred
									? 'text-yellow-500'
									: 'text-gray-400 dark:text-gray-600'
							}`}>
							<Star
								className='w-5 h-5'
								fill={email.isStarred ? 'currentColor' : 'none'}
							/>
						</button>
					</div>

					{/* Labels */}
					{email.labels.length > 0 && (
						<div className='flex gap-2 mb-4'>
							{email.labels.map((label) => (
								<span
									key={label.id}
									className='inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm'
									style={{
										backgroundColor: `${label.color}20`,
										color: label.color,
									}}>
									<Tag className='w-3 h-3' />
									{label.name}
								</span>
							))}
						</div>
					)}

					{/* Sender info */}
					<div className='flex items-center justify-between mb-6'>
						<div className='flex items-center gap-3'>
							{email.from.avatar ? (
								<img
									src={email.from.avatar}
									alt={email.from.name || email.from.email}
									className='w-10 h-10 rounded-full'
								/>
							) : (
								<div className='w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center font-medium'>
									{(email.from.name || email.from.email)[0].toUpperCase()}
								</div>
							)}
							<div>
								<div className='font-medium text-gray-900 dark:text-gray-100'>
									{email.from.name || email.from.email}
								</div>
								<div className='text-sm text-gray-600 dark:text-gray-400'>
									to me
								</div>
							</div>
						</div>

						<div className='flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400'>
							<span>{format(email.date, 'MMM d, yyyy, h:mm a')}</span>
							<button className='hover:text-gray-900 dark:hover:text-gray-200'>
								<Star className='w-4 h-4' />
							</button>
							<button className='hover:text-gray-900 dark:hover:text-gray-200'>
								<Reply className='w-4 h-4' />
							</button>
							<button className='hover:text-gray-900 dark:hover:text-gray-200'>
								<MoreVertical className='w-4 h-4' />
							</button>
						</div>
					</div>

					{/* Email body */}
					<div className='prose prose-gray dark:prose-invert max-w-none'>
						<div className='whitespace-pre-wrap text-gray-700 dark:text-gray-300'>
							{email.body}
						</div>
					</div>

					{/* Attachments */}
					{email.attachments && email.attachments.length > 0 && (
						<div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
							<h3 className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-3'>
								{email.attachments.length} Attachment
								{email.attachments.length > 1 ? 's' : ''}
							</h3>
							<div className='flex flex-wrap gap-3'>
								{email.attachments.map((attachment) => (
									<div
										key={attachment.id}
										className='flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'>
										<div className='w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center'>
											📄
										</div>
										<div>
											<div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
												{attachment.filename}
											</div>
											<div className='text-xs text-gray-600 dark:text-gray-400'>
												{(attachment.size / 1024 / 1024).toFixed(2)} MB
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Action buttons */}
					<div className='mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 flex gap-3'>
						<button
							onClick={() => createComposeDraft('reply', email)}
							className='px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm flex items-center gap-2'>
							<Reply className='w-4 h-4' />
							Reply
						</button>
						<button
							onClick={() => createComposeDraft('replyAll', email)}
							className='px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm flex items-center gap-2'>
							<ReplyAll className='w-4 h-4' />
							Reply All
						</button>
						<button
							onClick={() => createComposeDraft('forward', email)}
							className='px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm flex items-center gap-2'>
							<Forward className='w-4 h-4' />
							Forward
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default memo(EmailView);
