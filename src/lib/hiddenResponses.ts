const STORAGE_KEY = 'uyan_hidden_responses';

const safeParse = (value: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch (error) {
    console.warn('[hiddenResponses] Failed to parse hidden responses', error);
    return [];
  }
};

export const loadHiddenResponses = (): string[] => {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

const persistHiddenResponses = (ids: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch (error) {
    console.warn('[hiddenResponses] Failed to store hidden responses', error);
  }
};

export const hideResponseLocally = (id: string) => {
  if (!id) return;
  const current = loadHiddenResponses();
  current.push(id);
  persistHiddenResponses(current);
};

export const clearHiddenResponses = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[hiddenResponses] Failed to clear hidden responses', error);
  }
};
