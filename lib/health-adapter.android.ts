import { initialize, insertRecords, requestPermission } from "react-native-health-connect";
import type { FitnessHealthAdapter, ThermalHealthEvent } from "@/lib/health-types";

// Health Connect's ExerciseSessionType.WALKING constant is 79.
const WALKING_EXERCISE_TYPE = 79;
const permissions = [{ accessType: "write" as const, recordType: "ExerciseSession" as const }];

const adapter: FitnessHealthAdapter = {
  platform: "health-connect",
  isAvailable: async () => {
    try {
      return await initialize();
    } catch {
      return false;
    }
  },
  requestPermissions: async () => {
    try {
      if (!(await initialize())) return false;
      const granted = await requestPermission(permissions);
      return granted.some((permission) => permission.accessType === "write" && permission.recordType === "ExerciseSession");
    } catch {
      return false;
    }
  },
  writeThermalEvent: async (event: ThermalHealthEvent) => {
    if (!(await initialize())) throw new Error("Health Connect is unavailable.");
    await insertRecords([{
      recordType: "ExerciseSession",
      exerciseType: WALKING_EXERCISE_TYPE,
      startTime: event.startedAt,
      endTime: event.endedAt,
      title: "ThermaShield outdoor exposure",
      notes: `${event.zoneName} · ${event.thermalShock.toFixed(1)} shock · ${event.risk} tier · ${event.outdoorTemperatureC.toFixed(1)}°C outdoor`,
      metadata: {
        clientRecordId: event.id,
        clientRecordVersion: 1,
      },
    }]);
  },
};

export const fitnessHealthAdapter = adapter;
export const getFitnessHealthAdapter = () => adapter;
