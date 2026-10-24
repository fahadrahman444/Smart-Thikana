# Decision-Before-Implementation Rule

## 1. Mandatory Decision-First Protocol
Before implementing any non-trivial feature, UI redesign, architectural refactor, database migration, or dependency addition, the agent MUST:

1. **Understand Objective:** Comprehend the exact user goal and domain boundaries.
2. **Inspect Read-Only:** Inspect existing code, contracts, APIs, and schemas using read-only tools without making any file edits or running mutating commands.
3. **Present 2–4 Distinct Options:** Formulate genuine architectural alternatives detailing:
   - Specific behavior and application changes.
   - Files, components, and schemas affected.
   - Trade-offs (pros vs. cons).
   - Complexity and regression risks.
   - Database migrations or new dependencies required.
4. **Recommend & Stop:** Provide an explicit recommendation with engineering justification, then halt and wait for the user's explicit decision.

## 2. Strict Execution Boundaries
- **No Speculative Implementation:** Do not start coding or editing files while presenting options.
- **Explicit User Approval:** Only proceed to implementation after the user explicitly confirms an option (e.g. "Go with Option 1", "Option 2", or custom adjustments).
- **Scope Containment:** Implement strictly the chosen option. Never sneak in unauthorized refactors or unapproved dependencies.
