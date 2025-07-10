import { StateCreator } from 'zustand';
import { CedarStore } from './types';

export interface StylingConfig {
	darkMode: boolean;
	primaryColor: string;
	secondaryColor: string;
	accentColor: string;
}

export interface StylingState {
	styling: StylingConfig;
}

export interface StylingActions {
	setStyling: (styling: Partial<StylingConfig>) => void;
	toggleDarkMode: () => void;
}

export type StylingSlice = StylingState & StylingActions;

const DEFAULT_STYLING: StylingConfig = {
	darkMode: false,
	primaryColor: '#93C5FD', // blue-300
	secondaryColor: '#1D4ED8', // blue-700
	accentColor: '#FB923C', // orange-400
};

export const createStylingSlice: StateCreator<
	CedarStore,
	[],
	[],
	StylingSlice
> = (set) => ({
	// Initial state
	styling: DEFAULT_STYLING,

	// Actions
	setStyling: (newStyling) =>
		set((state) => ({
			styling: { ...state.styling, ...newStyling },
		})),

	toggleDarkMode: () =>
		set((state) => ({
			styling: { ...state.styling, darkMode: !state.styling.darkMode },
		})),
});
