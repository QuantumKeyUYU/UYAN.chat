'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { clearPersistedDeviceId, persistDeviceId } from '@/lib/device';

export interface DeviceState {
  id: string | null;
  setId: (id: string | null) => void;
}

export const useDeviceStore = create<DeviceState>()(
  subscribeWithSelector((set) => ({
    id: null,
    setId: (id) => {
      set({ id });

      if (typeof window === 'undefined') {
        return;
      }

      if (id) {
        persistDeviceId(id);
      } else {
        clearPersistedDeviceId();
      }
    },
  })),
);
