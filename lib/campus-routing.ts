import { getZoneTemperature, scoreTransition, ZONES, type ThermalTransition, type Zone } from "@/lib/thermal-data";

// Campus corridors model indoor-first connections; outdoor zones are only used when the destination requires them.
const ADJACENCY: Record<number, number[]> = {
  1: [2, 3, 4],
  2: [1, 4, 8],
  3: [1, 4, 5],
  4: [1, 2, 3, 5, 9],
  5: [3, 4, 9, 6],
  6: [5, 7, 9],
  7: [6],
  8: [2, 9],
  9: [4, 5, 6, 8],
};

export type CampusRoute = {
  zones: Zone[];
  totalShock: number;
  outdoorSteps: number;
  indoorSteps: number;
};

function edgeCost(from: Zone, to: Zone, outdoorTemp: number, previous?: ThermalTransition) {
  const step = scoreTransition(from, to, previous, outdoorTemp);
  // A small outdoor penalty makes equal-shock alternatives prefer indoor corridors.
  const outdoorPenalty = to.type === "hot" || from.type === "hot" ? 8 : 0;
  return { score: step.shock + outdoorPenalty, shock: step.shock };
}

export function findSafestRoute(start: Zone, destination: Zone, outdoorTemp = 34): CampusRoute {
  if (start.id === destination.id) return { zones: [start], totalShock: 0, outdoorSteps: 0, indoorSteps: 0 };
  const distances = new Map<number, number>(ZONES.map((zone) => [zone.id, Number.POSITIVE_INFINITY]));
  const paths = new Map<number, Zone[]>([[start.id, [start]]]);
  const visited = new Set<number>();
  distances.set(start.id, 0);

  while (visited.size < ZONES.length) {
    const current = ZONES.filter((zone) => !visited.has(zone.id)).sort((a, b) => (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity))[0];
    if (!current || !Number.isFinite(distances.get(current.id))) break;
    visited.add(current.id);
    if (current.id === destination.id) break;
    for (const neighborId of ADJACENCY[current.id] ?? []) {
      if (visited.has(neighborId)) continue;
      const neighbor = ZONES.find((zone) => zone.id === neighborId);
      if (!neighbor) continue;
      const path = paths.get(current.id) ?? [start];
      const previous = path.length > 1 ? undefined : undefined;
      const candidate = (distances.get(current.id) ?? 0) + edgeCost(current, neighbor, outdoorTemp, previous).score;
      if (candidate < (distances.get(neighbor.id) ?? Infinity)) {
        distances.set(neighbor.id, candidate);
        paths.set(neighbor.id, [...path, neighbor]);
      }
    }
  }

  const zones = paths.get(destination.id) ?? [start, destination];
  let totalShock = 0;
  let outdoorSteps = 0;
  let indoorSteps = 0;
  for (let i = 1; i < zones.length; i += 1) {
    const from = zones[i - 1];
    const to = zones[i];
    totalShock += edgeCost(from, to, outdoorTemp).shock;
    if (from.type === "hot" || to.type === "hot") outdoorSteps += 1;
    else indoorSteps += 1;
  }
  return { zones, totalShock: Number(totalShock.toFixed(1)), outdoorSteps, indoorSteps };
}

export function formatRoute(route: CampusRoute) {
  return route.zones.map((zone) => zone.name).join("  →  ");
}

export function routeTemperature(zone: Zone, outdoorTemp: number) {
  return getZoneTemperature(zone, outdoorTemp);
}
