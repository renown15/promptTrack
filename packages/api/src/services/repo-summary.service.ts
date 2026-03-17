import { insightService } from "@/services/insight.service.js";
import { discoveryService } from "@/services/discovery.service.js";
import { ollamaService } from "@/services/ollama.service.js";
import type { MetricResult } from "@/services/insight.cache.js";

function buildPrompt(data: {
  fileCount: number;
  lineCount: number;
  modifiedCount: number;
  untrackedCount: number;
  coverage: { linesPct: number; reportedAt: string } | null;
  lint: { errors: number; warnings: number; reportedAt: string } | null;
  analyzed: number;
  metricHealth: Record<
    string,
    { green: number; amber: number; red: number; error: number }
  >;
  badFiles: { path: string; issues: string[] }[];
  largestFiles: { path: string; lines: number; vsAvg: string }[];
}): string {
  const lines: string[] = [];
  lines.push(
    `Files: ${data.fileCount} (${data.lineCount.toLocaleString()} lines)`
  );
  lines.push(
    data.coverage
      ? `Coverage: ${data.coverage.linesPct}% (last run: ${new Date(data.coverage.reportedAt).toLocaleString()})`
      : "Coverage: no data"
  );
  lines.push(
    data.lint
      ? `Lint: ${data.lint.errors} errors, ${data.lint.warnings} warnings (last run: ${new Date(data.lint.reportedAt).toLocaleString()})`
      : "Lint: no data"
  );
  if (data.modifiedCount || data.untrackedCount)
    lines.push(
      `Git: ${data.modifiedCount} modified, ${data.untrackedCount} untracked`
    );
  lines.push(`AI metrics analyzed: ${data.analyzed}/${data.fileCount} files`);

  for (const [name, h] of Object.entries(data.metricHealth)) {
    lines.push(
      `  ${name}: ${h.green} good, ${h.amber} warn, ${h.red} critical, ${h.error} failed`
    );
  }

  if (data.badFiles.length) {
    lines.push("Files needing attention:");
    for (const f of data.badFiles)
      lines.push(`  ${f.path}: ${f.issues.join(", ")}`);
  }

  if (data.largestFiles.length) {
    lines.push("Top 10 largest files (vs avg):");
    for (const f of data.largestFiles)
      lines.push(`  ${f.path}: ${f.lines} lines (${f.vsAvg})`);
  }

  return `You are a code quality assistant. Summarise the repo health in 2-4 concise sentences. Be direct and specific. Highlight the biggest issues first. If things look healthy, say so briefly.

${lines.join("\n")}

Respond with plain text only. No markdown. 2-4 sentences.`;
}

export const repoSummaryService = {
  async generate(collectionId: string, directory: string): Promise<string> {
    const [state, aggregate, cfg] = await Promise.all([
      insightService.getState(collectionId),
      discoveryService.getAggregateStats(directory),
      ollamaService.getConfig(),
    ]);

    const files = state.files;
    const lineCount = files.reduce((s, f) => s + f.lineCount, 0);
    const metricNames = ollamaService
      .enabledMetrics(cfg.metrics ?? {})
      .map((m) => m.name);

    const metricHealth: Record<
      string,
      { green: number; amber: number; red: number; error: number }
    > = {};
    for (const name of metricNames)
      metricHealth[name] = { green: 0, amber: 0, red: 0, error: 0 };

    let analyzed = 0;
    const badFiles: { path: string; issues: string[] }[] = [];

    for (const f of files) {
      const fileIssues: string[] = [];
      let fullyAnalyzed = metricNames.length > 0;
      for (const name of metricNames) {
        const v = f.metrics[name];
        const h = metricHealth[name];
        if (!h) continue;
        if (!v || v === "pending") {
          fullyAnalyzed = false;
          continue;
        }
        if (typeof v === "object" && "error" in v) {
          h.error++;
          fileIssues.push(`${name}:error`);
        } else if (typeof v === "object" && "status" in v) {
          h[(v as MetricResult).status]++;
          if ((v as MetricResult).status === "red")
            fileIssues.push(`${name}:red`);
        }
      }
      if (fullyAnalyzed) analyzed++;
      if (fileIssues.length && badFiles.length < 6)
        badFiles.push({ path: f.relativePath, issues: fileIssues });
    }

    const avgLines = files.length ? Math.round(lineCount / files.length) : 0;
    const largestFiles = [...files]
      .sort((a, b) => b.lineCount - a.lineCount)
      .slice(0, 10)
      .map((f) => {
        const ratio = avgLines ? f.lineCount / avgLines : 1;
        const vsAvg =
          ratio >= 2
            ? `${ratio.toFixed(1)}× avg`
            : `+${Math.round((ratio - 1) * 100)}% vs avg`;
        return { path: f.relativePath, lines: f.lineCount, vsAvg };
      });

    const prompt = buildPrompt({
      fileCount: files.length,
      lineCount,
      modifiedCount: files.filter((f) => f.gitStatus === "modified").length,
      untrackedCount: files.filter((f) => f.gitStatus === "untracked").length,
      coverage: aggregate.coverage,
      lint: aggregate.lint,
      analyzed,
      metricHealth,
      badFiles,
      largestFiles,
    });

    const res = await fetch(`${cfg.endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.model, prompt, stream: false }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = (await res.json()) as { response: string };
    return data.response.trim();
  },
};
