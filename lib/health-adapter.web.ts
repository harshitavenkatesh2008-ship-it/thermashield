import type { FitnessHealthAdapter } from "@/lib/health-types";

export const fitnessHealthAdapter: FitnessHealthAdapter = {
  platform: "web",
  isAvailable: async () => false,
  requestPermissions: async () => false,
  writeThermalEvent: async () => {
    throw new Error("Health integrations require a native iOS or Android build.");
  },
};

export const getFitnessHealthAdapter = () => fitnessHealthAdapter;
