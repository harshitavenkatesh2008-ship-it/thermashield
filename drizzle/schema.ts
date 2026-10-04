import { date, double, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const zones = mysqlTable("thermal_zones", {
  id: int("id").autoincrement().primaryKey(),
  zoneCode: varchar("zoneCode", { length: 12 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  zoneType: mysqlEnum("zoneType", ["cold", "transition", "hot"]).notNull(),
  estimatedTemp: double("estimatedTemp"),
  building: varchar("building", { length: 80 }),
  wifiSsid: varchar("wifiSsid", { length: 120 }),
  lat: double("lat"),
  lng: double("lng"),
});

export const transitions = mysqlTable("thermal_transitions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fromZoneId: int("fromZoneId").notNull(),
  toZoneId: int("toZoneId").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  fromTemp: double("fromTemp").notNull(),
  toTemp: double("toTemp").notNull(),
  deltaT: double("deltaT").notNull(),
  direction: varchar("direction", { length: 24 }).notNull(),
  directionWeight: double("directionWeight").notNull(),
  timeSinceLast: int("timeSinceLast"),
  recoveryFactor: double("recoveryFactor").notNull(),
  humidity: double("humidity"),
  uvIndex: double("uvIndex"),
  bonusModifier: double("bonusModifier").notNull(),
  shockScore: double("shockScore").notNull(),
  cumulativeScore: double("cumulativeScore").notNull(),
  riskLevel: varchar("riskLevel", { length: 16 }).notNull(),
  dataQuality: varchar("dataQuality", { length: 24 }).default("manual").notNull(),
});

export const symptoms = mysqlTable("thermal_symptoms", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: date("date").notNull(),
  symptom: varchar("symptom", { length: 48 }).notNull(),
  severity: int("severity").default(1).notNull(),
  notes: text("notes"),
  dailyScore: double("dailyScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const dailyScores = mysqlTable("thermal_daily_scores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: date("date").notNull(),
  totalTransitions: int("totalTransitions").notNull(),
  cumulativeScore: double("cumulativeScore").notNull(),
  peakSingleShock: double("peakSingleShock").notNull(),
  avgDeltaT: double("avgDeltaT").notNull(),
  maxDeltaT: double("maxDeltaT").notNull(),
  riskLevel: varchar("riskLevel", { length: 16 }).notNull(),
  outdoorTempAvg: double("outdoorTempAvg"),
  outdoorTempMax: double("outdoorTempMax"),
});

export const weatherCache = mysqlTable("thermal_weather_cache", {
  id: int("id").autoincrement().primaryKey(),
  lat: double("lat").notNull(),
  lng: double("lng").notNull(),
  temp: double("temp").notNull(),
  humidity: double("humidity"),
  uvIndex: double("uvIndex"),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Zone = typeof zones.$inferSelect;
export type Transition = typeof transitions.$inferSelect;
export type Symptom = typeof symptoms.$inferSelect;
export type DailyScore = typeof dailyScores.$inferSelect;
export type WeatherCache = typeof weatherCache.$inferSelect;
