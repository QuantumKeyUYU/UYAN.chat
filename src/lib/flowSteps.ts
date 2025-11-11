import { getVocabulary, type VocabularyPreset } from '@/content/vocabulary';
import type { StepDefinition } from '@/components/stepper';

export const getFlowSteps = (preset: VocabularyPreset = 'core'): StepDefinition[] => {
  const vocabulary = getVocabulary(preset);
  return [
    {
      id: 'write',
      title: vocabulary.flow.writeTitle,
      description: vocabulary.flow.writeDescription,
      href: '/write',
    },
    {
      id: 'support',
      title: vocabulary.flow.supportTitle,
      description: vocabulary.flow.supportDescription,
      href: '/support',
    },
    {
      id: 'wait',
      title: vocabulary.flow.waitTitle,
      description: vocabulary.flow.waitDescription,
      href: '/my',
    },
    {
      id: 'save',
      title: vocabulary.flow.saveTitle,
      description: vocabulary.flow.saveDescription,
      href: '/garden',
    },
  ];
};

export const FLOW_STEPS = getFlowSteps();
