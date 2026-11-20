import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const skillsDir = join(import.meta.dirname, "../skills");
const packaging = new Set(["SKILL.md", "LICENSE", "agents"]);

/** A skill as prompt text: the `SKILL.md` body, then where its supporting files are when it has any. */
export function defineSkill(name: string): () => string {
  const dir = join(skillsDir, name);
  return () => {
    const body = readFileSync(join(dir, "SKILL.md"), "utf8").replace(/^---\n[\s\S]*?\n---\n+/, "").trimEnd();
    const hasSupportingFiles = readdirSync(dir).some((entry) => !packaging.has(entry));
    const pointer = `The skill's directory is \`${dir}\`. Read the relative paths it references from there.`;
    return hasSupportingFiles ? `${body}\n\n${pointer}\n` : `${body}\n`;
  };
}
