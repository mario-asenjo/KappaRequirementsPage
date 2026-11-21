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

# Solo API REST (gh api): funciona tambien donde GraphQL no esta disponible.
existing_labels="$(gh api --paginate "repos/$REPO/labels?per_page=100" --jq '.[].name')"
ensure_labels() {
  local IFS=','
  for label in $1; do
    if ! grep -qx "$label" <<<"$existing_labels"; then
      echo "  creando label que falta: $label"
      $DRY_RUN || gh api -X POST "repos/$REPO/labels" -f name="$label" >/dev/null
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
  for label in $labels; do label_args+=(-f "labels[]=$label"); done
  unset IFS
  if $DRY_RUN; then
    echo "[dry-run] $title" >&2
    echo "0"
    return
  fi
  gh api -X POST "repos/$REPO/issues" -f title="$title" -f body="$(body "$file")" "${label_args[@]}" --jq .number
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
      if ! $DRY_RUN; then
        gh api -X POST "repos/$REPO/issues/$o/comments" \
          -f body="Sustituida por #$number dentro del epic #$EPIC (plan PvE-first, \`docs/pve-first-plan.md\`)." >/dev/null
        gh api -X PATCH "repos/$REPO/issues/$o" -f state=closed -f state_reason=not_planned >/dev/null
      fi
    done
  fi
done

if ! $DRY_RUN; then
  gh api -X PATCH "repos/$REPO/issues/$EPIC" -f body="$(body "$DIR/00-epic.md")

## Issues hijas
$checklist" >/dev/null
fi
echo "Hecho."
