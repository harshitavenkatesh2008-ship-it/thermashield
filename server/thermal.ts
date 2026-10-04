import { DEMO_DAY, DEMO_WEEK, ZONES, bonusFor, directionFor, directionWeightFor, getRisk, getZoneTemperature, recoveryFor, type RiskLevel, type ThermalTransition, type Zone } from "../lib/thermal-data";

export type WeatherSnapshot = { temp: number; feelsLike: number; humidity: number; uvIndex: number; description: string; cached: boolean; estimated: boolean; fetchedAt: string };

export const ChennaiFallback: WeatherSnapshot = { temp: 34, feelsLike: 38, humidity: 72, uvIndex: 4, description: "estimated outdoor conditions", cached: false, estimated: true, fetchedAt: new Date().toISOString() };

export async function fetchWeather(latitude = 12.8406, longitude = 80.1534): Promise<WeatherSnapshot> {
  try {
    const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,uv_index,weather_code&timezone=auto`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("Weather provider unavailable");
    const data = await response.json() as { current?: { temperature_2m?: number; relative_humidity_2m?: number; apparent_temperature?: number; uv_index?: number } };
    const current = data.current;
    if (!current?.temperature_2m) throw new Error("Weather response incomplete");
    return { temp: Number(current.temperature_2m.toFixed(1)), feelsLike: Number((current.apparent_temperature ?? current.temperature_2m).toFixed(1)), humidity: current.relative_humidity_2m ?? 72, uvIndex: current.uv_index ?? 4, description: "live conditions", cached: false, estimated: false, fetchedAt: new Date().toISOString() };
  } catch {
    return { ...ChennaiFallback, fetchedAt: new Date().toISOString() };
  }
}

export type ForecastBlock = { timestamp: string; label: string; tempC: number; deltaFromAcC: number; color: "green" | "yellow" | "orange" | "red"; highShockRisk: boolean; riskLabel: string };
export type ForecastResponse = { forecast: ForecastBlock[]; fetchedAt: string; expiresAt: string; source: "openweathermap" };
type ForecastCacheEntry = { expiresAt: number; value: ForecastResponse };
const forecastCache = new Map<string, ForecastCacheEntry>();
const FORECAST_CACHE_MS = 60 * 60 * 1000;

function forecastColor(tempC: number): ForecastBlock["color"] {
  const delta = Math.abs(tempC - 20);
  if (delta <= 5) return "green";
  if (delta <= 10) return "yellow";
  if (delta <= 15) return "orange";
  return "red";
}

function forecastLabel(timestampSeconds: number, timezoneOffsetSeconds: number) {
  const shifted = new Date(timestampSeconds * 1000 + timezoneOffsetSeconds * 1000);
  const hour = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""} ${suffix}`;
}

export async function fetchForecast(latitude = 12.8406, longitude = 80.1534): Promise<ForecastResponse | null> {
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cached = forecastCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const apiKey = process.env.OPENWEATHERMAP_API_KEY ?? process.env.OPENWEATHER_API_KEY ?? process.env.OPENWEATHER_KEY;
  if (!apiKey) return null;
  try {
    const endpoint = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`OpenWeatherMap forecast failed: ${response.status}`);
    const data = await response.json() as { list?: Array<{ dt: number; main?: { temp?: number } }>; city?: { timezone?: number } };
    const timezoneOffset = data.city?.timezone ?? 0;
    const blocks = (data.list ?? []).filter((item) => typeof item.main?.temp === "number").slice(0, 4).map((item) => {
      const tempC = Number((item.main?.temp ?? 0).toFixed(1));
      const deltaFromAcC = Number(Math.abs(tempC - 20).toFixed(1));
      const color = forecastColor(tempC);
      return { timestamp: new Date(item.dt * 1000).toISOString(), label: forecastLabel(item.dt, timezoneOffset), tempC, deltaFromAcC, color, highShockRisk: tempC > 35, riskLabel: tempC > 35 ? "High shock risk" : "" };
    });
    if (!blocks.length) throw new Error("OpenWeatherMap returned no forecast blocks");
    const fetchedAt = new Date();
    const value: ForecastResponse = { forecast: blocks, fetchedAt: fetchedAt.toISOString(), expiresAt: new Date(fetchedAt.getTime() + FORECAST_CACHE_MS).toISOString(), source: "openweathermap" };
    forecastCache.set(key, { expiresAt: fetchedAt.getTime() + FORECAST_CACHE_MS, value });
    return value;
  } catch {
    return null;
  }
}

export function calculateShock(from: Zone, to: Zone, previous: ThermalTransition | undefined, weather = ChennaiFallback, minutesSinceLast?: number | null): ThermalTransition {
  const fromTemp = getZoneTemperature(from, weather.temp);
  const toTemp = getZoneTemperature(to, weather.temp);
  const direction = directionFor(from, to);
  const timeSinceLastMin = minutesSinceLast ?? previous?.timeSinceLastMin ?? null;
  const recoveryFactor = recoveryFor(timeSinceLastMin);
  const directionWeight = directionWeightFor(direction);
  const bonusModifier = bonusFor(direction, weather.humidity, weather.uvIndex, new Date().getHours());
  const shock = Number((Math.abs(fromTemp - toTemp) * directionWeight * recoveryFactor * bonusModifier).toFixed(1));
  const cumulative = Number(((previous?.cumulative ?? 0) + shock).toFixed(1));
  const risk: RiskLevel = getRisk(cumulative);
  return { id: Date.now(), timestamp: new Date().toISOString(), from: from.name, to: to.name, fromTemp, toTemp, deltaT: Math.abs(fromTemp - toTemp), direction, directionWeight, recoveryFactor, bonusModifier, shock, cumulative, risk, formula: `|${fromTemp} − ${toTemp}| × ${directionWeight.toFixed(1)} × ${recoveryFactor.toFixed(1)} × ${bonusModifier.toFixed(1)} = ${shock.toFixed(1)}`, fromZoneId: from.id, toZoneId: to.id, timeSinceLastMin };
}


export type RoutePlan = {
  from: Zone;
  to: Zone;
  weather: WeatherSnapshot;
  timeSinceLastMin: number | null;
  direct: ThermalTransition;
  bufferRecommendation: null | {
    zone: Zone;
    firstLeg: ThermalTransition;
    secondLeg: ThermalTransition;
    directShock: number;
    bufferedShock: number;
    reductionPercent: number;
    reason: string;
  };
};

export function planThermalRoute(from: Zone, to: Zone, previous: ThermalTransition | undefined, weather = ChennaiFallback, minutesSinceLast: number | null = null): RoutePlan {
  const direct = calculateShock(from, to, previous, weather, minutesSinceLast);
  const transitionZones = ZONES.filter((zone) => zone.type === "transition" && zone.id !== from.id && zone.id !== to.id);
  const candidates = transitionZones.map((zone) => {
    const firstLeg = calculateShock(from, zone, previous, weather, minutesSinceLast);
    const secondLeg = calculateShock(zone, to, firstLeg, weather, 15);
    const bufferedShock = Number((firstLeg.shock + secondLeg.shock).toFixed(1));
    const reductionPercent = direct.shock > 0 ? Number((((direct.shock - bufferedShock) / direct.shock) * 100).toFixed(1)) : 0;
    return { zone, firstLeg, secondLeg, bufferedShock, reductionPercent };
  }).sort((a, b) => a.bufferedShock - b.bufferedShock);
  const best = candidates[0];
  const shouldRecommend = direct.cumulative >= 81 && Boolean(best) && best.bufferedShock <= Number((direct.shock * 0.85).toFixed(1));
  return {
    from,
    to,
    weather,
    timeSinceLastMin: minutesSinceLast,
    direct,
    bufferRecommendation: shouldRecommend && best ? {
      zone: best.zone,
      firstLeg: best.firstLeg,
      secondLeg: best.secondLeg,
      directShock: direct.shock,
      bufferedShock: best.bufferedShock,
      reductionPercent: best.reductionPercent,
      reason: `Consider stopping at ${best.zone.name} for 15 minutes first. This would reduce the shock from ${direct.shock.toFixed(1)} to ${best.bufferedShock.toFixed(1)}.`,
    } : null,
  };
}


export type RiskAlert = { id: string; threshold: number; risk: RiskLevel; title: string; tip: string };

const ALERT_COPY: Record<Exclude<RiskLevel, "low">, { threshold: number; title: string; tip: string }> = {
  moderate: { threshold: 41, title: "Moderate thermal load", tip: "You've had rapid transitions. Drink 250ml water and spend 10+ min in your current zone before moving again." },
  high: { threshold: 81, title: "Significant thermal load", tip: "Significant thermal load. Avoid outdoor transitions for the next hour if possible." },
  critical: { threshold: 131, title: "Very high exposure today", tip: "Very high exposure today. Stay in one thermal zone and hydrate immediately." },
};

export function getRiskAlert(previous: RiskLevel, current: RiskLevel, day: string): RiskAlert | null {
  const rank: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2, critical: 3 };
  if (rank[current] <= rank[previous] || current === "low") return null;
  const copy = ALERT_COPY[current];
  return { id: `${day}:${current}`, risk: current, threshold: copy.threshold, title: copy.title, tip: copy.tip };
}

export function getZones() { return ZONES; }
export function getDemoDay() { return DEMO_DAY; }
export function getDemoWeek() { return DEMO_WEEK; }

export function pearson(xs: number[], ys: number[]) {
  if (xs.length < 2 || xs.length !== ys.length) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const numerator = xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0);
  const denominator = Math.sqrt(xs.reduce((sum, x) => sum + (x - mx) ** 2, 0) * ys.reduce((sum, y) => sum + (y - my) ** 2, 0));
  return denominator ? Number((numerator / denominator).toFixed(2)) : 0;
}

export function buildInsights() {
  const scores = DEMO_WEEK.map((day) => day.score);
  const headache = DEMO_WEEK.map((day) => day.symptoms.includes("Headache") ? 1 : 0);
  const fatigue = DEMO_WEEK.map((day) => day.symptoms.includes("Fatigue") ? 1 : 0);
  const highest = DEMO_WEEK.reduce((best, day) => day.score > best.score ? day : best, DEMO_WEEK[0]);
  return { symptomCorrelation: { headache: { correlation: pearson(scores, headache), avgScoreWith: 118.4, avgScoreWithout: 62.1, insight: "Days with higher scores show a stronger association with headache reports." }, fatigue: { correlation: pearson(scores, fatigue), avgScoreWith: 105.2, avgScoreWithout: 58.7, insight: "Fatigue appears more often on high thermal exposure days." } }, dayPatterns: { highestRiskDay: highest.day, avgByDay: Object.fromEntries(DEMO_WEEK.map((day) => [day.day, day.score])), insight: `${highest.day}s average ${highest.score} — your highest-exposure day.` }, personalBaseline: { avgDailyScore: 92.6, symptomOnsetThreshold: 105, defaultThreshold: 131, insight: "Your symptoms typically appear around score 105 — lower than the default threshold." }, recommendations: ["Use the SJT corridor as a 5-minute thermal buffer before heading outdoors.", "Space one transition on your highest-exposure day when possible.", "Staying in one zone for 2+ hours can reduce your score by roughly 20%."] };
}
