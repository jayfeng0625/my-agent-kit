import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkTicketTracker, type TicketTracker } from "./tracker.ts";

/** What a skill can be handed from outside itself, one key per seam. */
export type Context = { ticketTracker: TicketTracker };

/** A skill takes the context it declares, and no argument when it declares none. */
export type Skill<Needs extends keyof Context = never> = (
  ...args: [Needs] extends [never] ? [] : [context?: Partial<Pick<Context, Needs>>]
) => string;

const skillsDir = join(import.meta.dirname, "../skills");
const packaging = new Set(["SKILL.md", "LICENSE", "agents"]);

function ticketTrackerDocuments(tracker: TicketTracker): string[] {
  const problems = checkTicketTracker(tracker);
  if (problems.length > 0) throw new Error(`ticket tracker ${tracker.name}: ${problems.join("; ")}`);
  return [tracker.issueTracker.trim(), tracker.triageLabels.trim()];
}

/**
 * A skill as prompt text: the `SKILL.md` body, where its supporting files are when it has any,
 * then the documents of each context value it is given.
 */
export function defineSkill<Needs extends keyof Context = never>(name: string, ...needs: Needs[]): Skill<Needs> {
  const dir = join(skillsDir, name);
  const render = (context: Partial<Context> = {}) => {
    const undeclared = Object.keys(context).find((key) => !needs.includes(key as Needs));
    if (undeclared !== undefined) throw new Error(`${name} takes no ${undeclared}`);
    const body = readFileSync(join(dir, "SKILL.md"), "utf8").replace(/^---\n[\s\S]*?\n---\n+/, "").trimEnd();
    const hasSupportingFiles = readdirSync(dir).some((entry) => !packaging.has(entry));
    const pointer = `The skill's directory is \`${dir}\`. Read the relative paths it references from there.`;
    const parts = [hasSupportingFiles ? `${body}\n\n${pointer}` : body];
    if (context.ticketTracker !== undefined) parts.push(...ticketTrackerDocuments(context.ticketTracker));
    return `${parts.join("\n\n---\n\n")}\n`;
  };
  return render as Skill<Needs>;
}
