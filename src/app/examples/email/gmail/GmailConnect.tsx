'use client';

import { useEffect, useState } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useEmailStore } from '@/app/examples/email/store/emailStore';
import { useSearchParams } from 'next/navigation';

export function GmailConnect() {
	const { isGmailConnected, isLoading, error, setEmails } = useEmailStore();
	const [isConnecting, setIsConnecting] = useState(false);
	const searchParams = useSearchParams();

	// Check for connection status from URL params
	useEffect(() => {
		const connected = searchParams.get('connected');
		const error = searchParams.get('error');

		if (connected === 'true') {
			// Mark as connected and fetch emails
			useEmailStore.setState({ isGmailConnected: true });
			fetchGmailEmails();
		} else if (error) {
			useEmailStore.setState({
				error: getErrorMessage(error),
				isGmailConnected: false,
			});
		}
	}, [searchParams]);

	const getErrorMessage = (error: string) => {
		switch (error) {
			case 'auth_failed':
				return 'Failed to authenticate with Google';
			case 'auth_denied':
				return 'Google authentication was denied';
			case 'no_code':
				return 'No authorization code received';
			case 'state_mismatch':
				return 'Security check failed. Please try again';
			case 'token_exchange_failed':
				return 'Failed to exchange authorization code';
			case 'config_missing':
				return 'Google OAuth credentials are not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file';
			default:
				return 'An unknown error occurred';
		}
	};

	const fetchGmailEmails = async () => {
		useEmailStore.setState({ isLoading: true, error: null });

		try {
			const response = await fetch('/examples/email/api/gmail/emails');

			if (!response.ok) {
				if (response.status === 401) {
					useEmailStore.setState({ isGmailConnected: false });
					throw new Error('Not authenticated');
				}
				throw new Error('Failed to fetch emails');
			}

			const { emails } = await response.json();
			setEmails(emails);

			// Also fetch labels
			const labelsResponse = await fetch('/examples/email/api/gmail/labels');
			if (labelsResponse.ok) {
				const { labels } = await labelsResponse.json();
				// TODO: Add setLabels action to store
				console.log('Fetched labels:', labels);
			}
		} catch (error) {
			console.error('Error fetching Gmail data:', error);
			useEmailStore.setState({
				error:
					error instanceof Error ? error.message : 'Failed to fetch emails',
				isLoading: false,
			});
		} finally {
			useEmailStore.setState({ isLoading: false });
		}
	};

	const handleConnect = () => {
		setIsConnecting(true);
		window.location.href = '/examples/email/api/auth/google';
	};

	const handleDisconnect = async () => {
		// Clear tokens
		await fetch('/examples/email/api/auth/disconnect', { method: 'POST' });

		// Reset to mock data
		useEmailStore.setState({
			isGmailConnected: false,
			emails: useEmailStore.getState().emails, // Keep existing emails
			error: null,
		});
	};

	if (isLoading) {
		return (
			<div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4'>
				<div className='flex items-center gap-3'>
					<Loader2 className='w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin' />
					<div>
						<h3 className='font-medium text-blue-900 dark:text-blue-100'>
							Loading Gmail...
						</h3>
						<p className='text-sm text-blue-700 dark:text-blue-300'>
							Fetching your emails
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4'>
				<div className='flex items-center gap-3'>
					<AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400' />
					<div className='flex-1'>
						<h3 className='font-medium text-red-900 dark:text-red-100'>
							Connection Error
						</h3>
						<p className='text-sm text-red-700 dark:text-red-300'>{error}</p>
					</div>
					<button
						onClick={() => useEmailStore.setState({ error: null })}
						className='text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200'>
						Dismiss
					</button>
				</div>
			</div>
		);
	}

	if (isGmailConnected) {
		return (
			<div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-3'>
						<CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400' />
						<div>
							<h3 className='font-medium text-green-900 dark:text-green-100'>
								Connected to Gmail
							</h3>
							<p className='text-sm text-green-700 dark:text-green-300'>
								Your emails are synced
							</p>
						</div>
					</div>
					<div className='flex items-center gap-2'>
						<button
							onClick={fetchGmailEmails}
							className='px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md'>
							Refresh
						</button>
						<button
							onClick={handleDisconnect}
							className='px-3 py-1 text-sm border border-green-600 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-md'>
							Disconnect
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-4 text-center'>
			<Mail className='w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3' />
			<h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
				Connect to Gmail
			</h3>
			<p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
				Connect your Gmail account to access your real emails
			</p>
			<button
				onClick={handleConnect}
				disabled={isConnecting}
				className='inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors'>
				{isConnecting ? (
					<>
						<Loader2 className='w-4 h-4 animate-spin' />
						Connecting...
					</>
				) : (
					<>
						<Mail className='w-4 h-4' />
						Connect Gmail Account
					</>
				)}
			</button>
			<p className='text-xs text-gray-500 dark:text-gray-500 mt-3'>
				We&apos;ll only access your emails with your permission
			</p>
		</div>
	);
}
