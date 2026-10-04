import AsyncStorage from "@react-native-async-storage/async-storage";
import { notifyCriticalAlert, requestCriticalNotificationPermission } from "@/lib/critical-alerts";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getFitnessHealthAdapter } from "@/lib/health-adapter";
import type { FitnessHealthPlatform, FitnessHealthStatus } from "@/lib/health-types";
import { Platform } from "react-native";
import {
  DEMO_DAY,
  DEMO_WEEK,
  type DayScore,
  type RiskLevel,
  type ThermalTransition,
  type Zone,
  ZONES,
  getRisk,
  scoreTransition,
} from "@/lib/thermal-data";

type SymptomEntry = { name: string; severity: number; notes?: string };
export type LiveLocation = { latitude: number; longitude: number; accuracy: number | null; speed: number | null; heading: number | null; updatedAt: string };
export type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";
export type TrackingMode = "highAccuracy" | "powerSaving";
export type ThermalAlert = { id: string; threshold: number; risk: RiskLevel; title: string; tip: string };
const DISMISSED_ALERTS_KEY = "thermashield.dismissed-alerts.v1";
const CRITICAL_NOTIFICATIONS_KEY = "thermashield.critical-notifications.v1";
const HEALTH_CONNECTED_KEY = "thermashield.health.connected.v1";
const HEALTH_AUTO_LOG_KEY = "thermashield.health.auto-log.v1";
const HEALTH_EXPORTED_PREFIX = "thermashield.health.exported.";
const GEOFENCE_TASK = "thermashield-campus-geofence";
const GEOFENCES: Location.LocationRegion[] = [{ identifier: "vit-chennai-campus", latitude: 12.8406, longitude: 80.1534, radius: 250, notifyOnEnter: true, notifyOnExit: true }];
if (!TaskManager.isTaskDefined(GEOFENCE_TASK)) TaskManager.defineTask(GEOFENCE_TASK, async ({ error }) => { if (error) console.warn("ThermaShield geofence event", error.message); });

type ThermalContextValue = {
  name: string;
  onboarded: boolean;
  unit: "C" | "F";
  transitions: ThermalTransition[];
  week: DayScore[];
  symptoms: SymptomEntry[];
  score: number;
  risk: RiskLevel;
  peakShock: number;
  outdoorTemp: number;
  outdoorHumidity: number;
  feelsLike: number;
  weatherSource: "live" | "cached" | "estimated";
  weatherUpdatedAt: string | null;
  location: LiveLocation | null;
  locationStatus: LocationStatus;
  locationTracking: boolean;
  trackingMode: TrackingMode;
  geofencingEnabled: boolean;
  activeAlert: ThermalAlert | null;
  criticalNotificationsEnabled: boolean;
  healthPlatform: FitnessHealthPlatform;
  healthStatus: FitnessHealthStatus;
  healthConnected: boolean;
  healthAutoLogEnabled: boolean;
  start: (name: string) => void;
  loadDemoDay: () => void;
  loadDemoWeek: () => void;
  addTransition: (from: Zone, to: Zone) => Promise<{ transition: ThermalTransition; alert: ThermalAlert | null }>;
  addSymptoms: (entries: SymptomEntry[]) => void;
  clearData: () => void;
  setName: (name: string) => void;
  toggleUnit: () => void;
  requestLocation: () => Promise<void>;
  stopLocationTracking: () => void;
  setTrackingMode: (mode: TrackingMode) => void;
  toggleGeofencing: () => Promise<void>;
  dismissAlert: (id: string) => void;
  toggleCriticalNotifications: () => Promise<void>;
  connectHealth: () => Promise<boolean>;
  toggleHealthAutoLog: () => Promise<void>;
};

const ThermalContext = createContext<ThermalContextValue | null>(null);

export function ThermalProvider({ children }: { children: React.ReactNode }) {
  const [name, setNameState] = useState("Janvi");
  const [onboarded, setOnboarded] = useState(false);
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [transitions, setTransitions] = useState<ThermalTransition[]>([]);
  const [week, setWeek] = useState<DayScore[]>(DEMO_WEEK);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationTracking, setLocationTracking] = useState(false);
  const [trackingMode, setTrackingModeState] = useState<TrackingMode>("powerSaving");
  const [geofencingEnabled, setGeofencingEnabled] = useState(false);
  const [activeAlert, setActiveAlert] = useState<ThermalAlert | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [criticalNotificationsEnabled, setCriticalNotificationsEnabled] = useState(false);
  const [healthConnected, setHealthConnected] = useState(false);
  const [healthAutoLogEnabled, setHealthAutoLogEnabled] = useState(false);
  const [healthStatus, setHealthStatus] = useState<FitnessHealthStatus>("disconnected");
  const healthAdapter = getFitnessHealthAdapter();
  const [outdoorTemp, setOutdoorTemp] = useState(34);
  const [outdoorHumidity, setOutdoorHumidity] = useState(72);
  const [feelsLike, setFeelsLike] = useState(38);
  const [weatherSource, setWeatherSource] = useState<"live" | "cached" | "estimated">("estimated");
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState<string | null>(null);
  const nativeSubscription = useRef<Location.LocationSubscription | null>(null);
  const webWatchId = useRef<number | null>(null);
  const trackingModeRef = useRef<TrackingMode>("powerSaving");
  const nativeProfileRef = useRef<string>("");
  const lastWeatherAtRef = useRef(0);
  const lastWeatherCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(DISMISSED_ALERTS_KEY).then((raw) => { if (raw) setDismissedAlertIds(JSON.parse(raw)); }).catch(() => undefined);
    void AsyncStorage.getItem(CRITICAL_NOTIFICATIONS_KEY).then((raw) => { if (raw === "true") setCriticalNotificationsEnabled(true); }).catch(() => undefined);
    void AsyncStorage.multiGet([HEALTH_CONNECTED_KEY, HEALTH_AUTO_LOG_KEY]).then(([connected, autoLog]) => {
      if (connected[1] === "true") { setHealthConnected(true); setHealthStatus("connected"); }
      if (autoLog[1] === "true") setHealthAutoLogEnabled(true);
    }).catch(() => undefined);
  }, []);

  const score = Number(transitions.reduce((sum, item) => sum + item.shock, 0).toFixed(1));
  const risk = getRisk(score);
  const peakShock = transitions.length ? Math.max(...transitions.map((item) => item.shock)) : 0;

  const distanceMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => { const dLat = (b.latitude - a.latitude) * 111_000; const dLng = (b.longitude - a.longitude) * 111_000 * Math.cos((a.latitude * Math.PI) / 180); return Math.sqrt(dLat * dLat + dLng * dLng); };

  const refreshWeather = async (coords: LiveLocation) => {
    try {
      const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
      const response = await fetch(`${base}/api/weather?lat=${coords.latitude}&lng=${coords.longitude}`);
      if (!response.ok) throw new Error("Weather request failed");
      const data = await response.json();
      setOutdoorTemp(Number(data.temp ?? 34));
      setOutdoorHumidity(Number(data.humidity ?? 72));
      setFeelsLike(Number(data.feelsLike ?? data.feels_like ?? data.temp ?? 34));
      setWeatherSource(data.estimated ? "estimated" : data.cached ? "cached" : "live");
      setWeatherUpdatedAt(data.fetchedAt ?? new Date().toISOString());
    } catch {
      setWeatherSource("estimated");
      setWeatherUpdatedAt(new Date().toISOString());
    }
  };

  const sampleProfile = (speed: number | null | undefined) => {
    const moving = (speed ?? 0) > 1;
    if (trackingModeRef.current === "highAccuracy") return moving ? { key: "high-moving", accuracy: Location.Accuracy.Highest, timeInterval: 15000, distanceInterval: 100 } : { key: "high-still", accuracy: Location.Accuracy.High, timeInterval: 60000, distanceInterval: 150 };
    return moving ? { key: "eco-moving", accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 150 } : { key: "eco-still", accuracy: Location.Accuracy.Low, timeInterval: 180000, distanceInterval: 250 };
  };

  async function applyNativeWatch(profile: ReturnType<typeof sampleProfile>) {
    if (Platform.OS === "web") return;
    if (nativeProfileRef.current === profile.key && nativeSubscription.current) return;
    nativeSubscription.current?.remove();
    nativeProfileRef.current = profile.key;
    nativeSubscription.current = await Location.watchPositionAsync({ accuracy: profile.accuracy, timeInterval: profile.timeInterval, distanceInterval: profile.distanceInterval }, onPosition);
  }

  function onPosition(position: { coords: { latitude: number; longitude: number; accuracy?: number | null; speed?: number | null; heading?: number | null } }) {
    const next: LiveLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy ?? null, speed: position.coords.speed ?? null, heading: position.coords.heading ?? null, updatedAt: new Date().toISOString() };
    setLocation(next);
    setLocationStatus("granted");
    const profile = sampleProfile(next.speed);
    if (Platform.OS !== "web") void applyNativeWatch(profile);
    const previous = lastWeatherCoordsRef.current;
    const movedEnough = !previous || distanceMeters(previous, next) >= (trackingModeRef.current === "powerSaving" ? 250 : 100);
    const cooledDown = Date.now() - lastWeatherAtRef.current >= (trackingModeRef.current === "powerSaving" ? 600000 : 120000);
    if (movedEnough || cooledDown) { lastWeatherAtRef.current = Date.now(); lastWeatherCoordsRef.current = next; void refreshWeather(next); }
  }

  const requestLocation = async () => {
    setLocationStatus("requesting");
    try {
      if (Platform.OS === "web") {
        if (!navigator.geolocation) throw new Error("Geolocation is unavailable in this browser");
        await new Promise<void>((resolve, reject) => navigator.geolocation.getCurrentPosition((position) => { onPosition(position); resolve(); }, reject, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }));
        if (webWatchId.current === null) webWatchId.current = navigator.geolocation.watchPosition(onPosition, () => setLocationStatus("denied"), { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
      } else {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") { setLocationStatus("denied"); return; }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        onPosition(position);
        nativeSubscription.current?.remove();
        setLocationTracking(true);
        await applyNativeWatch(sampleProfile(null));
      }
      setLocationTracking(true);
    } catch {
      setLocationStatus("unavailable");
    }
  };

  const setTrackingMode = (mode: TrackingMode) => {
    trackingModeRef.current = mode;
    setTrackingModeState(mode);
    if (locationTracking && Platform.OS !== "web") void applyNativeWatch(sampleProfile(location?.speed));
  };

  const toggleGeofencing = async () => {
    if (Platform.OS === "web") return;
    try {
      if (geofencingEnabled) { await Location.stopGeofencingAsync(GEOFENCE_TASK); setGeofencingEnabled(false); return; }
      const permission = await Location.requestBackgroundPermissionsAsync();
      if (permission.status !== "granted") return;
      await Location.startGeofencingAsync(GEOFENCE_TASK, GEOFENCES);
      setGeofencingEnabled(true);
    } catch {
      setGeofencingEnabled(false);
    }
  };

  const stopLocationTracking = () => {
    nativeSubscription.current?.remove();
    nativeSubscription.current = null;
    nativeProfileRef.current = "";
    if (webWatchId.current !== null && Platform.OS === "web") navigator.geolocation.clearWatch(webWatchId.current);
    webWatchId.current = null;
    setLocationTracking(false);
  };

  useEffect(() => () => stopLocationTracking(), []);

  const value = useMemo<ThermalContextValue>(() => ({
    name, onboarded, unit, transitions, week, symptoms, score, risk, peakShock, outdoorTemp, outdoorHumidity, feelsLike, weatherSource, weatherUpdatedAt, location, locationStatus, locationTracking, trackingMode, geofencingEnabled,
    start: (nextName: string) => { setNameState(nextName.trim() || "Janvi"); setOnboarded(true); },
    loadDemoDay: () => { setTransitions(DEMO_DAY); setWeek(DEMO_WEEK); },
    loadDemoWeek: () => { setTransitions(DEMO_DAY); setWeek(DEMO_WEEK); },
    addTransition: async (from, to) => {
      const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
      try {
        const response = await fetch(`${base}/api/transition`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from_zone_id: from.id, to_zone_id: to.id }) });
        if (!response.ok) throw new Error("Transition request failed");
        const data = await response.json() as { transition: ThermalTransition; alert: ThermalAlert | null };
        setTransitions((current) => [...current, data.transition]);
        if (data.alert && !dismissedAlertIds.includes(data.alert.id)) {
          setActiveAlert(data.alert);
          if (data.alert.risk === "critical" && criticalNotificationsEnabled) void notifyCriticalAlert(data.alert);
        }
        if (healthConnected && healthAutoLogEnabled && (to.type === "hot" || from.type === "hot") && data.transition.shock >= 15) {
          const exportKey = `${HEALTH_EXPORTED_PREFIX}${data.transition.id}`;
          const alreadyExported = await AsyncStorage.getItem(exportKey);
          if (!alreadyExported) {
            try {
              const end = new Date();
              const durationMinutes = Math.max(5, Math.min(30, data.transition.timeSinceLastMin ?? 5));
              const start = new Date(end.getTime() - durationMinutes * 60_000);
              await healthAdapter.writeThermalEvent({
                id: `thermal-${data.transition.id}`,
                startedAt: start.toISOString(),
                endedAt: end.toISOString(),
                zoneName: to.type === "hot" ? to.name : from.name,
                outdoorTemperatureC: to.type === "hot" ? data.transition.toTemp : data.transition.fromTemp,
                thermalShock: data.transition.shock,
                dailyCumulativeScore: data.transition.cumulative,
                risk: data.transition.risk,
                source: "ThermaShield",
              });
              await AsyncStorage.setItem(exportKey, "true");
              setHealthStatus("connected");
            } catch {
              setHealthStatus("error");
            }
          }
        }
        return data;
      } catch {
        const next = scoreTransition(from, to, transitions[transitions.length - 1], outdoorTemp);
        setTransitions((current) => [...current, next]);
        return { transition: next, alert: null };
      }
    },
    addSymptoms: (entries) => setSymptoms((current) => [...current, ...entries]),
    clearData: () => { setTransitions([]); setSymptoms([]); setWeek([]); },
    setName: (nextName) => setNameState(nextName),
    toggleUnit: () => setUnit((current) => current === "C" ? "F" : "C"),
    requestLocation, stopLocationTracking, setTrackingMode, toggleGeofencing, activeAlert, criticalNotificationsEnabled,
    healthPlatform: healthAdapter.platform, healthStatus, healthConnected, healthAutoLogEnabled,
    toggleCriticalNotifications: async () => {
      if (criticalNotificationsEnabled) { setCriticalNotificationsEnabled(false); await AsyncStorage.setItem(CRITICAL_NOTIFICATIONS_KEY, "false"); return; }
      const granted = await requestCriticalNotificationPermission();
      if (granted) { setCriticalNotificationsEnabled(true); await AsyncStorage.setItem(CRITICAL_NOTIFICATIONS_KEY, "true"); }
    },
    connectHealth: async () => {
      setHealthStatus("unavailable");
      const granted = await healthAdapter.requestPermissions();
      if (!granted) { setHealthStatus("error"); return false; }
      setHealthConnected(true); setHealthStatus("connected");
      await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, "true");
      return true;
    },
    toggleHealthAutoLog: async () => {
      if (!healthConnected) return;
      const next = !healthAutoLogEnabled;
      setHealthAutoLogEnabled(next);
      await AsyncStorage.setItem(HEALTH_AUTO_LOG_KEY, String(next));
    },
    dismissAlert: (id: string) => { setDismissedAlertIds((current) => { const next = current.includes(id) ? current : [...current, id]; void AsyncStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(next)); return next; }); setActiveAlert((current) => current?.id === id ? null : current); },
  }), [name, onboarded, unit, transitions, week, symptoms, score, risk, peakShock, outdoorTemp, outdoorHumidity, feelsLike, weatherSource, weatherUpdatedAt, location, locationStatus, locationTracking, trackingMode, geofencingEnabled, activeAlert, criticalNotificationsEnabled, dismissedAlertIds, healthAdapter, healthStatus, healthConnected, healthAutoLogEnabled]);

  return <ThermalContext.Provider value={value}>{children}</ThermalContext.Provider>;
}

export function useThermal() {
  const context = useContext(ThermalContext);
  if (!context) throw new Error("useThermal must be used within ThermalProvider");
  return context;
}
