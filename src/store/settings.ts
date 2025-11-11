'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { VocabularyPreset } from '@/content/vocabulary';

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
