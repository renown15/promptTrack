import type { ServerResponse } from "http";
import { insightEmitter } from "@/services/insight.emitter.js";
import { insightService } from "@/services/insight.service.js";

export function attachInsightSSE(
  id: string,
  res: ServerResponse,
  onClose: () => void
): void {
  function send(event: string, data: unknown) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  send("state", insightService.getState(id));

  const onFileUpdated = (data: unknown) => send("file_updated", data);
  const onFileRemoved = (data: unknown) => send("file_removed", data);
  const onScanComplete = (data: unknown) => send("scan_complete", data);
  const onGitignoreUpdated = (data: unknown) => send("gitignore_updated", data);
  const onLlmCallStart = (data: unknown) => send("llm_call_start", data);
  const onLlmCallEnd = (data: unknown) => send("llm_call_end", data);
  const onAnalysisComplete = (data: unknown) => send("analysis_complete", data);
  const onDocAnalysis = (data: unknown) => send("doc_analysis", data);

  insightEmitter.on(`file_updated:${id}`, onFileUpdated);
  insightEmitter.on(`file_removed:${id}`, onFileRemoved);
  insightEmitter.on(`scan_complete:${id}`, onScanComplete);
  insightEmitter.on(`gitignore_updated:${id}`, onGitignoreUpdated);
  insightEmitter.on(`llm_call_start:${id}`, onLlmCallStart);
  insightEmitter.on(`llm_call_end:${id}`, onLlmCallEnd);
  insightEmitter.on(`analysis_complete:${id}`, onAnalysisComplete);
  insightEmitter.on(`doc_analysis:${id}`, onDocAnalysis);

  res.on("close", () => {
    insightEmitter.off(`file_updated:${id}`, onFileUpdated);
    insightEmitter.off(`file_removed:${id}`, onFileRemoved);
    insightEmitter.off(`scan_complete:${id}`, onScanComplete);
    insightEmitter.off(`gitignore_updated:${id}`, onGitignoreUpdated);
    insightEmitter.off(`llm_call_start:${id}`, onLlmCallStart);
    insightEmitter.off(`llm_call_end:${id}`, onLlmCallEnd);
    insightEmitter.off(`analysis_complete:${id}`, onAnalysisComplete);
    insightEmitter.off(`doc_analysis:${id}`, onDocAnalysis);
    res.end();
    onClose();
  });
}
