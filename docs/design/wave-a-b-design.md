# FindMySensi Wave A/B Design Specifications

**Status:** PROPOSED
**Scope:** Visual foundation, responsive layout, accessibility, and UI states for Public Shell, Auth, and Grid Practice (Waves A/B).

## 1. Typography

- **Primary Font:** Geist Sans (for UI text, headings, and data).
- **Monospace Font:** Geist Mono (for share codes, hashes, protocol outputs, debug overlays).
- **Scale:** Base 16px (1rem), using a standard Tailwind scale (`text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, etc.).

## 2. Color Palette (Dark Theme Default)

FindMySensi prioritizes a high-performance, low-distraction dark theme to minimize eye strain during aim training.

- **Background:** `zinc-950` (#09090b) - Deepest background for the main app shell.
- **Surface:** `zinc-900` (#18181b) - Cards, modals, elevated surfaces.
- **Border:** `zinc-800` (#27272a) - Subtle dividers.
- **Primary Accent:** `indigo-500` (#6366f1) - Main calls to action, active states.
- **Foreground (Text):** `zinc-50` (#fafafa) for primary text, `zinc-400` (#a1a1aa) for secondary text.
- **Success:** `emerald-500` (#10b981) - Positive feedback (e.g., PB broken).
- **Error/Destructive:** `red-500` (#ef4444) - Validation errors, delete actions.

## 3. Gameplay Canvas Theme (Grid)

- **Canvas Background:** Pure Black (`#000000`) or deep gray (`#111111`) to maximize contrast.
- **Target Default:** Bright Cyan (`#06b6d4`) or User-configured. Must maintain WCAG AA contrast ratio against the canvas.
- **Crosshair Default:** White (`#ffffff`) or Neon Green (`#39ff14`).

## 4. Layout and Responsiveness

- **Desktop First (Training):** Aim training requires a desktop/laptop and mouse. The canvas is locked to an exact internal resolution (e.g., 1280x720) and scales using Fit/Stretch/Black Bars.
- **Responsive Shell:** Navigation, Auth, and Profiles are responsive down to 320px (mobile).
- **Mobile Blocking:** If a user visits `/train/[mode]` on a mobile/touch device, they receive a blocking overlay: `Training requires a desktop/laptop and mouse.`

## 5. Accessibility (a11y)

- **Focus Rings:** Visible `ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950` on all interactive elements. No `outline-none` without a replacement focus state.
- **Contrast:** All text and critical UI elements must pass WCAG AA (4.5:1 for normal text, 3:1 for large text).
- **Screen Readers:** Use semantic HTML (`<nav>`, `<main>`, `<button>`). Include `aria-label` for icon-only buttons.
- **Reduced Motion:** Respect `@media (prefers-reduced-motion)`. Disable UI entrance animations and background pulsing if enabled.

## 6. Interaction States

- **Hover:** Slight brightness increase (e.g., `bg-indigo-400`) and subtle transform (`scale-[1.02]`) on cards.
- **Active:** Scale down (`scale-95`) to simulate physical press.
- **Disabled:** Opacity 50% (`opacity-50`) and `cursor-not-allowed`.

## 7. Iconography

- **Library:** Lucide React (feather icons).
- **Usage:** Individual icon imports only (e.g., `import { Settings } from "lucide-react"`) to minimize bundle size.
