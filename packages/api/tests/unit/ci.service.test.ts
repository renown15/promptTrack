import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "child_process";
import { ciService } from "@/services/ci.service.js";

type ExecCallback = (err: Error | null, result?: { stdout: string }) => void;

function stubGit(stdout: string) {
  vi.mocked(execFile).mockImplementation(((
    _: unknown,
    __: unknown,
    ___: unknown,
    cb: ExecCallback
  ) => {
    cb(null, { stdout });
  }) as typeof execFile);
}

function stubGitFail() {
  vi.mocked(execFile).mockImplementation(((
    _: unknown,
    __: unknown,
    ___: unknown,
    cb: ExecCallback
  ) => {
    cb(new Error("git failed"));
  }) as typeof execFile);
}

describe("ciService.getStatus", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns no_remote when git remote fails", async () => {
    stubGitFail();
    const result = await ciService.getStatus("/some/dir");
    expect(result).toEqual({ run: null, jobs: [], error: "no_remote" });
  });

  it("returns not_github for non-GitHub remote", async () => {
    stubGit("https://gitlab.com/user/repo.git\n");
    const result = await ciService.getStatus("/some/dir");
    expect(result).toEqual({ run: null, jobs: [], error: "not_github" });
  });

  it("returns api_error when GitHub runs API returns non-ok", async () => {
    stubGit("https://github.com/owner/repo.git\n");
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    const result = await ciService.getStatus("/some/dir");
    expect(result).toEqual({ run: null, jobs: [], error: "api_error" });
  });

  it("returns null run when workflow_runs is empty", async () => {
    stubGit("https://github.com/owner/repo.git\n");
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workflow_runs: [] }),
    } as Response);
    const result = await ciService.getStatus("/some/dir");
    expect(result).toEqual({ run: null, jobs: [], error: null });
  });

  it("returns run and jobs on success", async () => {
    stubGit("git@github.com:owner/repo.git\n");

    const mockRun = {
      id: 123,
      name: "CI",
      status: "completed",
      conclusion: "success",
      created_at: "2024-01-01T00:00:00Z",
      html_url: "https://github.com/owner/repo/actions/runs/123",
    };
    const mockJob = {
      id: 456,
      name: "build",
      status: "completed",
      conclusion: "success",
      started_at: "2024-01-01T00:01:00Z",
      completed_at: "2024-01-01T00:02:00Z",
      steps: [
        {
          number: 1,
          name: "checkout",
          status: "completed",
          conclusion: "success",
          started_at: "2024-01-01T00:01:00Z",
          completed_at: "2024-01-01T00:01:30Z",
        },
      ],
    };

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflow_runs: [mockRun] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: [mockJob] }),
      } as Response);

    const result = await ciService.getStatus("/some/dir");
    expect(result.error).toBeNull();
    expect(result.run?.id).toBe(123);
    expect(result.run?.name).toBe("CI");
    expect(result.run?.conclusion).toBe("success");
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].name).toBe("build");
    expect(result.jobs[0].steps).toHaveLength(1);
    expect(result.jobs[0].steps[0].name).toBe("checkout");
  });

  it("returns run with empty jobs when jobs API fails", async () => {
    stubGit("https://github.com/owner/repo\n");

    const mockRun = {
      id: 789,
      name: "CI",
      status: "in_progress",
      conclusion: null,
      created_at: "2024-01-01T00:00:00Z",
      html_url: "https://github.com/owner/repo/actions/runs/789",
    };

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflow_runs: [mockRun] }),
      } as Response)
      .mockResolvedValueOnce({ ok: false } as Response);

    const result = await ciService.getStatus("/some/dir");
    expect(result.run?.id).toBe(789);
    expect(result.jobs).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("returns api_error when fetch throws", async () => {
    stubGit("https://github.com/owner/repo\n");
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));
    const result = await ciService.getStatus("/some/dir");
    expect(result).toEqual({ run: null, jobs: [], error: "api_error" });
  });
});
