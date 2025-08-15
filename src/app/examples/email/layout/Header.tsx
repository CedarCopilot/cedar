'use client';

import {
	Search,
	Menu,
	HelpCircle,
	Settings,
	Grid3X3,
	User,
} from 'lucide-react';
import { useState } from 'react';
import { useEmailStore } from '@/app/examples/email/store/emailStore';

interface HeaderProps {
	onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
	const [searchFocused, setSearchFocused] = useState(false);
	const { searchQuery, setSearchQuery } = useEmailStore();

	return (
		<header className='h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center px-4 gap-4'>
			{/* Left section */}
			<div className='flex items-center gap-4'>
				<button
					onClick={onMenuClick}
					className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
					aria-label='Main menu'>
					<Menu className='w-5 h-5 text-gray-600 dark:text-gray-400' />
				</button>

				<div className='flex items-center gap-2'>
					<img
						src='/gmail-logo.png'
						alt='Gmail'
						className='h-10 w-10'
						onError={(e) => {
							// Fallback to text if logo not found
							e.currentTarget.style.display = 'none';
							e.currentTarget.nextElementSibling?.classList.remove('hidden');
						}}
					/>
					<span className='hidden text-2xl font-normal text-gray-700 dark:text-gray-300'>
						Gmail
					</span>
				</div>
			</div>

			{/* Search bar */}
			<div className='flex-1 max-w-2xl mx-auto'>
				<div
					className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
						searchFocused
							? 'bg-white dark:bg-gray-800 shadow-md border border-gray-300 dark:border-gray-600'
							: 'bg-gray-100 dark:bg-gray-800 hover:shadow-md'
					}`}>
					<Search className='w-5 h-5 text-gray-500 dark:text-gray-400' />
					<input
						type='text'
						placeholder='Search mail'
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onFocus={() => setSearchFocused(true)}
						onBlur={() => setSearchFocused(false)}
						className='flex-1 bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400'
					/>
					{searchFocused && (
						<button className='text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'>
							Search options
						</button>
					)}
				</div>
			</div>

			{/* Right section */}
			<div className='flex items-center gap-2'>
				<button
					className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
					aria-label='Support'>
					<HelpCircle className='w-5 h-5 text-gray-600 dark:text-gray-400' />
				</button>

				<button
					className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
					aria-label='Settings'>
					<Settings className='w-5 h-5 text-gray-600 dark:text-gray-400' />
				</button>

				<button
					className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
					aria-label='Google apps'>
					<Grid3X3 className='w-5 h-5 text-gray-600 dark:text-gray-400' />
				</button>

				<button
					className='ml-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center hover:ring-4 hover:ring-gray-200 dark:hover:ring-gray-700 transition-all'
					aria-label='Account'>
					<User className='w-5 h-5 text-white' />
				</button>
			</div>
		</header>
	);
}
