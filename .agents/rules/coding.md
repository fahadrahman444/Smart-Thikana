# Coding Quality & Anti-Slop Rules

## 1. Zero Dead Code & Strict Typing
- **No Dead Code:** Never commit unused imports, dead variables, uncalled functions, or zombie commented-out code blocks.
- **Strict Typing:** Never use `: any` in TypeScript or empty interfaces in Go/Rust. Define clean interfaces or use `unknown` with narrowing type guards.
- **No Redundant Async:** Never mark synchronous functions `async` or write `return await x;` outside try/catch blocks.
- **No Hollow Try/Catch:** Never catch an error merely to log and re-throw without recovery or enrichment.

## 2. UI Layout & Animation Performance
- **Framer Motion Standards:** Use declarative `motion.div` and `AnimatePresence`.
- **Backdrop Blur Performance:** NEVER animate the `opacity` of elements with CSS `backdrop-filter: blur`. Animate a solid translucent overlay inside a static blur wrapper instead.
- **No Heavy Glassmorphism:** Favor clean borders, subtle elevation shadows, and solid surfaces.
- **Mobile Touch Safety:** Minimum 44×44px touch targets for mobile interactive controls. Safe line-heights (`leading-[1.15]`+) on mobile headings.
