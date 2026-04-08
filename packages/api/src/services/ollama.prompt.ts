import type { MetricDefinition } from "@/services/ollama.metrics.js";
import type { MetricResult } from "@/services/insight.cache.js";

const MAX_CONTENT_CHARS = 6000;

export function buildPrompt(
  metric: MetricDefinition,
  relativePath: string,
  lineCount: number,
  fileType: string,
  content: string
): string {
  const body =
    content.length > MAX_CONTENT_CHARS
      ? content.slice(0, MAX_CONTENT_CHARS) + "\n... (truncated)"
      : content;

  const responseFormat = metric.trackSensitiveRefs
    ? `{"status":"green","summary":"one sentence","sensitiveRefs":["path/to/file","*.ext"]}`
    : `{"status":"green","summary":"one sentence"}`;

  const extraInstruction = metric.trackSensitiveRefs
    ? `\nsensitiveRefs must be an array of file paths or glob patterns referenced in this code that should be excluded from version control (e.g. ".env", ".env.local", "secrets.json", "*.pem"). Use [] if none found.`
    : "";

  return `Review this file for: ${metric.description}

File: ${relativePath} (${lineCount} lines, type: .${fileType})

\`\`\`
${body}
\`\`\`

Respond with ONLY this JSON, no other text:
${responseFormat}

status must be "green" (good), "amber" (minor concerns), or "red" (significant issues).${extraInstruction}`;
}

export function parseMetricResponse(raw: string): MetricResult {
  const trimmed = raw.trim();
  let obj: unknown;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match)
      throw new Error(`No JSON in response: ${trimmed.slice(0, 120)}`);
    obj = JSON.parse(match[0]);
  }
  const parsed = obj as {
    status?: string;
    summary?: string;
    sensitiveRefs?: unknown;
  };
  const status = parsed.status as "green" | "amber" | "red";
  if (!["green", "amber", "red"].includes(status))
    throw new Error(`Unexpected status value: ${JSON.stringify(status)}`);
  const result: MetricResult = { status, summary: parsed.summary ?? "" };
  if (Array.isArray(parsed.sensitiveRefs)) {
    result.sensitiveRefs = parsed.sensitiveRefs.filter(
      (r): r is string => typeof r === "string" && r.length > 0
    );
  }
  return result;
}
