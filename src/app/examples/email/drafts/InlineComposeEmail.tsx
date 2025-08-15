'use client';

import { useEffect, useState } from 'react';
import { useEmailStore } from '@/app/examples/email/store/emailStore';
import { ComposeEmail } from './ComposeEmail';
import { Email } from '@/app/examples/email/types';

interface InlineComposeEmailProps {
	parentEmail?: Email; // The email being replied to (optional for new inline compose)
}

export function InlineComposeEmail({ parentEmail }: InlineComposeEmailProps) {
	const { createComposeDraft, composeDrafts } = useEmailStore();
	const [inlineDraftId, setInlineDraftId] = useState<string | null>(null);

	useEffect(() => {
		// Create an inline compose draft when component mounts
		const mode = parentEmail ? 'reply' : 'new';
		const draftId = createComposeDraft(
			mode,
			parentEmail,
			true, // isInline = true
			parentEmail?.id
		);
		setInlineDraftId(draftId);

		// Cleanup function to remove the draft when component unmounts
		return () => {
			// Note: We don't auto-cleanup here to preserve drafts when navigating
			// The user can explicitly close or send the draft
		};
	}, [parentEmail?.id, createComposeDraft]);

	// Find the current inline draft
	const inlineDraft = composeDrafts.find(
		(draft) => draft.id === inlineDraftId && draft.isInline
	);

	if (!inlineDraftId || !inlineDraft) {
		return (
			<div className='flex items-center justify-center p-8 text-gray-500'>
				Loading compose...
			</div>
		);
	}

	return (
		<div className='h-full'>
			<ComposeEmail draftId={inlineDraftId} inline />
		</div>
	);
}
