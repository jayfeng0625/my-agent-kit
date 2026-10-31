#!/bin/sh
# Points ~/.claude/skills/<name> at this checkout for every kit skill and moves poteto-mode
# aside, so the eval runs in the user's own environment against this checkout's skills.
# Writes ~/.claude/skills-eval-backup/restore.sh, which puts every entry back.
set -e
K=$(cd "$(dirname "$0")/../../../skills" && pwd)
B="$HOME/.claude/skills-eval-backup"
[ -e "$B/restore.sh" ] && { echo "already linked; undo with: sh $B/restore.sh"; exit 1; }
mkdir -p "$B"
cd "$HOME/.claude/skills"
R="$B/restore.sh.tmp"
printf '#!/bin/sh\nset -e\ncd "$HOME/.claude/skills"\n' > "$R"
for s in $(ls "$K"); do
  if [ -L "$s" ]; then echo "rm -f '$s' && ln -s '$(readlink "$s")' '$s'" >> "$R"; rm "$s"
  elif [ -e "$s" ]; then mv "$s" "$B/$s"; echo "rm -f '$s' && mv '$B/$s' '$s'" >> "$R"
  else echo "rm -f '$s'" >> "$R"; fi
  ln -s "$K/$s" "$s"
done
if [ -e poteto-mode ]; then mv poteto-mode "$B/poteto-mode"; echo "mv '$B/poteto-mode' poteto-mode" >> "$R"; fi
echo "rm -f '$B/restore.sh'" >> "$R"
mv "$R" "$B/restore.sh"
chmod +x "$B/restore.sh"
echo "linked $(ls "$K" | wc -l | tr -d ' ') skills to $K; undo with: sh $B/restore.sh"
