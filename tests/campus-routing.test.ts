import { describe, expect, it } from "vitest";
import { DEMO_DAY, ZONES } from "../lib/thermal-data";
import { ChennaiFallback, planThermalRoute } from "../server/thermal";

const weatherAt = (temp: number) => ({ ...ChennaiFallback, temp });

describe("campus route planning", () => {
  it("calculates the direct transition with the current elapsed-time recovery factor", () => {
    const plan = planThermalRoute(ZONES[0], ZONES[5], undefined, weatherAt(36), 20);

    expect(plan.direct.deltaT).toBe(18);
    expect(plan.direct.recoveryFactor).toBe(1.5);
    expect(plan.direct.shock).toBe(35.1);
    expect(plan.direct.cumulative).toBe(35.1);
    expect(plan.direct.risk).toBe("low");
    expect(plan.direct.formula).toBe("|18 − 36| × 1.3 × 1.5 × 1.0 = 35.1");
    expect(plan.bufferRecommendation).toBeNull();
  });

  it("does not suggest an intermediate stop when the prediction remains below High", () => {
    const plan = planThermalRoute(ZONES[1], ZONES[3], undefined, weatherAt(34), 60);

    expect(plan.direct.risk).toBe("low");
    expect(plan.direct.cumulative).toBeLessThan(81);
    expect(plan.bufferRecommendation).toBeNull();
  });

  it("selects an eligible transition buffer and models the 15-minute second leg", () => {
    const prior = { ...DEMO_DAY[0], cumulative: 100, timeSinceLastMin: 10 };
    const plan = planThermalRoute(ZONES[0], ZONES[5], prior, weatherAt(36), 10);
    const recommendation = plan.bufferRecommendation;

    expect(plan.direct.risk).toBe("critical");
    expect(recommendation).not.toBeNull();
    expect(recommendation?.zone.type).toBe("transition");
    expect(recommendation?.zone.id).not.toBe(plan.from.id);
    expect(recommendation?.zone.id).not.toBe(plan.to.id);
    expect(recommendation?.zone.name).toBe("SJT Corridor");
    expect(recommendation?.firstLeg.timeSinceLastMin).toBe(10);
    expect(recommendation?.secondLeg.timeSinceLastMin).toBe(15);
    expect(recommendation?.bufferedShock).toBe(
      Number(((recommendation?.firstLeg.shock ?? 0) + (recommendation?.secondLeg.shock ?? 0)).toFixed(1)),
    );
    expect(recommendation?.reductionPercent).toBeGreaterThanOrEqual(15);
    expect(recommendation?.bufferedShock).toBeLessThanOrEqual(Number((plan.direct.shock * 0.85).toFixed(1)));
    expect(recommendation?.reason).toContain("Consider stopping at SJT Corridor for 15 minutes first.");
  });
});
