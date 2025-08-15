'use client';

import { memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EmailView from '../../messages/EmailView';
import { InlineComposeEmail } from '../../drafts/InlineComposeEmail';
import { useEmailStore } from '../../store/emailStore';

function EmailDetailPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const emails = useEmailStore((state) => state.emails);

	const email = emails.find((e) => e.id === params.id);

	const handleClose = () => {
		// Try to go back in history, fallback to inbox
		if (window.history.length > 1) {
			router.back();
		} else {
			router.push('/examples/email/inbox');
		}
	};

	if (!email) {
		return (
			<div className='flex items-center justify-center flex-1 text-gray-500'>
				Email not found
			</div>
		);
	}

	return (
		<div className='flex flex-col h-full'>
			<EmailView email={email} onClose={handleClose} />
			{/* Inline composer that takes up the remainder of the screen */}
			<div className='flex-1 min-h-0'>
				<InlineComposeEmail parentEmail={email} />
			</div>
		</div>
	);
}

export default memo(EmailDetailPage);
