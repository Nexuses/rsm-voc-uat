import fs from "node:fs";

const requiredFiles = ["AGENTS.md", "PROJECT_BRIEF.md", "MEMORY.md"];
const requiredBriefSections = [
  "## Binding Rules",
  "## Application Structure",
  "## User Flows",
  "## API Inventory",
  "## Database",
  "## Environment And Credentials",
  "## Security Boundaries",
  "## Verification",
  "## Deployment",
];
const requiredMemorySections = [
  "## Current State",
  "## Operational Snapshot",
  "## Active Architecture Decisions",
  "## Known Follow-Ups",
  "## Task History",
];
const forbiddenPatterns = [
  { label: "OpenAI key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  {
    label: "Postgres connection string",
    pattern: /\bpostgres(?:ql)?:\/\/[^\s<>"'`]+/i,
  },
  {
    label: "assigned environment secret",
    pattern:
      /^(?:DATABASE_URL|OPENAI_API_KEY|ELEVENLABS_WEBHOOK_SECRET|ELEVENLABS_API_KEY|NEXTAUTH_SECRET|SENDGRID_API_KEY)=\S+/m,
  },
];

const errors = [];
const contents = new Map();

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    errors.push(`Missing ${file}`);
    continue;
  }
  contents.set(file, fs.readFileSync(file, "utf8"));
}

const agents = contents.get("AGENTS.md") ?? "";
if (!agents.includes("Read `PROJECT_BRIEF.md` in full.")) {
  errors.push("AGENTS.md does not require PROJECT_BRIEF.md to be read");
}
if (!agents.includes("Read `MEMORY.md` in full.")) {
  errors.push("AGENTS.md does not require MEMORY.md to be read");
}
if (!agents.includes("Update `MEMORY.md`")) {
  errors.push("AGENTS.md does not require MEMORY.md updates");
}
if (!agents.includes("## After Context Reset Or Handoff")) {
  errors.push("AGENTS.md does not define context recovery");
}

const brief = contents.get("PROJECT_BRIEF.md") ?? "";
for (const section of requiredBriefSections) {
  if (!brief.includes(section)) {
    errors.push(`PROJECT_BRIEF.md is missing ${section}`);
  }
}

const memory = contents.get("MEMORY.md") ?? "";
for (const section of requiredMemorySections) {
  if (!memory.includes(section)) {
    errors.push(`MEMORY.md is missing ${section}`);
  }
}

for (const [file, content] of contents) {
  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(content)) {
      errors.push(`${file} appears to contain a ${label}`);
    }
  }
}

if (errors.length) {
  console.error("Project memory verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Project memory verified: required files, sections, rules, and secret checks passed."
);
