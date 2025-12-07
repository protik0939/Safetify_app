import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Location, SOSRequest, DangerZone, PushNotification } from '../types';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  currentLocation: Location | null;
  userLocation: Location | null;
  dangerZones: DangerZone[];
  activeSOSRequest: SOSRequest | null;
  sosHistory: SOSRequest[];
  notifications: PushNotification[];
  isSOSActive: boolean;
  sosHoldProgress: number;
  
  // Actions
  setUser: (user: User | null) => void;
  setCurrentLocation: (location: Location) => void;
  setDangerZones: (zones: DangerZone[]) => void;
  setActiveSOSRequest: (sos: SOSRequest | null) => void;
  addNotification: (notification: PushNotification) => void;
  removeNotification: (id: string) => void;
  setSOSActive: (active: boolean) => void;
  setSOSHoldProgress: (progress: number) => void;
  logout: () => void;
  addSOSToHistory: (sos: SOSRequest) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      currentLocation: null,
      userLocation: null,
      dangerZones: [],
      activeSOSRequest: null,
      sosHistory: [],
      notifications: [],
      isSOSActive: false,
      sosHoldProgress: 0,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setCurrentLocation: (currentLocation) => set({ currentLocation, userLocation: currentLocation }),
      setDangerZones: (dangerZones) => set({ dangerZones }),
      setActiveSOSRequest: (activeSOSRequest) => set({ activeSOSRequest }),
      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearNotifications: () => set({ notifications: [] }),
      setSOSActive: (isSOSActive) => set({ isSOSActive }),
      setSOSHoldProgress: (sosHoldProgress) => set({ sosHoldProgress }),
      addSOSToHistory: (sos) =>
        set((state) => ({
          sosHistory: [sos, ...state.sosHistory],
        })),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          currentLocation: null,
          userLocation: null,
          activeSOSRequest: null,
        }),
    }),
    {
      name: 'safetify-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
