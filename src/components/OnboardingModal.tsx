'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { setOnboardingDone } from '@/lib/onboarding';

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const rules = [
  'Анонимность и доверие — никого не раскрываем.',
  'Пишем с уважением и бережностью к чувствам.',
  'Без советов и сарказма — только тепло и поддержка.',
];

export const OnboardingModal = ({ open, onClose }: OnboardingModalProps) => {
  const handleStart = () => {
    setOnboardingDone();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Свет внутри, тьма — снаружи">
      <p className="text-base text-text-secondary">
        UYAN.chat — анонимное пространство поддержки. Здесь мы обмениваемся светом: делимся переживаниями и отвечаем на
        них с теплом.
      </p>
      <div className="space-y-2 rounded-xl bg-bg-primary/60 p-4 text-sm text-text-secondary">
        {rules.map((rule) => (
          <p key={rule} className="leading-relaxed">
            {rule}
          </p>
        ))}
      </div>
      <Button onClick={handleStart} className="w-full">
        Начать путь света
      </Button>
    </Modal>
  );
};
