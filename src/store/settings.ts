'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

type VocabularyPreset = 'core' | 'spark' | 'pulse' | 'note';

interface SettingsState {
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
  vocabulary: VocabularyPreset;
  setVocabulary: (preset: VocabularyPreset) => void;
}

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector((set) => ({
    reducedMotion: false,
    setReducedMotion: (value) => set({ reducedMotion: value }),
    vocabulary: 'core',
    setVocabulary: (preset) => set({ vocabulary: preset }),
  })),
);
