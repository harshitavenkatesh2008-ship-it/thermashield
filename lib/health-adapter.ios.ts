import HealthKit, { WorkoutActivityType } from "@kingstinct/react-native-healthkit";
import type { FitnessHealthAdapter, ThermalHealthEvent } from "@/lib/health-types";

const adapter: FitnessHealthAdapter = {
  platform: "apple-health",
  isAvailable: async () => HealthKit.isHealthDataAvailableAsync(),
  requestPermissions: async () => {
    const available = await HealthKit.isHealthDataAvailableAsync();
    if (!available) return false;
    return HealthKit.requestAuthorization({ toShare: ["HKWorkoutTypeIdentifier"] });
  },
  writeThermalEvent: async (event: ThermalHealthEvent) => {
    const start = new Date(event.startedAt);
    const end = new Date(event.endedAt);
    await HealthKit.saveWorkoutSample(
      WorkoutActivityType.walking,
      [],
      start,
      end,
      undefined,
      {
        HKMetadataKeySyncIdentifier: event.id,
        ThermaShieldEventId: event.id,
        ThermaShieldZone: event.zoneName,
        ThermaShieldThermalShock: event.thermalShock,
        ThermaShieldDailyScore: event.dailyCumulativeScore,
        ThermaShieldOutdoorTemperatureC: event.outdoorTemperatureC,
        ThermaShieldRiskTier: event.risk,
        ThermaShieldSource: event.source,
      },
    );
  },
};

export const fitnessHealthAdapter = adapter;
export const getFitnessHealthAdapter = () => adapter;
