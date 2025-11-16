'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { FirebaseStatus } from '@config/firebase';
import { clearPersistedDeviceId, persistDeviceId } from '@/lib/device';

export interface DeviceState {
  id: string | null;
  setId: (id: string | null) => void;
  firebaseStatus: FirebaseStatus;
  firebaseError: string | null;
  demoMode: boolean;
  setFirebaseStatus: (status: FirebaseStatus) => void;
  setFirebaseError: (error: string | null) => void;
  setDemoMode: (demo: boolean) => void;
  currentCircleId: string | null;
  setCurrentCircleId: (circleId: string | null) => void;
}

export const useDeviceStore = create<DeviceState>()(
  subscribeWithSelector((set) => ({
    id: null,
    firebaseStatus: 'idle',
    firebaseError: null,
    demoMode: true,
    currentCircleId: null,
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
    setFirebaseStatus: (firebaseStatus) => set({ firebaseStatus }),
    setFirebaseError: (firebaseError) => set({ firebaseError }),
    setDemoMode: (demoMode) => set({ demoMode }),
    setCurrentCircleId: (currentCircleId) => set({ currentCircleId }),
  })),
);
