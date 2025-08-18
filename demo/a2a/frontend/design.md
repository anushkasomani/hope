# Frontend Design Plan — A2A x402 Demo Dashboard

Goal: Improve the existing demo frontend into a modern, sleek, minimal dashboard UI that clearly visualizes the A2A + x402 demo flow. Use Aceternity UI component primitives (see https://ui.aceternity.com/components) where appropriate to accelerate implementation while keeping the design clean and educational.

Summary of target visual and functional goals

- Single-page dashboard (desktop-first, 16:9 mockup) with three clear columns:
  - Left: Agent cards + artifacts (AgentCard JSON, X-PAYMENT base64 + decoded, X-PAYMENT-RESPONSE)
  - Middle: Large Logs viewer (monospaced) with labeled sections
  - Right: Controls and Progress stepper (Compile → Start services → Verify → Settle → Done)
- Prominent header: `A2A x402 Demo Dashboard` with Start Demo / Running state
- Show directional connections client → service → resource → facilitator
- Minimal, educational, high contrast for important artifacts, muted panels for logs
- Use Aceternity UI components for buttons, tabs, code blocks, loaders, steppers, cards, and badges

Design tokens (color / typography)

- Background: #FFFFFF (white)
- Surface / panels: #F7F8FA (very light) or charcoal panels #1F2937 for dark mode
- Text: Dark slate #0F172A
- Accent (primary): Teal #00BFA6 (use for primary action, active state)
- Warning / attention: Amber #FFB020
- Monospace: `ui-mono` / system monospace for logs and JSON
- Sans: Inter / system-ui for UI text
- Radii: 8px for cards, 6px for chips
- Shadows: subtle (e.g., 0 6px 18px rgba(15,23,42,0.06))

Component mapping to Aceternity primitives

- Header
  - Component: `Hero Sections` or `Hero Highlight` (lightweight header) for the title area
  - Buttons: `Stateful Button` for Start Demo (shows loading / success states) and disabled gray `Button` for Running state
- Progress
  - Component: `Multi Step Loader` / `Timeline` for stepper view. Use `Stateful Button`+`Loaders` for spinner
- Artifacts (left column)
  - Component: `Cards` / `Codeblock` for pretty JSON; `Copy` action using `Stateful Button` or icon button
  - Tabbed view: `Animated Tabs` (AgentCard / X-PAYMENT / X-PAYMENT-RESPONSE)
  - Small avatars: `Apple Cards Carousel` or custom small circular avatars for agents
- Logs (center column)
  - Component: `Codeblock` or `Code Block` with monospaced font and syntax-like styling; use `Loaders` and `Infinite Moving Cards` for subtle motion if desired
  - Use `Scrollbar` styling and `LogViewer` wrapper with auto-scroll
- Right column (controls)
  - Component: `Container / Feature sections` containing `Stateful Button` (Start), `Sticky Banner` for status, `Sparkles`/`Spotlight` for attention on tx link
- Small visuals and connectors
  - Use `World Map` or `Direction Aware Hover` to show arrows, or simple SVG connectors inside a `Container` block
- Microinteractions
  - Copy-to-clipboard: small button next to code blocks — use `Stateful Button` to show success
  - Tx link: `Link Preview` with small `Link` icon
  - Loading spinner: `Multi Step Loader` with circular spinner

UX & accessibility

- Keyboard: Start button focusable; logs scrollable by keyboard; copy buttons accessible
- ARIA: Labels for each panel (aria-labelledby), role="log" for logs with aria-live="polite" when new entries arrive
- Contrast: ensure text over panels meets 4.5:1 where possible
- Reduced motion: respect `prefers-reduced-motion` for loaders/animations

Data & interactions

- Orchestration flow:
  - Click `Start Demo` → POST `/api/orchestrate/start` → server spawns orchestrator
  - Frontend polls `/api/orchestrate/status` for `step` and `tx`
  - Frontend polls `/api/orchestrate/logs` for log updates
  - Frontend calls `/api/artifacts/*` to populate AgentCard, X-PAYMENT, X-PAYMENT-RESPONSE
- Local/Remote considerations:
  - Local (dev): Next API routes shell-out to `demo/scripts/start-all.sh`. Logs read from `/tmp`.
  - Vercel/Prod: read-only; use remote orchestrator webhook and proxied artifact endpoints. Shell-out is disabled.

Implementation tasks and checklist (detailed)

A. Project bootstrap (already done partial)
- [x] Confirm `demo/a2a/frontend/package.json` and `tsconfig.json` are correct.
- [ ] Add ESLint / Prettier and format rules consistent with repository.
- [ ] Install Aceternity UI package (or add as design guide only)
  - `npm i @aceternity/ui` (or the exact package name if purchased)

B. Layout & core components
- [x] Implement `app/layout.tsx` with global styles, fonts, theme provider (Tailwind or CSS variables)
- [x] Implement `components/Header.tsx` using `Hero Sections` look (skeleton)
- [x] Implement `components/ProgressStepper` with Aceternity `Multi Step Loader` styles (skeleton)
- [x] Implement `components/ArtifactPanel` with `Tabs` and `Codeblock` (copy buttons)
- [x] Implement `components/LogViewer` using `Codeblock` and auto-scroll
- [ ] Implement `components/ConnectionDiagram` (SVG connectors and small avatars for Client/Service/Resource/Facilitator)

C. API integration and local orchestration
- [x] Harden `/api/orchestrate/start` to check for `ORCHESTRATOR_MODE` and deny shell-out if `ORCHESTRATOR_MODE=remote` or `VERCEL=true`.
- [x] Implement `/api/orchestrate/status`, `/api/orchestrate/logs`, `/api/artifacts/*` (already scaffolded) — ensure robust file detection and fallback filenames.
- [ ] Endpoint security: Gate shell-out with a local-only header or require developer confirmation.

D. Polishing and microinteractions
- [x] Add copy-to-clipboard with success toast for JSON snippets (use `Stateful Button`) — implemented basic copy feedback
- [x] Add small link icon next to tx hash and deep link to Amoy explorer using `AMOY_EXPLORER_BASE` from env — implemented
- [x] Add spinner and step animations; ensure `prefers-reduced-motion` respected — basic spinner added
- [ ] Replace inline components with Aceternity UI primitives (Stateful Button, Codeblock, Tabs)

E. Testing & QA
- [x] Manual test: local mode: start frontend → Click Start Demo → verify steps progress and artifacts populate
- [x] Test `REAL_SETTLE=true` path and ensure tx hash appears (and link to explorer)
- [ ] Test Vercel mode by pointing to a remote orchestrator webhook: ensure read-only artifacts load but no shell-out happens

F. Deployment (Vercel)
- [ ] Add `vercel.json` to configure environment and rewrites if needed
- [ ] Ensure `ORCHESTRATOR_MODE=remote` in Vercel env; configure `ORCHESTRATOR_BASE_URL` to your orchestrator endpoint
- [ ] Remove local-only secrets from Vercel UI and use secure storage for remote webhook credentials

G. Deliverables & docs
- [x] `demo/a2a/frontend/README.md` with local dev steps and Vercel deployment notes (skeleton)
- [x] `demo/a2a/frontend/design.md` (this file) for design reference
- [ ] Component usage docs mapping Aceternity component names to implemented components

Timeline & priorities

- Phase 0 (1 day): complete layout, header, stepper, log viewer, artifact panel skeleton
- Phase 1 (1 day): wire APIs and polling; implement start orchestration and log tailing in local dev
- Phase 2 (0.5 day): add microinteractions, copy, explorer links, and polish
- Phase 3 (0.5 day): prepare Vercel deployment (read-only) and docs

Accessibility & security reminders

- Do not shell-out when running on Vercel; gate with `process.env.VERCEL` or `ORCHESTRATOR_MODE`.
- Keep secrets out of client bundles; only server API routes should access private keys or run scripts.

References

- Aceternity UI components: `https://ui.aceternity.com/components` (use `Stateful Button`, `Codeblock`, `Multi Step Loader`, `Tabs`, `Hero Sections`)

---

If you want I can start executing this plan: commit the frontend components I built and continue implementing the polish tasks (copy buttons, explorer link, layout improvements). Do you want me to proceed to implement Phase 1 (wire APIs and start orchestration via UI) or commit the current components first? 