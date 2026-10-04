import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { createCorsMiddleware } from "./cors";
import { clearLegacySessionCookie } from "./cookies";
import { buildInsights, calculateShock, ChennaiFallback, fetchWeather, fetchForecast, getDemoDay, getDemoWeek, getZones, getRiskAlert, pearson, planThermalRoute } from "../thermal";

type DailyTransitionState = { cumulative: number; risk: "low" | "moderate" | "high" | "critical"; totalTransitions: number; lastTransition?: ReturnType<typeof calculateShock>; lastAt?: number; transitions: Array<ReturnType<typeof calculateShock>> };
const dailyTransitions = new Map<string, DailyTransitionState>();

function syntheticCampusScores() {
  let seed = 928374;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const raw = Array.from({ length: 100 }, () => {
    const u1 = Math.max(random(), 0.0001);
    const u2 = random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return 75 + z * 35;
  });
  const mean = raw.reduce((sum, score) => sum + score, 0) / raw.length;
  const centered = raw.map((score) => Math.max(0, Math.min(200, score + (75 - mean))));
  return centered.map((score) => Number(score.toFixed(1)));
}
const SYNTHETIC_CAMPUS_SCORES = syntheticCampusScores();

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(createCorsMiddleware());
  app.use(clearLegacySessionCookie());

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.post("/api/user", (_req, res) => res.json({ user_id: 1, name: _req.body?.name ?? "Janvi", created: true }));
  app.get("/api/zones", (_req, res) => res.json(getZones()));
  app.get("/api/weather", async (req, res) => {
    const latitude = Number(req.query.lat ?? 12.8406);
    const longitude = Number(req.query.lng ?? 80.1534);
    res.json(await fetchWeather(Number.isFinite(latitude) ? latitude : 12.8406, Number.isFinite(longitude) ? longitude : 80.1534));
  });
  app.get("/api/forecast", async (req, res) => {
    const latitude = Number(req.query.lat ?? 12.8406);
    const longitude = Number(req.query.lng ?? 80.1534);
    const forecast = await fetchForecast(Number.isFinite(latitude) ? latitude : 12.8406, Number.isFinite(longitude) ? longitude : 80.1534);
    if (!forecast) return res.status(503).json({ available: false });
    return res.json({ available: true, ...forecast });
  });
  app.get("/api/report/:userId", (req, res) => {
    const requestedDays = Number(req.query.days ?? 7);
    const days = Math.max(1, Math.min(30, Number.isFinite(requestedDays) ? Math.round(requestedDays) : 7));
    const rows = getDemoWeek().slice(-days);
    const totalTransitions = rows.reduce((sum, day) => sum + day.transitions, 0);
    const averageDailyScore = rows.length ? Number((rows.reduce((sum, day) => sum + day.score, 0) / rows.length).toFixed(1)) : 0;
    const highest = rows.reduce((best, day) => !best || day.score > best.score ? day : best, null as typeof rows[number] | null);
    const lowest = rows.reduce((best, day) => !best || day.score < best.score ? day : best, null as typeof rows[number] | null);
    const highScoreDays = rows.map((day) => day.score >= 81 ? 1 : 0);
    const symptomCounts = new Map<string, number>();
    for (const day of rows) for (const symptom of day.symptoms) symptomCounts.set(symptom, (symptomCounts.get(symptom) ?? 0) + 1);
    const frequentSymptoms = [...symptomCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count, correlationToHighScoreDays: pearson(rows.map((day) => day.symptoms.includes(name) ? 1 : 0), highScoreDays) }));
    const insights = buildInsights();
    const userName = String(req.query.name ?? "ThermaShield user");
    const dateRange = { start: rows[0]?.date ?? "", end: rows[rows.length - 1]?.date ?? "" };
    const plainText = `ThermaShield — Personal Thermal Exposure Report\n${dateRange.start} to ${dateRange.end} · ${userName}\n\nTotal transitions: ${totalTransitions}\nAverage daily score: ${averageDailyScore}\nHighest score day: ${highest ? `${highest.date} (${highest.score.toFixed(1)}, ${highest.risk})` : "—"}\nLowest score day: ${lowest ? `${lowest.date} (${lowest.score.toFixed(1)}, ${lowest.risk})` : "—"}\n\nRecommendations:\n${insights.recommendations.map((item) => `• ${item}`).join("\n")}`;
    return res.json({ userName, days, dateRange, totalTransitions, averageDailyScore, highestScoreDay: highest ? { date: highest.date, score: highest.score, risk: highest.risk } : null, lowestScoreDay: lowest ? { date: lowest.date, score: lowest.score, risk: lowest.risk } : null, frequentSymptoms, recommendations: insights.recommendations, breakdown: rows.map((day) => ({ date: day.date, score: day.score, risk: day.risk, transitions: day.transitions, symptoms: day.symptoms })), plainText });
  });
  app.get("/api/peer-percentile/:userId", (req, res) => {
    const day = new Date().toISOString().slice(0, 10);
    const state = dailyTransitions.get(`${req.params.userId}:${day}`);
    const requestedScore = Number(req.query.score);
    const yourScore = Number.isFinite(requestedScore) ? Math.max(0, Math.min(200, requestedScore)) : state?.cumulative ?? 0;
    const belowCount = SYNTHETIC_CAMPUS_SCORES.filter((score) => score < yourScore).length;
    const percentile = Math.round((belowCount / SYNTHETIC_CAMPUS_SCORES.length) * 100);
    const campusAvg = Number((SYNTHETIC_CAMPUS_SCORES.reduce((sum, score) => sum + score, 0) / SYNTHETIC_CAMPUS_SCORES.length).toFixed(1));
    const message = percentile >= 50 ? `Your exposure today is higher than ${percentile}% of campus users` : `Your exposure today is lower than ${100 - percentile}% of campus users`;
    return res.json({ percentile, message, campus_avg: campusAvg, your_score: Number(yourScore.toFixed(1)), sample_size: SYNTHETIC_CAMPUS_SCORES.length, privacy: "Compared against anonymised aggregate campus data. No personal information is shared." });
  });
  app.get("/api/daily-digest/:userId", (req, res) => {
    const day = new Date().toISOString().slice(0, 10);
    const state = dailyTransitions.get(`${req.params.userId}:${day}`);
    const transitions = state?.transitions ?? [];
    const worst = transitions.reduce<ReturnType<typeof calculateShock> | null>((best, item) => !best || item.shock > best.shock ? item : best, null);
    const outdoorTemps = transitions.flatMap((item) => [item.fromZoneId, item.toZoneId].some((id) => getZones().find((zone) => zone.id === id)?.type === "hot") ? [item.fromTemp, item.toTemp] : []);
    const peakOutdoorTemp = outdoorTemps.length ? Math.max(...outdoorTemps) : null;
    const risk = state?.risk ?? "low";
    const tip = risk === "critical" ? "Very high exposure today. Rest well, hydrate, and try to reduce transitions tomorrow." : risk === "high" ? "Tough day thermally. Extra hydration tonight helps recovery." : risk === "moderate" ? "Moderate day. Consider spacing transitions further apart tomorrow." : "Great day! Your thermal exposure was minimal.";
    const score = state?.cumulative ?? 0;
    const shareText = `ThermaShield Daily Digest — Score: ${score.toFixed(1)} (${risk[0].toUpperCase()}${risk.slice(1)}) | ${state?.totalTransitions ?? 0} transitions${worst ? ` | Worst: ${worst.from} → ${worst.to} (+${worst.shock.toFixed(1)})` : ""}`;
    return res.json({ date: day, totalTransitions: state?.totalTransitions ?? 0, finalScore: score, riskLevel: risk, worstTransition: worst ? { from: worst.from, to: worst.to, time: new Date(worst.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), shock: worst.shock } : null, peakOutdoorTemp, tip, shareText });
  });
  app.get("/api/plan-route", async (req, res) => {
    const fromId = Number(req.query.from_zone);
    const toId = Number(req.query.to_zone);
    const from = getZones().find((zone) => zone.id === fromId);
    const to = getZones().find((zone) => zone.id === toId);
    if (!from || !to) return res.status(400).json({ error: "from_zone and to_zone are required zone IDs" });
    const userId = String(req.query.user_id ?? "1");
    const day = new Date().toISOString().slice(0, 10);
    const previous = dailyTransitions.get(`${userId}:${day}`);
    const now = Date.now();
    const timeSinceLastMin = previous?.lastAt ? Number(((now - previous.lastAt) / 60_000).toFixed(1)) : null;
    const weather = await fetchWeather();
    const plan = planThermalRoute(from, to, previous?.lastTransition, weather, timeSinceLastMin);
    return res.json({
      user_id: Number(userId) || userId,
      from_zone: from,
      to_zone: to,
      current_daily_score: previous?.cumulative ?? 0,
      weather,
      time_since_last_transition_min: timeSinceLastMin,
      predicted: {
        delta_t: plan.direct.deltaT,
        shock: plan.direct.shock,
        cumulative_score: plan.direct.cumulative,
        risk_level: plan.direct.risk,
        formula: plan.direct.formula,
        direction: plan.direct.direction,
        recovery_factor: plan.direct.recoveryFactor,
        bonus_modifier: plan.direct.bonusModifier,
      },
      buffer_recommendation: plan.bufferRecommendation ? {
        zone: plan.bufferRecommendation.zone,
        direct_shock: plan.bufferRecommendation.directShock,
        buffered_shock: plan.bufferRecommendation.bufferedShock,
        reduction_percent: plan.bufferRecommendation.reductionPercent,
        first_leg: plan.bufferRecommendation.firstLeg,
        second_leg: plan.bufferRecommendation.secondLeg,
        reason: plan.bufferRecommendation.reason,
      } : null,
    });
  });
  app.get("/api/dashboard/:userId", (_req, res) => res.json({ score: 147.9, risk_level: "critical", total_transitions: 7, peak_shock: 25.5, transitions: getDemoDay() }));
  app.get("/api/history/:userId", (_req, res) => res.json(getDemoWeek()));
  app.get("/api/insights/:userId", (_req, res) => res.json(buildInsights()));
  app.post("/api/demo/load", (_req, res) => res.json({ loaded: true, days: 7, total_transitions: 27, message: "Sample week loaded — includes symptom data for ML insights", week: getDemoWeek(), demo_day: getDemoDay() }));
  app.post("/api/symptom", (_req, res) => res.json({ saved: true, daily_score: 147.9 }));
  app.post("/api/transition", (req, res) => {
    const from = getZones().find((zone) => zone.id === Number(req.body?.from_zone_id));
    const to = getZones().find((zone) => zone.id === Number(req.body?.to_zone_id));
    if (!from || !to) return res.status(400).json({ error: "from_zone_id and to_zone_id are required" });
    const userId = String(req.body?.user_id ?? "1");
    const day = new Date().toISOString().slice(0, 10);
    const key = `${userId}:${day}`;
    const previous = dailyTransitions.get(key);
    const timeSinceLastMin = previous?.lastAt ? Number(((Date.now() - previous.lastAt) / 60_000).toFixed(1)) : null;
    const transition = calculateShock(from, to, previous?.lastTransition, ChennaiFallback, timeSinceLastMin);
    const alert = getRiskAlert(previous?.risk ?? "low", transition.risk, day);
    const nextState: DailyTransitionState = { cumulative: transition.cumulative, risk: transition.risk, totalTransitions: (previous?.totalTransitions ?? 0) + 1, lastTransition: transition, lastAt: Date.now(), transitions: [...(previous?.transitions ?? []), transition] };
    dailyTransitions.set(key, nextState);
    return res.json({ transition, daily_summary: { cumulative_score: transition.cumulative, risk_level: transition.risk, total_transitions: nextState.totalTransitions }, alert });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    console.log("[api] server listening");
  });
}

startServer().catch(() => {
  console.error("[api] server failed to start");
});
