export interface SavedLight {
  id: string;
  originalMessage: string;
  responseText: string;
  savedAt: number;
  category: string;
}

const STORAGE_KEY = 'uyan_garden_lights';

const safeParse = (value: string | null): SavedLight[] => {
  if (!value) return [];
  try {
    return JSON.parse(value) as SavedLight[];
  } catch (error) {
    console.warn('Failed to parse garden storage', error);
    return [];
  }
};

export const loadGarden = (): SavedLight[] => {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

export const saveLight = (light: SavedLight) => {
  if (typeof window === 'undefined') return;
  const current = loadGarden();
  const updated = [light, ...current.filter((item) => item.id !== light.id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const removeLight = (id: string) => {
  if (typeof window === 'undefined') return;
  const current = loadGarden();
  const updated = current.filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};
