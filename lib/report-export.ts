import { Platform, Share } from "react-native";

export type ReportData = {
  userName: string;
  days: number;
  dateRange: { start: string; end: string };
  totalTransitions: number;
  averageDailyScore: number;
  highestScoreDay: { date: string; score: number; risk: string } | null;
  lowestScoreDay: { date: string; score: number; risk: string } | null;
  frequentSymptoms: Array<{ name: string; count: number; correlationToHighScoreDays: number }>;
  recommendations: string[];
  breakdown: Array<{ date: string; score: number; risk: string; transitions: number; symptoms: string[] }>;
  plainText: string;
};

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export const reportHtml = (report: ReportData) => {
  const copyPayload = JSON.stringify(report.plainText).replaceAll("</script", "<\\/script");
  const rows = report.breakdown.map((day) => `<tr><td>${escapeHtml(day.date)}</td><td>${day.score.toFixed(1)}</td><td><span class="risk risk-${escapeHtml(day.risk)}">${escapeHtml(day.risk)}</span></td><td>${day.transitions}</td><td>${escapeHtml(day.symptoms.join(" · ") || "—")}</td></tr>`).join("");
  const symptoms = report.frequentSymptoms.length ? report.frequentSymptoms.map((item) => `<li><strong>${escapeHtml(item.name)}</strong><span>${item.count} day${item.count === 1 ? "" : "s"} · correlation ${item.correlationToHighScoreDays.toFixed(2)}</span></li>`).join("") : "<li><strong>No symptoms logged</strong><span>Continue checking in after difficult days.</span></li>";
  const recommendations = report.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ThermaShield — Personal Thermal Exposure Report</title><style>
    :root{--bg:#14110f;--surface:#201a16;--surface2:#2a211b;--text:#f5eadb;--muted:#aa9a8c;--teal:#b7c9a8;--copper:#d99a68;--border:#49382d;--green:#5aab73;--amber:#d9a45b;--red:#d95757}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.page{max-width:980px;margin:0 auto;padding:48px 28px 64px}.brand{display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--border);padding-bottom:24px}.mark{width:48px;height:54px;display:grid;place-items:center;background:linear-gradient(145deg,var(--teal),var(--copper));color:#17110d;font-weight:950;clip-path:polygon(50% 0,92% 16%,84% 72%,50% 100%,16% 72%,8% 16%)}.eyebrow{color:var(--teal);font-size:11px;font-weight:900;letter-spacing:2px}.brand h1{font-size:30px;line-height:1.1;margin:4px 0 0}.meta{color:var(--muted);margin-top:8px}.actions{display:flex;gap:10px;margin:28px 0}.button{border:1px solid var(--border);border-radius:10px;padding:11px 16px;background:var(--surface2);color:var(--text);font-weight:800;cursor:pointer}.button.primary{background:var(--teal);color:#17110d;border-color:var(--teal)}.section{margin-top:30px}.section h2{font-size:18px;margin:0 0 14px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px}.metric .value{font-size:25px;font-weight:950}.metric .label{font-size:10px;color:var(--muted);font-weight:800;letter-spacing:1px;margin-top:4px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px}.panel h3{font-size:14px;margin:0 0 12px;color:var(--teal)}ul{padding-left:20px;margin:0}li{margin:9px 0}li span{display:block;color:var(--muted);font-size:12px}table{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden}th,td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--border)}th{color:var(--teal);font-size:10px;letter-spacing:1px}td{color:var(--text);font-size:13px}.risk{display:inline-block;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:900;text-transform:uppercase}.risk-low{background:#163b2a;color:var(--green)}.risk-moderate{background:#3b3211;color:var(--amber)}.risk-high,.risk-critical{background:#411a21;color:var(--red)}.footer{border-top:1px solid var(--border);color:var(--muted);font-size:11px;margin-top:40px;padding-top:16px}@media print{body{background:#fff;color:#111}.page{max-width:none;padding:20px}.panel,table,.metric{background:#fff;border-color:#bbb}.brand h1,.section h2,.metric .value,td{color:#111}.button{display:none}.footer{color:#555}}@media(max-width:680px){.page{padding:28px 16px}.metrics{grid-template-columns:repeat(2,1fr)}.columns{grid-template-columns:1fr}table{font-size:12px}th,td{padding:8px 6px}}
  </style></head><body><main class="page"><header class="brand"><div class="mark">TS</div><div><div class="eyebrow">THERMASHIELD · TEAM SHOCKWAVE</div><h1>Personal Thermal Exposure Report</h1><div class="meta">${escapeHtml(report.dateRange.start)} to ${escapeHtml(report.dateRange.end)} · ${escapeHtml(report.userName)}</div></div></header><div class="actions"><button class="button primary" onclick="navigator.clipboard.writeText(${copyPayload}).then(()=>{this.textContent='Copied'})">Copy Summary</button><button class="button" onclick="window.print()">Print / Save PDF</button></div><section class="section metrics"><div class="metric"><div class="value">${report.totalTransitions}</div><div class="label">TOTAL TRANSITIONS</div></div><div class="metric"><div class="value">${report.averageDailyScore.toFixed(1)}</div><div class="label">AVERAGE DAILY SCORE</div></div><div class="metric"><div class="value">${report.highestScoreDay ? report.highestScoreDay.score.toFixed(1) : "—"}</div><div class="label">HIGHEST SCORE</div></div><div class="metric"><div class="value">${report.lowestScoreDay ? report.lowestScoreDay.score.toFixed(1) : "—"}</div><div class="label">LOWEST SCORE</div></div></section><section class="section columns"><div class="panel"><h3>Highest score day</h3><strong>${report.highestScoreDay ? `${escapeHtml(report.highestScoreDay.date)} · ${report.highestScoreDay.score.toFixed(1)}` : "—"}</strong><div class="meta">${escapeHtml(report.highestScoreDay?.risk ?? "No data")}</div></div><div class="panel"><h3>Lowest score day</h3><strong>${report.lowestScoreDay ? `${escapeHtml(report.lowestScoreDay.date)} · ${report.lowestScoreDay.score.toFixed(1)}` : "—"}</strong><div class="meta">${escapeHtml(report.lowestScoreDay?.risk ?? "No data")}</div></div></section><section class="section columns"><div class="panel"><h3>Symptoms & high-score correlation</h3><ul>${symptoms}</ul></div><div class="panel"><h3>Personal recommendations</h3><ul>${recommendations}</ul></div></section><section class="section"><h2>Day-by-day breakdown</h2><table><thead><tr><th>DATE</th><th>SCORE</th><th>RISK</th><th>TRANSITIONS</th><th>SYMPTOMS</th></tr></thead><tbody>${rows}</tbody></table></section><footer class="footer">Generated by ThermaShield | Team ShockWave | Awareness tool — not medical advice.</footer></main></body></html>`;
};

export async function exportWeeklyReport(userName: string, days = 7) {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
  const response = await fetch(`${base}/api/report/1?days=${days}&name=${encodeURIComponent(userName)}`);
  if (!response.ok) throw new Error("Report generation failed");
  const report = await response.json() as ReportData;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const url = URL.createObjectURL(new Blob([reportHtml(report)], { type: "text/html" }));
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } else {
    await Share.share({ title: "ThermaShield — Personal Thermal Exposure Report", message: report.plainText });
  }
  return report;
}
