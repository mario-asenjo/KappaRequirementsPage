#!/usr/bin/env bash
# Crea el epic PvE-first y sus sub-issues a partir de docs/pve-first/issues/*.md
# (issue-first). Requiere GitHub CLI autenticado con permisos de escritura.
#
# Uso:
#   bash scripts/create-pve-first-issues.sh              # crea issues y las enlaza al epic
#   bash scripts/create-pve-first-issues.sh --dry-run    # solo muestra lo que haria
#   bash scripts/create-pve-first-issues.sh --close-superseded
#       ademas comenta y cierra las issues antiguas indicadas en `supersedes:`
set -euo pipefail

REPO="${REPO:-mario-asenjo/KappaRequirementsPage}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/docs/pve-first/issues"
DRY_RUN=false
CLOSE_SUPERSEDED=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --close-superseded) CLOSE_SUPERSEDED=true ;;
    *) echo "Argumento desconocido: $arg" >&2; exit 1 ;;
  esac
done

field() { sed -n "2,/^---$/p" "$1" | sed -n "s/^$2: //p" | head -n1; }
body() { awk 'BEGIN{n=0} /^---$/{n++; next} n>=2{print}' "$1"; }

existing_labels="$(gh label list -R "$REPO" --limit 300 --json name --jq '.[].name')"
ensure_labels() {
  local IFS=','
  for label in $1; do
    if ! grep -qx "$label" <<<"$existing_labels"; then
      echo "  creando label que falta: $label"
      $DRY_RUN || gh label create "$label" -R "$REPO" >/dev/null
      existing_labels+=$'\n'"$label"
    fi
  done
}

create_issue() {
  local file="$1" title labels label_args=()
  title="$(field "$file" title)"
  labels="$(field "$file" labels)"
  ensure_labels "$labels"
  local IFS=','
  for label in $labels; do label_args+=(--label "$label"); done
  unset IFS
  if $DRY_RUN; then
    echo "[dry-run] $title" >&2
    echo "0"
    return
  fi
  gh issue create -R "$REPO" --title "$title" --body "$(body "$file")" "${label_args[@]}" | sed 's#.*/##'
}

echo "Creando epic..."
EPIC="$(create_issue "$DIR/00-epic.md")"
echo "Epic: #$EPIC"

checklist=""
for file in "$DIR"/[0-9][0-9]-*.md; do
  [[ "$(basename "$file")" == 00-epic.md ]] && continue
  number="$(create_issue "$file")"
  title="$(field "$file" title)"
  echo "  #$number $title"
  checklist+="- [ ] #$number $title"$'\n'
  if ! $DRY_RUN; then
    child_id="$(gh api "repos/$REPO/issues/$number" --jq .id)"
    gh api -X POST "repos/$REPO/issues/$EPIC/sub_issues" -F sub_issue_id="$child_id" >/dev/null \
      || echo "  aviso: no se pudo enlazar #$number como sub-issue (queda en el checklist del epic)"
  fi
  supersedes="$(field "$file" supersedes)"
  if [[ -n "$supersedes" ]] && $CLOSE_SUPERSEDED; then
    IFS=',' read -ra old <<<"$supersedes"
    for o in "${old[@]}"; do
      echo "  cerrando #$o (sustituida por #$number)"
      $DRY_RUN || gh issue close "$o" -R "$REPO" --reason "not planned" \
        --comment "Sustituida por #$number dentro del epic #$EPIC (plan PvE-first, \`docs/pve-first-plan.md\`)."
    done
  fi
done

if ! $DRY_RUN; then
  gh issue edit "$EPIC" -R "$REPO" --body "$(body "$DIR/00-epic.md")

## Issues hijas
$checklist"
fi
echo "Hecho."
