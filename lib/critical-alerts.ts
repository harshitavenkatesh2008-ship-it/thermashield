import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { ThermalAlert } from "@/lib/thermal-store";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestCriticalNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("critical-risk", {
      name: "Critical risk alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 180, 300],
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function notifyCriticalAlert(alert: ThermalAlert): Promise<void> {
  if (Platform.OS === "web") return;
  const permitted = await requestCriticalNotificationPermission();
  if (!permitted) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: alert.title,
      body: alert.tip,
      sound: "default",
      data: { alertId: alert.id, risk: alert.risk, threshold: alert.threshold },
    },
    trigger: null,
  });
}
