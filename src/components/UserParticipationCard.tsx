'use client';

import { useEffect, useMemo, useState } from 'react';

import { ApiClientV2Error, getUserStatsV2, type UserStatsV2 } from '@/lib/apiClientV2';
import { Card } from '@/components/ui/Card';

interface UserParticipationState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  stats: UserStatsV2 | null;
  error: string | null;
}

const pluralize = (value: number, [one, few, many]: [string, string, string]) => {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
};

export const UserParticipationCard = () => {
  const [{ status, stats, error }, setState] = useState<UserParticipationState>({
    status: 'idle',
    stats: null,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setState({ status: 'loading', stats: null, error: null });
      try {
        const data = await getUserStatsV2();
        if (!mounted) return;
        setState({ status: 'ready', stats: data, error: null });
      } catch (error) {
        console.error('[UserParticipationCard] Failed to fetch stats', error);
        if (!mounted) return;
        const message =
          error instanceof ApiClientV2Error && error.message
            ? error.message
            : 'Сейчас не получается показать статистику.';
        setState({ status: 'error', stats: null, error: message });
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const content = useMemo(() => {
    if (status === 'loading') {
      return (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Считаем твоё участие…</p>
          <div className="h-3 w-1/2 rounded-full bg-white/10" aria-hidden />
          <div className="h-3 w-2/3 rounded-full bg-white/5" aria-hidden />
        </div>
      );
    }

    if (status === 'error') {
      return <p className="text-sm text-text-secondary">{error ?? 'Сейчас не получается показать статистику.'}</p>;
    }

    if (status === 'ready' && stats) {
      const messageWord = pluralize(stats.messagesSent, ['мысль', 'мысли', 'мыслей']);
      const peopleWord = pluralize(stats.responsesSent, ['человека', 'человека', 'человек']);
      const repliesWord = pluralize(stats.responsesReceived, ['раз', 'раза', 'раз']);

      return (
        <div className="space-y-2 text-sm text-text-secondary sm:text-base">
          <p>
            Ты отправил {stats.messagesSent} {messageWord} и поддержал {stats.responsesSent} {peopleWord}.
          </p>
          <p>Люди ответили тебе {stats.responsesReceived} {repliesWord}.</p>
        </div>
      );
    }

    return (
      <p className="text-sm text-text-secondary">
        Здесь появится статистика, как только ты поделишься мыслями или поддержишь кого-то.
      </p>
    );
  }, [error, stats, status]);

  return (
    <Card className="space-y-4 border border-white/5">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.35em] text-uyan-light">Твоё участие сегодня</p>
        <h3 className="text-lg font-semibold text-text-primary">Как ты помогаешь другим</h3>
      </div>
      {content}
    </Card>
  );
};

export default UserParticipationCard;
