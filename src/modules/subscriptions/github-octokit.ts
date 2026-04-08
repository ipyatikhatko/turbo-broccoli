import type { Octokit } from "octokit";

import { GithubRateLimitedError, type IGitHubRepos } from "./domain.ts";

function getErrorStatus(err: unknown): number | undefined {
  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    return (err as { status: number }).status;
  }
  return undefined;
}

export function createGitHubRepos(octokit: Octokit): IGitHubRepos {
  return {
    async repoExists(owner, repo) {
      try {
        const res = await octokit.request("GET /repos/{owner}/{repo}", {
          owner,
          repo,
        });
        return res.status === 200;
      } catch (err: unknown) {
        const status = getErrorStatus(err);
        if (status === 404) return false;
        if (status === 429) throw new GithubRateLimitedError();
        throw err;
      }
    },
  };
}
