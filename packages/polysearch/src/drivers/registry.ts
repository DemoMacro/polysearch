import type { Driver } from "../types";
import duckduckgoDriver from "../drivers/duckduckgo";
import googleDriver from "../drivers/google";
import googleCSEDriver from "../drivers/google-cse";
import npmDriver from "../drivers/npm";
import githubRepoDriver from "../drivers/github-repo";
import githubCodeDriver from "../drivers/github-code";
import githubIssueDriver from "../drivers/github-issue";
import githubCommitDriver from "../drivers/github-commit";
import githubUserDriver from "../drivers/github-user";
import githubTopicDriver from "../drivers/github-topic";
import githubLabelDriver from "../drivers/github-label";
import polyDriver from "../drivers/poly";

// All available driver names
export const DRIVER_NAMES = [
  "duckduckgo",
  "google",
  "google-cse",
  "npm",
  "github-repo",
  "github-code",
  "github-issue",
  "github-commit",
  "github-user",
  "github-topic",
  "github-label",
  "poly",
] as const;

export type DriverName = (typeof DRIVER_NAMES)[number];

// Create a driver instance by name
export function createDriver(name: string): Driver {
  switch (name) {
    case "duckduckgo":
      return duckduckgoDriver();
    case "google":
      return googleDriver();
    case "google-cse":
      return googleCSEDriver({ cx: process.env.GOOGLE_CSE_CX || "" });
    case "npm":
      return npmDriver();
    case "github-repo":
      return githubRepoDriver({ token: process.env.GITHUB_TOKEN });
    case "github-code":
      return githubCodeDriver({ token: process.env.GITHUB_TOKEN });
    case "github-issue":
      return githubIssueDriver({ token: process.env.GITHUB_TOKEN });
    case "github-commit":
      return githubCommitDriver({ token: process.env.GITHUB_TOKEN });
    case "github-user":
      return githubUserDriver({ token: process.env.GITHUB_TOKEN });
    case "github-topic":
      return githubTopicDriver({ token: process.env.GITHUB_TOKEN });
    case "github-label":
      return githubLabelDriver({ token: process.env.GITHUB_TOKEN });
    default:
      return duckduckgoDriver();
  }
}

// Build a poly driver from a list of driver names
export function createPolyDriver(names: string[]): Driver {
  const drivers = names.map((name) => ({
    driver: createDriver(name),
    weight: 1 / names.length,
  }));

  return polyDriver({ drivers });
}

// Default poly driver: duckduckgo + google-cse (if GOOGLE_CSE_CX is set)
export function createDefaultPolyDriver(): Driver {
  const names: string[] = ["duckduckgo"];

  if (process.env.GOOGLE_CSE_CX) {
    names.push("google-cse");
  }

  return createPolyDriver(names);
}
