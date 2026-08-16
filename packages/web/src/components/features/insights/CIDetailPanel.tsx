import type { CIStatusDTO, CIJobDTO } from "@/api/endpoints/insights";
import "@/components/features/insights/CIDetailPanel.css";

type Props = {
  ciStatus: CIStatusDTO;
  onClose: () => void;
};

function duration(
  startedAt: string | null,
  completedAt: string | null
): string {
  if (!startedAt || !completedAt) return "";
  const secs = Math.round(
    (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000
  );
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function conclusionClass(conclusion: string | null, status: string): string {
  if (status === "in_progress" || status === "queued") return "running";
  if (conclusion === "success") return "success";
  if (conclusion === "failure") return "failure";
  if (conclusion === "skipped") return "skipped";
  return "neutral";
}

function conclusionIcon(conclusion: string | null, status: string): string {
  if (status === "in_progress") return "⟳";
  if (status === "queued") return "·";
  if (conclusion === "success") return "✓";
  if (conclusion === "failure") return "✕";
  if (conclusion === "skipped") return "–";
  return "?";
}

function JobRow({ job }: { job: CIJobDTO }) {
  const cls = conclusionClass(job.conclusion, job.status);
  const dur = duration(job.startedAt, job.completedAt);
  const failedSteps = job.steps.filter((s) => s.conclusion === "failure");
  const relevantSteps = job.conclusion === "failure" ? job.steps : [];

  return (
    <div className={`ci-detail-panel__job ci-detail-panel__job--${cls}`}>
      <div className="ci-detail-panel__job-header">
        <span
          className={`ci-detail-panel__badge ci-detail-panel__badge--${cls}`}
        >
          {conclusionIcon(job.conclusion, job.status)}
        </span>
        <span className="ci-detail-panel__job-name">{job.name}</span>
        {dur && <span className="ci-detail-panel__duration">{dur}</span>}
        {failedSteps.length > 0 && (
          <span className="ci-detail-panel__fail-count">
            {failedSteps.length} step{failedSteps.length > 1 ? "s" : ""} failed
          </span>
        )}
      </div>

      {relevantSteps.length > 0 && (
        <div className="ci-detail-panel__steps">
          {relevantSteps.map((step) => {
            const sc = conclusionClass(step.conclusion, step.status);
            return (
              <div
                key={step.number}
                className={`ci-detail-panel__step ci-detail-panel__step--${sc}`}
              >
                <span
                  className={`ci-detail-panel__badge ci-detail-panel__badge--${sc}`}
                >
                  {conclusionIcon(step.conclusion, step.status)}
                </span>
                <span className="ci-detail-panel__step-name">{step.name}</span>
                <span className="ci-detail-panel__duration">
                  {duration(step.startedAt, step.completedAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CIDetailPanel({ ciStatus, onClose }: Props) {
  const { run, jobs } = ciStatus;

  if (!run) {
    return (
      <div className="ci-detail-panel ci-detail-panel--empty">
        <span className="ci-detail-panel__empty-msg">No CI run found</span>
        <button className="ci-detail-panel__close" onClick={onClose}>
          ✕
        </button>
      </div>
    );
  }

  const runAt = new Date(run.createdAt).toLocaleString();
  const cls = conclusionClass(run.conclusion, run.status);

  return (
    <div className="ci-detail-panel">
      <div className="ci-detail-panel__header">
        <span
          className={`ci-detail-panel__badge ci-detail-panel__badge--${cls} ci-detail-panel__badge--lg`}
        >
          {conclusionIcon(run.conclusion, run.status)}
        </span>
        <span className="ci-detail-panel__run-name">{run.name}</span>
        <span
          className={`ci-detail-panel__conclusion ci-detail-panel__conclusion--${cls}`}
        >
          {run.status !== "completed" ? run.status : (run.conclusion ?? "—")}
        </span>
        <span className="ci-detail-panel__run-at">{runAt}</span>
        <button className="ci-detail-panel__close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="ci-detail-panel__body">
        {jobs.length === 0 && (
          <span className="ci-detail-panel__empty-msg">
            No job data available
          </span>
        )}
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
