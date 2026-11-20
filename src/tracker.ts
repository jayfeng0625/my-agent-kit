import { readFileSync } from "node:fs";
import { join } from "node:path";

export const triageRoles = ["needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix"] as const;

/** One project's ticket tracker as the agent reads it: the two documents `/setup-issue-tracker` writes. */
export type TicketTracker = {
  name: string;
  /** What `docs/agents/issue-tracker.md` holds. */
  issueTracker: string;
  /** What `docs/agents/triage-labels.md` holds. */
  triageLabels: string;
};

const sections = [
  '## When a skill says "publish to the issue tracker"',
  '## When a skill says "fetch the relevant ticket"',
  "## Wayfinding operations",
];
const wayfindingOperations = ["Map", "Child ticket", "Blocking", "Frontier", "Claim", "Resolve"];

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** What the tracker lacks of the sections and names the skills call on. Empty when it conforms. */
export function checkTicketTracker(tracker: TicketTracker): string[] {
  const issueTracker = text(tracker.issueTracker);
  const triageLabels = text(tracker.triageLabels);
  const wayfinding = issueTracker.split("## Wayfinding operations")[1] ?? "";
  return [
    ...sections.filter((section) => !issueTracker.includes(section)).map((section) => `issueTracker lacks the section ${section}`),
    ...wayfindingOperations
      .filter((operation) => wayfinding !== "" && !new RegExp(`\\b${operation}\\b`).test(wayfinding))
      .map((operation) => `Wayfinding operations lacks ${operation}`),
    ...triageRoles.filter((role) => !triageLabels.includes(role)).map((role) => `triageLabels lacks the role ${role}`),
  ];
}

const templates = join(import.meta.dirname, "../skills/setup-issue-tracker");

const fromTemplate = (name: string, file: string) => (): TicketTracker => ({
  name,
  issueTracker: readFileSync(join(templates, file), "utf8"),
  triageLabels: readFileSync(join(templates, "triage-labels.md"), "utf8"),
});

export const github = fromTemplate("GitHub Issues", "issue-tracker-github.md");
export const gitlab = fromTemplate("GitLab Issues", "issue-tracker-gitlab.md");
export const local = fromTemplate("local Markdown", "issue-tracker-local.md");
