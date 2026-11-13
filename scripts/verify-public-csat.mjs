import fs from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const response = await fetch(`${baseUrl}/api/public/metrics`);
const text = await response.text();

console.log(`GET /api/public/metrics: ${response.status}`);
if (response.status !== 200) {
  throw new Error(`Expected public CSAT status 200, received ${response.status}`);
}

const data = JSON.parse(text);
const serialized = JSON.stringify(data).toLowerCase();
const forbiddenPublicText = [
  "fixture contact",
  "fixture company",
  "the team was responsive.",
  "the filing took longer than expected.",
];

for (const forbidden of forbiddenPublicText) {
  if (serialized.includes(forbidden)) {
    throw new Error(`Public response leaked forbidden text: ${forbidden}`);
  }
}

const allowedTopLevelKeys = [
  "ces",
  "completeResponseCount",
  "completionPercent",
  "csat",
  "distribution",
  "inviteResponseRate",
  "inviteResponsesReceived",
  "latestPeriod",
  "nps",
  "overallAvg",
  "period",
  "surveysSent",
  "themes",
  "totalResponses",
  "trend",
  "voicePercent",
  "voiceResponseCount",
].sort();
const actualKeys = Object.keys(data).sort();
if (JSON.stringify(actualKeys) !== JSON.stringify(allowedTopLevelKeys)) {
  throw new Error(`Unexpected public response keys: ${actualKeys.join(", ")}`);
}

const routeSource = await fs.readFile(
  new URL("../app/api/public/metrics/route.ts", import.meta.url),
  "utf8"
);
const querySource = await fs.readFile(
  new URL("../lib/public-csat.ts", import.meta.url),
  "utf8"
);
const combinedSource = `${routeSource}\n${querySource}`;
for (const forbiddenQuery of [
  "db.response.",
  "db.client.",
  "db.responseInsight.",
]) {
  if (combinedSource.includes(forbiddenQuery)) {
    throw new Error(`Public query layer contains ${forbiddenQuery}`);
  }
}

console.log(`overallAvg=${data.overallAvg}`);
console.log(`totalResponses=${data.totalResponses}`);
console.log(`themes=${data.themes.length}`);
console.log("PASS public response contains only aggregate fields");
console.log("PASS public query layer is snapshot-only");
