'use client';

import { useEmailStore } from '@/app/examples/email/store/emailStore';
import { ComposeEmail } from './ComposeEmail';

interface ComposeManagerProps {
	hideInlineCompose?: boolean; // Hide inline compose drafts (for detail pages)
}

export function ComposeManager({
	hideInlineCompose = false,
}: ComposeManagerProps) {
	const { composeDrafts } = useEmailStore();

	// Filter drafts based on whether we want to show inline compose
	const visibleDrafts = composeDrafts.filter((draft) =>
		hideInlineCompose ? !draft.isInline : true
	);

	// Separate fullscreen drafts from regular ones
	const fullscreenDrafts = visibleDrafts.filter((draft) => draft.isFullscreen);
	const regularDrafts = visibleDrafts.filter((draft) => !draft.isFullscreen);

	return (
		<>
			{/* Fullscreen drafts render independently */}
			{fullscreenDrafts.map((draft) => (
				<div key={draft.id} className='fixed inset-0 z-50'>
					<ComposeEmail draftId={draft.id} />
				</div>
			))}

			{/* Regular drafts render in a flex container from the right */}
			{regularDrafts.length > 0 && (
				<div className='fixed bottom-0 right-4 flex flex-row-reverse gap-2 z-30'>
					{regularDrafts.map((draft) => (
						<div key={draft.id} className={draft.isMinimized ? 'z-40' : 'z-30'}>
							<ComposeEmail draftId={draft.id} />
						</div>
					))}
				</div>
			)}
		</>
	);
}
