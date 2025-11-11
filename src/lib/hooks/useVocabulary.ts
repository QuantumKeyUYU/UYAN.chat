'use client';

import { useMemo } from 'react';
import { getVocabulary, type Vocabulary, type VocabularyPreset } from '@/content/vocabulary';
import { useSettingsStore } from '@/store/settings';

interface UseVocabularyResult {
  preset: VocabularyPreset;
  vocabulary: Vocabulary;
}

export const useVocabulary = (override?: VocabularyPreset): UseVocabularyResult => {
  const presetFromStore = useSettingsStore((state) => state.vocabulary);
  const resolvedPreset = override ?? presetFromStore;
  const vocabulary = useMemo(() => getVocabulary(resolvedPreset), [resolvedPreset]);

  return useMemo(
    () => ({
      preset: resolvedPreset,
      vocabulary,
    }),
    [resolvedPreset, vocabulary],
  );
};
