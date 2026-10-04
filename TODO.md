# ThermaShield implementation outcomes

## 1. Thermal domain model, exact scoring, zones, weather, and persistence
- The app persists users, zones, transitions, symptoms, daily scores, and weather cache records through the managed starter database conventions.
- The nine VIT Chennai zones are seeded exactly: Z01 TT Lab cold 18°C TT Block; Z02 SJT AC Classroom cold 19°C SJT; Z03 Library cold 20°C Library; Z04 SJT Corridor transition 28°C SJT; Z05 Cafeteria transition 30°C Cafeteria; Z06 Outdoor - Main Road hot using weather; Z07 Outdoor - Parking hot using weather plus 2°C heat-island adjustment; Z08 Hostel Room (AC) cold 22°C Hostel; Z09 Hostel Room (Non-AC) transition 29°C Hostel.
- The deterministic formula is exactly `Shock(i) = |T_from − T_to| × D(i) × R(i) × B(i)` and the daily score is the sum of all transition shocks.
- Direction weights are cold→hot 1.3, hot→cold 1.0, and same type 0.5. Recovery factors are under 15 minutes 1.8, 15–30 minutes 1.5, 30 minutes–1 hour 1.2, 1–2 hours 1.0, and over 2 hours 0.8.
- Bonus modifiers are humidity above 80% ×1.15, UV index above 8 during cold→hot ×1.1, and 12 PM–3 PM during cold→hot ×1.1.
- Risk classification is 0–40 Low with `Normal day. Stay hydrated.`, 41–80 Moderate with `Thermal load building. Consider longer breaks between transitions.`, 81–130 High with `Significant exposure. Try to reduce transitions where possible.`, and 131+ Critical with `Very high thermal exposure today. Rest in one thermal zone.`
- Weather resolves from a fresh 30-minute cache, then stale cache on provider failure, then estimated Chennai outdoor temperature 34°C, and the UI indicates cached or estimated data.

## 2. REST-style server behavior and analytics
- Implement server handlers for user create/login, zones, weather, transition, dashboard, symptom, history, insights, and demo loading, keeping the specified request/response behavior and hiding any OpenWeatherMap key from client code.
- A transition handler resolves the destination temperature, determines the user’s last transition today, calculates elapsed time and all modifiers, persists the record, updates the daily total, classifies the exposure level, and returns the complete breakdown including formula text.
- The analytics layer uses Pearson correlation for symptom-score relationships, compares average scores with/without each symptom, groups scores by weekday, finds highest/lowest days, calculates a 25th-percentile personal symptom-onset threshold after at least seven days, and generates 3–4 actionable recommendations.
- Below five days of data, the Insights screen returns `Log at least 5 days of transitions and symptoms to unlock personalised insights.` rather than fabricated personalization.

## 3. Demo data and judge-ready flows
- Dashboard includes a Load Demo Day action and Settings includes a Load Demo Week action.
- Demo Day loads the exact Tuesday sequence: 8:30 Hostel AC 22°C → Outdoor 34°C shock 15.6 cumulative 15.6 Low; 8:45 Outdoor 34°C → TT Lab 18°C shock 24.0 cumulative 39.6 Low; 10:00 TT Lab 18°C → Outdoor 36°C shock 23.4 cumulative 63.0 Moderate; 10:15 Outdoor 36°C → SJT Classroom 19°C shock 25.5 cumulative 88.5 High; 12:30 SJT Classroom 19°C → Outdoor 38°C shock 21.7 cumulative 110.2 High; 1:30 Outdoor 37°C → TT Lab 18°C shock 19.0 cumulative 129.2 High; 4:00 TT Lab 18°C → Outdoor 36°C shock 18.7 cumulative 147.9 Critical.
- Demo Week loads Monday 4 transitions score 78 Moderate no symptoms; Tuesday 7 transitions score 148.5 Critical with Headache severity 3 and Fatigue severity 2; Wednesday 5 score 91 High with Fatigue severity 1; Thursday 3 score 54 Moderate; Friday 5 score 112 High with Headache severity 2; Saturday 2 score 32 Low; Sunday 1 score 12 Low.
- Demo data populates Dashboard, History, and Insights immediately.

## 4. Mobile screens, navigation, and interactions
- Implement onboarding/name entry, Home dashboard, Log Transition zone selector, Symptom Logger, History & Trends, AI Insights, About/Methodology, and Profile/Settings in the fixed Expo mobile starter.
- Home shows user/weather/time header, 0–200 cumulative gauge, risk label, transitions/peak shock/outdoor temperature stats, cumulative timeline, expandable recent transition cards with formula breakdowns, Demo Day action, and thumb-reachable floating plus button.
- Log Transition shows a 3×3 zone grid with icon, name, temperature, and Cold/Hot/Transition badge; the first transition uses a two-step origin/destination flow; selecting a zone logs it and shows a concise shock/daily/risk result before returning Home.
- Symptom Logger supports Headache, Fatigue, Cough, Throat Irritation, Dizziness, Nausea, and None chips; selected symptoms expose severity 1–5; notes are optional; saving confirms `Logged! This helps ThermaShield learn your personal patterns.`
- History supports 7/14/30-day tabs, color-coded daily score bars, daily summary cards, symptoms, a moving average, and a week comparison insight.
- Insights shows symptom correlation panels, weekday heatmap/bars with highest-risk day, personal baseline versus default thresholds, and actionable recommendations.
- About explains the three-step flow, formula, Parsons (2014), Keatinge et al. (1986), Muller et al. (2025), and ASHRAE Standard 55, and credits Team ShockWave — VIT Chennai.
- Profile supports editable name, default location, °C/°F toggle, notification placeholder, Load Demo Week, Clear My Data, and app version.
- Bottom navigation has Home, History, Insights, and Profile plus a floating plus action.

## 5. Visual system, safety language, and resilience
- Default visual design is dark and mobile-first with deep charcoal background, slate cards, deep teal/cyan primary color, green/amber/orange/red exposure colors, rounded cards, readable system typography, subtle press/chart/gauge animation, shield-and-temperature-wave branding, and 390px portrait usability.
- Every screen visibly includes: `ThermaShield is an awareness tool based on published thermal stress research. It does not provide medical diagnosis or advice.` or the approved concise awareness version.
- Copy remains informational and non-clinical; do not use diagnosis, risk of illness, treatment, or other clinical framing.
- OpenWeatherMap secrets never appear in frontend code. When weather is unavailable, cached or estimated temperature keeps the app usable and is labeled in the UI.
- Native icon, splash, favicon, and Android icon assets are present and referenced without baked-in rounded corners; generated Expo identifiers and fixed ports 8081/3000 remain unchanged.

## 6. Validation and delivery
- Host-managed TypeScript diagnostics are registered before application source edits and actionable errors are resolved.
- `pnpm db:push` succeeds; Metro and API listeners are healthy on ports 8081 and 3000.
- Code checks verify the exact demo numbers, formula example (18°C→36°C, 20 minutes, humidity 72% = 35.1), risk thresholds, formula transparency, Insights lock state, disclaimer coverage, and weather fallback.
- The implementation is reviewed against the approved plan and source brief, affected issues are fixed, and the final code is committed/pushed to the managed canonical `main` branch so the checkpoint is recorded.

## 7. Foreground GPS and real weather
- The app requests device location permission only when the user chooses `Use my current location` or `Allow location while using app`.
- On native Expo, the app uses `expo-location` foreground permission and balanced-accuracy updates; on web, it uses HTTPS browser geolocation.
- Live tracking runs only while the app is open, shows the current latitude/longitude and accuracy, and can be paused/resumed from Home or Profile.
- Device coordinates are sent to the server weather endpoint, which fetches live Open-Meteo conditions for those coordinates and returns temperature, feels-like temperature, humidity, UV index, and a live/cached/estimated source label.
- If permission is denied, the device has no geolocation support, or the weather provider fails, the app remains usable with a clear status message and Chennai estimated fallback.
- The app explains that foreground location is used for live weather/context and that it is not tracked in the background.

## 8. Adaptive location sampling and geofencing

- The app exposes a toggle between **Power-saving** and **High accuracy** location modes.
- Power-saving mode uses adaptive sampling: moving updates every 30 seconds with a 150m distance threshold; stationary updates every 180 seconds with a 250m distance threshold.
- High-accuracy mode uses adaptive sampling: moving updates every 15 seconds with a 100m distance threshold; stationary updates every 60 seconds with a 150m distance threshold.
- Weather requests are cached and throttled: power-saving mode refreshes after meaningful movement or 10 minutes; high-accuracy mode refreshes after meaningful movement or 2 minutes.
- The app can register the VIT Chennai campus as a 250m geofence with enter/exit notifications, requesting background location permission only when the user enables the geofence.
- The Profile screen explains the battery tradeoff and reports geofence status.

## 9. Critical-tier push and sound alerts

- Profile settings include an opt-in `Critical risk notifications` control; notifications are disabled by default until the user grants native permission.
- When a transition response crosses into the Critical tier and notifications are enabled, the native app schedules an immediate local push-style notification with the Critical title, contextual tip, default sound, and vibration.
- Android creates a dedicated `Critical risk alerts` notification channel with maximum importance and the default notification sound.
- The existing in-app Critical banner remains available as the foreground fallback, and web Preview does not claim native push/sound support.
- The notification preference persists locally across app launches and can be disabled from Profile settings.

## 10. Actionable Campus Map

- A fifth Map tab and a tappable Dashboard card open a Campus Map screen showing all nine VIT Chennai zones as colored blocks.
- Zone block colors are based on current Celsius temperature: blue at ≤20°C, teal at 21–25°C, amber at 26–32°C, orange at 33–36°C, and red at 37°C+.
- Each block shows the zone name, current temperature, and a zone-type icon: snowflake for cold, cloud for transition, and sun for hot/outdoor zones.
- Outdoor/Main Road and Outdoor/Parking use the live weather API temperature; Parking retains the +2°C heat-island adjustment.
- The screen refreshes outdoor temperature data on entry and every 30 minutes, with live/cached/estimated source status visible.
- Tapping a zone shows the predicted shock from the user’s current or last logged zone, including the route and breakdown; if no starting zone exists, the screen explains how to unlock the preview.
- A temperature legend is shown below the map.

## 11. Safest indoor routing

- Campus Map provides a route planner with selectable origin and destination zones.
- The planner uses an indoor-first campus corridor graph and a low-shock path algorithm to minimize cumulative transition shock, preferring indoor corridors when alternatives are comparable.
- The result shows the ordered zone path, estimated total shock, and indoor versus outdoor step count.

## 12. Daily and weekly analytics summary

- History links to a dedicated Exposure Summary screen with Today and Last 7 days modes.
- The daily mode shows current score, risk tier, transition count, peak shock, and a contextual recommendation.
- The weekly mode shows total exposure points, daily average, highest-risk day, critical-day count, a color-coded daily trend chart, and a recommendation for reducing future exposure.

## 13. Offline-first Campus Map weather cache

- Campus Map stores the latest outdoor weather temperature and timestamp in local AsyncStorage after a successful weather request.
- If the network request fails, the map immediately hydrates from the last cached weather value and labels it `Offline cached weather`; if no cache exists, it retains the estimated fallback.
- Indoor zone temperatures and heat-band rendering remain available offline, and the normal live refresh resumes automatically every 30 minutes when connectivity returns.

## 14. Fitness Health Adapter integrations

- Define a shared `FitnessHealthAdapter` interface with platform, availability, permission request, and thermal-event write methods.
- Implement an Apple HealthKit adapter using the `@kingstinct/react-native-healthkit` Expo plugin and native development builds; request write authorization and save qualifying outdoor events as walking workout records with ThermaShield metadata.
- Implement an Android Health Connect adapter using `react-native-health-connect`; initialize the client, request `ExerciseSession` write permission, and insert idempotent walking sessions with thermal context in the title/notes.
- Keep detailed thermal scores and ambient weather in ThermaShield; do not write ambient temperature as body temperature and do not use a new Google Fit integration.
- Add a Profile Health integrations section with native platform status, permission connection action, opt-in automatic export toggle, and privacy copy. Web Preview clearly states that a native build is required.
- Automatically export only qualifying hot/outdoor transitions with shock >= 15 when the user is connected and has enabled auto-log; persist exported event IDs to prevent duplicates.
- Native configuration includes HealthKit entitlement and usage descriptions, Health Connect plugin, and Android min SDK 26 / compile SDK 36 / target SDK 36.

## 15. Plan My Route

- Campus Map exposes a `Plan My Route` action after the user selects From and To zones from the zone picker menus; the Dashboard Campus Map entry copy clearly describes route planning.
- GET `/api/plan-route?user_id=1&from_zone=1&to_zone=6` validates zone IDs, fetches current weather, reads the user’s current daily score and elapsed time since the last transition, and returns a direct prediction.
- The direct prediction includes ΔT, shock score, cumulative daily score, resulting risk level, recovery factor, bonus modifier, direction, and the full formula breakdown.
- The backend compares the direct transition with every eligible `transition` zone used as a buffer, models a 15-minute stop at the buffer, and recommends the lowest combined shock only when the predicted cumulative score reaches High or Critical and the buffered shock is at least 15% lower than direct shock.
- The optional recommendation includes the buffer zone, first and second leg calculations, direct and buffered shock, reduction percentage, and the exact contextual suggestion: `Consider stopping at [zone] for 15 minutes first. This would reduce the shock from X to Y.`
- The Map UI renders a professional prediction card with direct route, ΔT, shock, daily total, risk color, formula, loading/error state, and the optional lower-shock buffer callout.

## 16. Today's Forecast card

- The Dashboard places a `Today's Forecast` card between Quick Stats and the formula-based Timeline section.
- GET `/api/forecast` calls OpenWeatherMap `/data/2.5/forecast` server-side with metric units, uses the next four 3-hour blocks for the next 12 hours, and never exposes the API key to the client.
- The endpoint accepts optional `lat`/`lng`, returns local time labels, predicted outdoor temperature, Δ from a typical 20°C AC room, green/yellow/orange/red severity color, and `highShockRisk: true` when outdoor temperature exceeds 35°C.
- Forecast responses are cached in memory for one hour per rounded coordinate key; the endpoint returns `503 { available: false }` when the API key/provider/data is unavailable.
- The UI renders a compact horizontal row of time blocks with temperature, AC delta, color dot, and a red border plus `⚠️ High shock risk` label for >35°C blocks.
- If forecast loading fails, the Dashboard hides the card without showing an error state or disrupting the rest of the app.
- Production/Preview environments must provide `OPENWEATHERMAP_API_KEY` (or the supported `OPENWEATHER_API_KEY` alias) as a server-side secret for the card to appear; no key is bundled into the mobile client.

## 17. Route-planning automated tests

- Vitest covers direct route ΔT/shock/formula calculation with elapsed-time recovery factors.
- Vitest confirms low-score route plans do not produce an unnecessary intermediate buffer recommendation.
- Vitest confirms High/Critical route plans select an eligible transition zone, model the second leg after a 15-minute stop, enforce at least 15% shock reduction, and include the contextual recommendation copy.
- The OpenWeatherMap secret remains unconfigured until the protected input card is completed; no secret value is stored in source or chat.

## 18. Daily Digest / end-of-day summary

- At 8 PM, or when the user opens the app after 8 PM, the Dashboard displays a Daily Digest overlay once per local calendar day.
- The digest includes today’s total transitions, final cumulative shock score, risk badge, worst transition with from/to/time/shock, peak outdoor temperature, and the contextual Low/Moderate/High/Critical health tip.
- `GET /api/daily-digest/:user_id` returns the digest data from the current daily transition state, including a share-ready text summary.
- The digest has a `Log symptoms` action that opens the existing Symptom Logger and a `Share summary` action that copies the text summary to the clipboard.
- The shown-today marker is stored locally so dismissing or viewing the digest does not repeat it on the same day.

## 19. Anonymous campus peer comparison

- Dashboard places a `Campus Comparison (Anonymous)` widget directly below Quick Stats.
- Backend pre-seeds 100 deterministic synthetic daily scores following a normal distribution with mean 75 and standard deviation 35, clamped to 0–200.
- `GET /api/peer-percentile/:user_id` returns percentile, comparison message, campus average, user score, sample size, and the privacy explanation.
- The widget displays a single lower/higher-than-campus sentence, a green-to-red horizontal percentile bar with the user position marked, campus average, and current score.
- The UI explicitly states: `Compared against anonymised aggregate campus data. No personal information is shared.`

## 20. Exportable weekly health report

- History and Profile/Settings both provide a `Download Weekly Report` action.
- `GET /api/report/:user_id?days=7` returns date range, total transitions, average daily score, highest and lowest score days with risk, frequent symptoms with correlation to high-score days, ML recommendations, and a day-by-day breakdown containing date, score, risk, transitions, and symptoms.
- The frontend renders the response as a branded dark printable HTML report with the ThermaShield shield mark, date range, user name, summary metrics, recommendations, symptom correlations, breakdown table, and the footer `Generated by ThermaShield | Team ShockWave | Awareness tool — not medical advice.`
- The report opens in a new browser tab on web, supports Print / Save PDF, and includes a `Copy Summary` button; native builds use the platform share sheet for the plain-text report.

## 21. Award-level visual redesign

- Redesign only design, motion, copy, and interaction; keep all existing features, APIs, endpoints, and data logic unchanged.
- Use dark #0A0F1C depth with layered navy surfaces, subtle gradients, 1px inner borders, and restrained glassmorphism only on navigation and bottom-sheet-like surfaces.
- Add a risk-reactive ambient gradient orb behind headers that morphs through the current tier accent; use cool blue, teal, amber, orange, and red tier accents consistently.
- Use a strict 12/14/16/20/28/48/72 typography scale, medium tabular hero numbers, uppercase tracking labels, 8px spacing rhythm, 16px screen margins, 20–24px card radii, consistent 1.75px icon language, and no emojis in the UI.
- Dashboard hero is an animated thermal ring with gradient stroke, threshold ticks at 41/81/131, 900ms score count/draw, above-Moderate pulse, tier sentence, and touch tooltip for the next threshold.
- Motion is purposeful: spring-like press states, staggered card entrance where appropriate, short transitions, tier color morphs, touch haptics where supported, and no animation longer than 400ms except the hero; reduced-motion-safe behavior is preserved.
- Dashboard keeps the thermal ring, compact glass quick stats, horizontal snap forecast, timeline, floating alert pill, and hydration indicator while improving hierarchy and copy.
- Campus Map and Plan My Route use the same thermal-gradient surfaces, zone glow, actionable detail treatment, and professional bottom-sheet/card hierarchy.
- All screens retain WCAG AA contrast, 44px touch targets, accessible labels, non-color-only risk communication, screen-reader-friendly summaries, and unchanged functionality.
