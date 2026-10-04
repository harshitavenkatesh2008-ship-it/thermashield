CREATE TABLE `thermal_daily_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` date NOT NULL,
	`totalTransitions` int NOT NULL,
	`cumulativeScore` double NOT NULL,
	`peakSingleShock` double NOT NULL,
	`avgDeltaT` double NOT NULL,
	`maxDeltaT` double NOT NULL,
	`riskLevel` varchar(16) NOT NULL,
	`outdoorTempAvg` double,
	`outdoorTempMax` double,
	CONSTRAINT `thermal_daily_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thermal_symptoms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` date NOT NULL,
	`symptom` varchar(48) NOT NULL,
	`severity` int NOT NULL DEFAULT 1,
	`notes` text,
	`dailyScore` double,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `thermal_symptoms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thermal_transitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fromZoneId` int NOT NULL,
	`toZoneId` int NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`fromTemp` double NOT NULL,
	`toTemp` double NOT NULL,
	`deltaT` double NOT NULL,
	`direction` varchar(24) NOT NULL,
	`directionWeight` double NOT NULL,
	`timeSinceLast` int,
	`recoveryFactor` double NOT NULL,
	`humidity` double,
	`uvIndex` double,
	`bonusModifier` double NOT NULL,
	`shockScore` double NOT NULL,
	`cumulativeScore` double NOT NULL,
	`riskLevel` varchar(16) NOT NULL,
	`dataQuality` varchar(24) NOT NULL DEFAULT 'manual',
	CONSTRAINT `thermal_transitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thermal_weather_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lat` double NOT NULL,
	`lng` double NOT NULL,
	`temp` double NOT NULL,
	`humidity` double,
	`uvIndex` double,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `thermal_weather_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thermal_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`zoneCode` varchar(12) NOT NULL,
	`name` varchar(120) NOT NULL,
	`zoneType` enum('cold','transition','hot') NOT NULL,
	`estimatedTemp` double,
	`building` varchar(80),
	`wifiSsid` varchar(120),
	`lat` double,
	`lng` double,
	CONSTRAINT `thermal_zones_id` PRIMARY KEY(`id`),
	CONSTRAINT `thermal_zones_zoneCode_unique` UNIQUE(`zoneCode`)
);
