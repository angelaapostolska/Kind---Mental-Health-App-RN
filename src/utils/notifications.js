// Daily affirmation notifications (LOCAL, on-device scheduling — no backend / push token needed).
//
// How "random daily" works: a single repeating trigger would show the SAME text every day,
// so instead we schedule a rolling window of dated notifications (the next 14 days), each with
// its own random affirmation. App launch tops the window back up + reshuffles, so as long as the
// app is opened at least once every couple of weeks, every day gets a fresh affirmation.
//
// Requires: expo-notifications  ->  npx expo install expo-notifications

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomAffirmation } from '@/utils';

const SETTINGS_KEY = 'affirmation-settings';
const TAG = 'daily-affirmation';        // marks the notifications we own, so we never touch others
const CHANNEL_ID = 'affirmations';
const DAYS_AHEAD = 14;

export const DEFAULT_SETTINGS = { enabled: false, hour: 9, minute: 0 };

// ── one-time setup ────────────────────────────────────────────────────────────
let configured = false;
export async function configureNotifications() {
  if (configured) return;
  configured = true;

  // How a notification is presented while the app is foregrounded
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily Affirmations',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

// ── permissions ─────────────────────────────────────────────────────────────--
export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

// ── settings persistence ──────────────────────────────────────────────────────
export async function loadAffirmationSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function saveAffirmationSettings(settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // non-fatal
  }
}

// ── scheduling ────────────────────────────────────────────────────────────────
async function cancelDailyAffirmations() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content?.data?.tag === TAG)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function scheduleDailyAffirmations(hour, minute) {
  await cancelDailyAffirmations();

  const now = new Date();
  for (let i = 0; i <= DAYS_AHEAD; i += 1) {
    const fireDate = new Date();
    fireDate.setHours(hour, minute, 0, 0);
    fireDate.setDate(now.getDate() + i);

    if (fireDate <= now) continue; // skip a time that's already passed today

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Kind 💜',
        body: getRandomAffirmation(),
        data: { tag: TAG },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
        channelId: CHANNEL_ID,
      },
    });
  }
}

/**
 * Apply a settings change from the UI.
 * Returns the settings that were actually persisted, plus whether it's active.
 * If enabling but permission is denied, persists enabled:false and returns { permissionDenied:true }.
 */
export async function applyAffirmationSettings({ enabled, hour, minute }) {
  await configureNotifications();

  if (!enabled) {
    await cancelDailyAffirmations();
    const settings = { enabled: false, hour, minute };
    await saveAffirmationSettings(settings);
    return { settings };
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    const settings = { enabled: false, hour, minute };
    await saveAffirmationSettings(settings);
    return { settings, permissionDenied: true };
  }

  await scheduleDailyAffirmations(hour, minute);
  const settings = { enabled: true, hour, minute };
  await saveAffirmationSettings(settings);
  return { settings };
}

/**
 * Call once on app launch: refreshes the rolling 14-day window (and reshuffles the
 * affirmations) if the feature is enabled and we still have permission.
 */
export async function syncScheduledAffirmations() {
  await configureNotifications();
  const settings = await loadAffirmationSettings();
  if (!settings.enabled) return;

  const current = await Notifications.getPermissionsAsync();
  if (!current.granted) return;

  await scheduleDailyAffirmations(settings.hour, settings.minute);
}