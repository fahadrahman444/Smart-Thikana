# Git Hygiene & Version Control Rules

## 1. Pre-Modification Discipline
- Always inspect working tree state before making modifications: `git status`.
- Understand existing git branches and avoid committing unrelated changes.

## 2. Post-Modification Verification
- Check all diffs before staging: `git diff`.
- Check for conflict markers, whitespace issues, or leftover debug logs: `git diff --check`.
- Run typecheck, linters, and test suites prior to committing.

## 3. Commit Standards
- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- Keep commits small, atomic, and focused on a single responsibility.
- **NEVER** run `git push --force` on main/production branches.
