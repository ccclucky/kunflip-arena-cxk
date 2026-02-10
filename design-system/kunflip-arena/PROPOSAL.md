# Kunflip Arena UI/UX Refactor Proposal (Light Theme)

**Role:** Senior Product Designer
**Date:** 2026-02-10
**Status:** Draft (Light Mode)

## 1. Analysis & Strategy

### 1.1 User Scenarios
- **The Fighter (Active):** Needs clarity and focus. Light mode reduces "gamer fatigue" in bright environments.
- **The Spectator (Passive -> Active):** Wants a broadcast-quality view. Think "Sports Center" or "Esports Tournament Stream" – clean, high visibility.
- **The Judge (System):** Data visualization must be crisp. Dark text on light backgrounds offers superior readability for stats.

### 1.2 Business Goals
- **Engagement:** Friendly, approachable entry. Less "underground hacker," more "global league."
- **Virality:** Shareable cards look like official sports trading cards or press releases.
- **Fairness:** High contrast ensures no ambiguity in text or scores.

---

## 2. Design System: "Royal Clash" (Light Theme)

Adapted from `ui-ux-pro-max` "Royal Gold Purple Luxury" style.

### 2.1 Core Identity
- **Style:** **Modern Royalty**. Clean, high contrast, with accents of royalty (Gold) and mystery (Purple).
- **Theme:** Light Mode Default (Pro League / Royal Arena).
- **Fonts:** 
    - **Headings:** `Syncopate` (Futuristic, Wide) - **Slate 900 (#0F172A)**
    - **Body:** `Space Mono` (Tech, Code) - **Slate 700 (#334155)**

### 2.2 Color Palette
- **Background:** `#F8FAFC` (Slate 50) - Crisp, clean foundation.
- **Surface (Cards):** `#FFFFFF` (White) - with subtle border `#E2E8F0`.
- **Primary (iKun - King's Gold):** `#D97706` (Amber 600) - A deep, rich gold that is readable on white. Not bright yellow.
- **Secondary (Anti-Fan - Evil Purple):** `#7C3AED` (Violet 600) - A vibrant, electric purple representing chaos/wickedness.
- **Accent/CTA:** `#0F172A` (Slate 900) - Primary actions.
- **Text Main:** `#020617` (Slate 950) - Maximum readability.
- **Text Muted:** `#64748B` (Slate 500).

### 2.3 Component System (Atomic)

#### Typography Scale
- **H1 (Hero):** 96px `Syncopate` Bold. Color: `#0F172A`.
- **H2 (Section):** 48px `Syncopate` Regular.
- **Body:** 16px `Space Mono`.

#### Buttons & Interactables
- **Battle Button:** Gradient Gold to Purple (representing the conflict).
    - `bg-gradient-to-r from-amber-500 to-violet-600` text-white.
- **Faction Badges:**
    - **iKun:** Gold Border (`border-amber-500`), Gold Text (`text-amber-700`), Pale Gold Bg (`bg-amber-50`).
    - **Anti-Fan:** Purple Border (`border-violet-500`), Purple Text (`text-violet-700`), Pale Purple Bg (`bg-violet-50`).
- **Shadows:** Soft, diffused. `0 4px 6px -1px rgba(0, 0, 0, 0.05)`.

---

## 3. Information Architecture & Layout (Refined for Light)

### 3.1 Global Navigation
- **Style:** White bar, bottom border `border-slate-200`. Icons: `Slate-600` (inactive) -> `Slate-900` (active).

### 3.2 Key Screens

#### A. The Lobby (Home)
- **War Bar:** Top strip. Red (#DC2626) vs Slate (#475569). Crisp percentage numbers.
- **Hero:** "Feature Battle". White card with large shadow. Video preview has **no overlay** (clean).
- **List:** Clean rows with plenty of whitespace.

#### B. The Arena (Battle Room)
- **Background:** Subtle grid pattern (Slate 200 opacity 20%) on Slate 50.
- **Bubbles:** 
    - iKun (Gold): White bubble, Gold border (`#F59E0B`), Slate 900 text.
    - Anti-Fan (Purple): White bubble, Purple border (`#8B5CF6`), Slate 900 text.
    - **No dark bubbles.** Keep it like a chat app (clean reading).

#### C. Battle Report
- **Winner:** Giant Outline Text in Winner's Color (Gold or Purple).
- **Stats:** Radar Chart on White card. Grid lines `Slate-200`. Data lines `Amber-600` or `Violet-600`.

---

## 4. Technical Strategy

### 4.1 Accessibility (A11y)
- **Contrast:** 
    - Gold text must be darker (`Amber-700`) to pass AA on white.
    - Purple text (`Violet-700`) passes easily.
- **Focus:** Blue outline (`ring-blue-500`) for keyboard navigation.

### 4.2 Implementation
- **CSS Variables:** Update `theme.css` to map `--color-accent-gold` and `--color-accent-purple`.
- **Shadows:** Crucial in light mode to define depth (unlike dark mode which uses glow).

---

## 5. Implementation Checklist (Light Mode)
- [ ] Update `theme.css` with Gold/Purple palette.
- [ ] Replace "Red/Black" logic with "Gold/Purple".
- [ ] Ensure Gold faction colors are WCAG AA compliant on white (use darker Amber for text).
- [ ] Verify `GlassPanel` works in light mode (needs higher opacity `bg-white/80`).
