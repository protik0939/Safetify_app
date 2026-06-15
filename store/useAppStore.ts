import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
    DangerZone,
    Location,
    PushNotification,
    SOSRequest,
    User,
} from "../types";

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  sessionToken: string | null;
  currentLocation: Location | null;
  userLocation: Location | null;
  dangerZones: DangerZone[];
  activeSOSRequest: SOSRequest | null;
  sosHistory: SOSRequest[];
  notifications: PushNotification[];
  isSOSActive: boolean;
  sosHoldProgress: number;
  // Background location tracking
  isBackgroundTrackingEnabled: boolean;
  lastDangerZoneNotificationTime: number; // timestamp to prevent notification spam
  notifiedDangerZones: string[]; // zone IDs we've already notified about
  backgroundTrackingStartedAt: number | null;

  // Actions
  setUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => void;
  setCurrentLocation: (location: Location) => void;
  setDangerZones: (zones: DangerZone[]) => void;
  setActiveSOSRequest: (sos: SOSRequest | null) => void;
  addNotification: (notification: PushNotification) => void;
  removeNotification: (id: string) => void;
  setSOSActive: (active: boolean) => void;
  setSOSHoldProgress: (progress: number) => void;
  setBackgroundTrackingEnabled: (enabled: boolean) => void;
  recordDangerZoneNotification: (zoneId: string) => void;
  clearDangerZoneNotificationHistory: () => void;
  logout: () => void;
  addSOSToHistory: (sos: SOSRequest) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      sessionToken: null,
      currentLocation: null,
      userLocation: null,
      dangerZones: [],
      activeSOSRequest: null,
      sosHistory: [],
      notifications: [],
      isSOSActive: false,
      sosHoldProgress: 0,
      isBackgroundTrackingEnabled: false,
      lastDangerZoneNotificationTime: 0,
      notifiedDangerZones: [],
      backgroundTrackingStartedAt: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSessionToken: (sessionToken) => set({ sessionToken }),
      setCurrentLocation: (currentLocation) =>
        set({ currentLocation, userLocation: currentLocation }),
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
      setBackgroundTrackingEnabled: (isBackgroundTrackingEnabled) =>
        set({
          isBackgroundTrackingEnabled,
          backgroundTrackingStartedAt: isBackgroundTrackingEnabled
            ? Date.now()
            : null,
        }),
      recordDangerZoneNotification: (zoneId) =>
        set((state) => ({
          lastDangerZoneNotificationTime: Date.now(),
          notifiedDangerZones: Array.from(
            new Set([...state.notifiedDangerZones, zoneId])
          ),
        })),
      clearDangerZoneNotificationHistory: () =>
        set({
          notifiedDangerZones: [],
          lastDangerZoneNotificationTime: 0,
        }),
      addSOSToHistory: (sos) =>
        set((state) => ({
          sosHistory: [sos, ...state.sosHistory],
        })),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          sessionToken: null,
          currentLocation: null,
          userLocation: null,
          dangerZones: [],
          activeSOSRequest: null,
          sosHistory: [],
          notifications: [],
          isSOSActive: false,
          sosHoldProgress: 0,
          isBackgroundTrackingEnabled: false,
          lastDangerZoneNotificationTime: 0,
          notifiedDangerZones: [],
          backgroundTrackingStartedAt: null,
        }),
    }),
    {
      name: "safetify-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
