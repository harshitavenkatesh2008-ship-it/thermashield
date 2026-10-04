import type { RiskLevel } from "@/lib/thermal-data";

export type FitnessHealthPlatform = "apple-health" | "health-connect" | "web";
export type FitnessHealthStatus = "unavailable" | "disconnected" | "connected" | "error";

export type ThermalHealthEvent = {
  id: string;
  startedAt: string;
  endedAt: string;
  zoneName: string;
  outdoorTemperatureC: number;
  thermalShock: number;
  dailyCumulativeScore: number;
  risk: RiskLevel;
  source: "ThermaShield";
};

export type FitnessHealthAdapter = {
  platform: FitnessHealthPlatform;
  isAvailable: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  writeThermalEvent: (event: ThermalHealthEvent) => Promise<void>;
};
