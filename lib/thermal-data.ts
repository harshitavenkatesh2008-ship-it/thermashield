export type ZoneType = "cold" | "transition" | "hot";
export type RiskLevel = "low" | "moderate" | "high" | "critical";

export type Zone = {
  id: number;
  code: string;
  name: string;
  type: ZoneType;
  temperature: number | null;
  building: string;
  icon: string;
};

export type ThermalTransition = {
  id: number;
  timestamp: string;
  from: string;
  to: string;
  fromTemp: number;
  toTemp: number;
  deltaT: number;
  direction: "cold_to_hot" | "hot_to_cold" | "same";
  directionWeight: number;
  recoveryFactor: number;
  bonusModifier: number;
  shock: number;
  cumulative: number;
  risk: RiskLevel;
  formula: string;
  fromZoneId: number;
  toZoneId: number;
  timeSinceLastMin: number | null;
};

export type DayScore = {
  date: string;
  day: string;
  score: number;
  risk: RiskLevel;
  transitions: number;
  peakShock: number;
  symptoms: string[];
};

export const RISK_META: Record<
  RiskLevel,
  { label: string; color: string; soft: string; message: string }
> = {
  low: {
    label: "Low",
    color: "#76A9E8",
    soft: "#12253F",
    message: "You’re in the clear. Keep the day calm.",
  },
  moderate: {
    label: "Moderate",
    color: "#49D4C1",
    soft: "#102F32",
    message: "Your load is building. Give the next transition more time.",
  },
  high: {
    label: "High",
    color: "#E7B45F",
    soft: "#3A2F18",
    message: "The day is warming up. Choose a calmer path if you can.",
  },
  critical: {
    label: "Critical",
    color: "#E56A58",
    soft: "#3A1E25",
    message: "Very high exposure. Stay in one zone and recover.",
  },
};

export const ZONES: Zone[] = [
  { id: 1, code: "Z01", name: "TT Lab", type: "cold", temperature: 18, building: "TT Block", icon: "snow" },
  { id: 2, code: "Z02", name: "SJT AC Classroom", type: "cold", temperature: 19, building: "SJT", icon: "snow" },
  { id: 3, code: "Z03", name: "Library", type: "cold", temperature: 20, building: "Library", icon: "book" },
  { id: 4, code: "Z04", name: "SJT Corridor", type: "transition", temperature: 28, building: "SJT", icon: "cloud" },
  { id: 5, code: "Z05", name: "Cafeteria", type: "transition", temperature: 30, building: "Cafeteria", icon: "cafe" },
  { id: 6, code: "Z06", name: "Outdoor - Main Road", type: "hot", temperature: null, building: "Outdoor", icon: "sunny" },
  { id: 7, code: "Z07", name: "Outdoor - Parking", type: "hot", temperature: null, building: "Outdoor", icon: "sunny" },
  { id: 8, code: "Z08", name: "Hostel Room (AC)", type: "cold", temperature: 22, building: "Hostel", icon: "snow" },
  { id: 9, code: "Z09", name: "Hostel Room (Non-AC)", type: "transition", temperature: 29, building: "Hostel", icon: "cloud" },
];

export const DEMO_DAY: ThermalTransition[] = [
  { id: 1, timestamp: "8:30 AM", from: "Hostel Room (AC)", to: "Outdoor - Main Road", fromTemp: 22, toTemp: 34, deltaT: 12, direction: "cold_to_hot", directionWeight: 1.3, recoveryFactor: 1, bonusModifier: 1, shock: 15.6, cumulative: 15.6, risk: "low", formula: "|22 − 34| × 1.3 × 1.0 × 1.0 = 15.6", fromZoneId: 8, toZoneId: 6, timeSinceLastMin: 85 },
  { id: 2, timestamp: "8:45 AM", from: "Outdoor - Main Road", to: "TT Lab", fromTemp: 34, toTemp: 18, deltaT: 16, direction: "hot_to_cold", directionWeight: 1, recoveryFactor: 1.5, bonusModifier: 1, shock: 24, cumulative: 39.6, risk: "low", formula: "|34 − 18| × 1.0 × 1.5 × 1.0 = 24.0", fromZoneId: 6, toZoneId: 1, timeSinceLastMin: 15 },
  { id: 3, timestamp: "10:00 AM", from: "TT Lab", to: "Outdoor - Main Road", fromTemp: 18, toTemp: 36, deltaT: 18, direction: "cold_to_hot", directionWeight: 1.3, recoveryFactor: 1, bonusModifier: 1, shock: 23.4, cumulative: 63, risk: "moderate", formula: "|18 − 36| × 1.3 × 1.0 × 1.0 = 23.4", fromZoneId: 1, toZoneId: 6, timeSinceLastMin: 75 },
  { id: 4, timestamp: "10:15 AM", from: "Outdoor - Main Road", to: "SJT AC Classroom", fromTemp: 36, toTemp: 19, deltaT: 17, direction: "hot_to_cold", directionWeight: 1, recoveryFactor: 1.5, bonusModifier: 1, shock: 25.5, cumulative: 88.5, risk: "high", formula: "|36 − 19| × 1.0 × 1.5 × 1.0 = 25.5", fromZoneId: 6, toZoneId: 2, timeSinceLastMin: 15 },
  { id: 5, timestamp: "12:30 PM", from: "SJT AC Classroom", to: "Outdoor - Main Road", fromTemp: 19, toTemp: 38, deltaT: 19, direction: "cold_to_hot", directionWeight: 1.3, recoveryFactor: 0.8, bonusModifier: 1.1, shock: 21.7, cumulative: 110.2, risk: "high", formula: "|19 − 38| × 1.3 × 0.8 × 1.1 = 21.7", fromZoneId: 2, toZoneId: 6, timeSinceLastMin: 135 },
  { id: 6, timestamp: "1:30 PM", from: "Outdoor - Main Road", to: "TT Lab", fromTemp: 37, toTemp: 18, deltaT: 19, direction: "hot_to_cold", directionWeight: 1, recoveryFactor: 1, bonusModifier: 1, shock: 19, cumulative: 129.2, risk: "high", formula: "|37 − 18| × 1.0 × 1.0 × 1.0 = 19.0", fromZoneId: 6, toZoneId: 1, timeSinceLastMin: 60 },
  { id: 7, timestamp: "4:00 PM", from: "TT Lab", to: "Outdoor - Main Road", fromTemp: 18, toTemp: 36, deltaT: 18, direction: "cold_to_hot", directionWeight: 1.3, recoveryFactor: 0.8, bonusModifier: 1, shock: 18.7, cumulative: 147.9, risk: "critical", formula: "|18 − 36| × 1.3 × 0.8 × 1.0 = 18.7", fromZoneId: 1, toZoneId: 6, timeSinceLastMin: 150 },
];

export const DEMO_WEEK: DayScore[] = [
  { date: "2026-09-28", day: "Mon", score: 78, risk: "moderate", transitions: 4, peakShock: 24.6, symptoms: [] },
  { date: "2026-09-29", day: "Tue", score: 148.5, risk: "critical", transitions: 7, peakShock: 35.1, symptoms: ["Headache", "Fatigue"] },
  { date: "2026-09-30", day: "Wed", score: 91, risk: "high", transitions: 5, peakShock: 28.4, symptoms: ["Fatigue"] },
  { date: "2026-10-01", day: "Thu", score: 54, risk: "moderate", transitions: 3, peakShock: 24.2, symptoms: [] },
  { date: "2026-10-02", day: "Fri", score: 112, risk: "high", transitions: 5, peakShock: 31.2, symptoms: ["Headache"] },
  { date: "2026-10-03", day: "Sat", score: 32, risk: "low", transitions: 2, peakShock: 18.2, symptoms: [] },
  { date: "2026-10-04", day: "Sun", score: 12, risk: "low", transitions: 1, peakShock: 12, symptoms: [] },
];

export const getRisk = (score: number): RiskLevel => {
  if (score >= 131) return "critical";
  if (score >= 81) return "high";
  if (score >= 41) return "moderate";
  return "low";
};

export const getZoneTemperature = (zone: Zone, outdoorTemp = 34): number => {
  if (zone.temperature !== null) return zone.temperature;
  return outdoorTemp + (zone.id === 7 ? 2 : 0);
};

export const directionFor = (from: Zone, to: Zone): ThermalTransition["direction"] => {
  if (from.type === "cold" && to.type === "hot") return "cold_to_hot";
  if (from.type === "hot" && to.type === "cold") return "hot_to_cold";
  return "same";
};

export const recoveryFor = (minutes: number | null): number => {
  if (minutes === null) return 1;
  if (minutes < 15) return 1.8;
  if (minutes <= 30) return 1.5;
  if (minutes <= 60) return 1.2;
  if (minutes <= 120) return 1;
  return 0.8;
};

export const directionWeightFor = (direction: ThermalTransition["direction"]): number => {
  if (direction === "cold_to_hot") return 1.3;
  if (direction === "hot_to_cold") return 1;
  return 0.5;
};

export const bonusFor = (direction: ThermalTransition["direction"], humidity = 72, uv = 4, hour = 10): number => {
  let bonus = humidity > 80 ? 1.15 : 1;
  if (direction === "cold_to_hot" && uv > 8) bonus *= 1.1;
  if (direction === "cold_to_hot" && hour >= 12 && hour < 15) bonus *= 1.1;
  return Number(bonus.toFixed(2));
};

export const scoreTransition = (from: Zone, to: Zone, previous: ThermalTransition | undefined, outdoorTemp = 34): ThermalTransition => {
  const fromTemp = getZoneTemperature(from, outdoorTemp);
  const toTemp = getZoneTemperature(to, outdoorTemp);
  const deltaT = Math.abs(fromTemp - toTemp);
  const direction = directionFor(from, to);
  const timeSinceLastMin = previous ? 20 : null;
  const recoveryFactor = recoveryFor(timeSinceLastMin);
  const directionWeight = directionWeightFor(direction);
  const bonusModifier = bonusFor(direction);
  const shock = Number((deltaT * directionWeight * recoveryFactor * bonusModifier).toFixed(1));
  const cumulative = Number(((previous?.cumulative ?? 0) + shock).toFixed(1));
  const now = new Date();
  const hour = now.getHours();
  const timestamp = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return {
    id: Date.now(), timestamp, from: from.name, to: to.name, fromTemp, toTemp, deltaT,
    direction, directionWeight, recoveryFactor, bonusModifier, shock, cumulative,
    risk: getRisk(cumulative), formula: `|${fromTemp} − ${toTemp}| × ${directionWeight.toFixed(1)} × ${recoveryFactor.toFixed(1)} × ${bonusModifier.toFixed(1)} = ${shock.toFixed(1)}`,
    fromZoneId: from.id, toZoneId: to.id, timeSinceLastMin,
  };
};

export const average = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export const currentDay = () => new Date().toLocaleDateString("en-US", { weekday: "long" });
