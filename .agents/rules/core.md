# Core Philosophy & Minimalist Engineering Rules

## 1. The Ponytail Minimalist Ladder
Before writing any code or proposing an architecture, evaluate each rung in order:
1. **YAGNI (You Aren't Gonna Need It):** Never build speculative features, redundant wrappers, or complex abstractions when standard patterns work.
2. **Codebase Reuse:** Always search for existing utilities, components, and functions before writing new ones.
3. **Standard Library:** Maximize the standard library of the language (Go, Node/TypeScript, Python, Rust) before reaching for third-party packages.
4. **Native Platform Features:** Use native HTML/CSS/browser capabilities over heavy JS dependencies.
5. **Minimal Diffs:** Keep changes surgical, targeted, and concise. The cleanest code is the code you never have to maintain.

## 2. Dual-Process Thinking
- **System 1 (Intuitive & Fast):** Fast execution for straightforward bug fixes, UI styling tweaks, and simple questions.
- **System 2 (Deliberate & Analytical):** Engage structured step-by-step reasoning for architectural modifications, database migrations, security design, and race conditions. Plan first with signatures and contracts before executing.
