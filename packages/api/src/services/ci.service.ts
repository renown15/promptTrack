import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com[/:]([^/\s]+)\/([^/\s.]+)(\.git)?/);
  if (m) return { owner: m[1]!, repo: m[2]! };
  return null;
}

async function getRemoteUrl(dir: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", dir, "remote", "get-url", "origin"],
      { timeout: 5000 }
    );
    return stdout.trim();
  } catch {
    return null;
  }
}

function makeHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export interface CIStepDTO {
  number: number;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CIJobDTO {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  steps: CIStepDTO[];
}

export interface CIRunDTO {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  createdAt: string;
  htmlUrl: string;
}

export interface CIStatusDTO {
  run: CIRunDTO | null;
  jobs: CIJobDTO[];
  error: "no_remote" | "not_github" | "api_error" | null;
}

type GHRun = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
};

type GHJob = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps: {
    number: number;
    name: string;
    status: string;
    conclusion: string | null;
    started_at: string | null;
    completed_at: string | null;
  }[];
};

export const ciService = {
  async getStatus(directory: string): Promise<CIStatusDTO> {
    const remoteUrl = await getRemoteUrl(directory);
    if (!remoteUrl) return { run: null, jobs: [], error: "no_remote" };

    const parsed = parseGitHubRepo(remoteUrl);
    if (!parsed) return { run: null, jobs: [], error: "not_github" };

    const { owner, repo } = parsed;
    const headers = makeHeaders();

    try {
      const runsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=5`,
        { headers }
      );
      if (!runsRes.ok) return { run: null, jobs: [], error: "api_error" };

      const runsData = (await runsRes.json()) as { workflow_runs: GHRun[] };
      const latest = runsData.workflow_runs?.[0];
      if (!latest) return { run: null, jobs: [], error: null };

      const run: CIRunDTO = {
        id: latest.id,
        name: latest.name,
        status: latest.status,
        conclusion: latest.conclusion,
        createdAt: latest.created_at,
        htmlUrl: latest.html_url,
      };

      const jobsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs/${latest.id}/jobs?per_page=30`,
        { headers }
      );
      const jobs: CIJobDTO[] = [];
      if (jobsRes.ok) {
        const jobsData = (await jobsRes.json()) as { jobs: GHJob[] };
        for (const j of jobsData.jobs ?? []) {
          jobs.push({
            id: j.id,
            name: j.name,
            status: j.status,
            conclusion: j.conclusion,
            startedAt: j.started_at,
            completedAt: j.completed_at,
            steps: (j.steps ?? []).map((s) => ({
              number: s.number,
              name: s.name,
              status: s.status,
              conclusion: s.conclusion,
              startedAt: s.started_at,
              completedAt: s.completed_at,
            })),
          });
        }
      }

      return { run, jobs, error: null };
    } catch {
      return { run: null, jobs: [], error: "api_error" };
    }
  },
};
