# Destructive Action & Safety Escalation Policy

AI agents must categorize all shell commands and database mutations into three explicit risk tiers:

---

## Risk Tiers

### 🟢 Tier 1: Safe (Automated Execution)
Read-only, diagnostic, or sandboxed test operations:
- `git status`, `git log`, `git diff`
- `ls`, `cat`, `head`, `grep`, `find`
- `npm test`, `go test`, `cargo test`, `pytest`
- `tsc --noEmit`, `eslint`, `go vet`

### 🟡 Tier 2: Potentially Destructive (Careful Execution)
Operations that modify working trees, disk files, or local dependencies:
- `rm <specific_file>`, `git checkout -- <file>`
- `git stash`, `npm install <pkg>`
- Local database test seed updates
- **Rule:** Double-check targets and verify with `git status` after execution.

### 🔴 Tier 3: Critical / Irreversible (Explicit Confirmation Required)
Operations that can permanently destroy data, remote branches, or production states:
- `rm -rf <directory>`
- `git reset --hard`, `git clean -fd`, `git push --force`
- `DROP DATABASE`, `DROP TABLE`, `TRUNCATE`
- `docker system prune -a --volumes`
- Production migration or server decommission commands
- **Mandatory Escalation Protocol:**
  1. **Inspect:** Display the exact command and target paths.
  2. **Explain:** State what will be deleted or altered and why.
  3. **Ask Confirmation:** Require explicit user consent before execution.
  4. **Verify:** Confirm data integrity post-execution.
