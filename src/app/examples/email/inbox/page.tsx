'use client';

import { EmailList } from '../messages/EmailList';
import { GmailConnect } from '../gmail/GmailConnect';

export default function InboxPage() {
	return (
		<>
			<GmailConnect />
			<div className='flex-1 flex'>
				<EmailList />
			</div>
		</>
	);
}
