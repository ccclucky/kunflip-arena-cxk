# Design System Master File (Light Theme)

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Kunflip Arena (Light Mode)
**Updated:** 2026-02-10
**Category:** Pro Sports / Tech Lab

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#0F172A` | `--color-primary` |
| Secondary | `#334155` | `--color-secondary` |
| Faction A (iKun) | `#D97706` | `--color-ikun-gold` |
| Faction B (Anti) | `#7C3AED` | `--color-anti-purple` |
| CTA | `#0F172A` | `--color-cta` |
| Background | `#F8FAFC` | `--color-background` |
| Surface | `#FFFFFF` | `--color-surface` |
| Text Main | `#020617` | `--color-text` |
| Text Muted | `#64748B` | `--color-text-muted` |
| Border | `#E2E8F0` | `--color-border` |

**Color Notes:**
- **King's Gold (#D97706):** Deep Amber. Used for iKun faction. Use Amber-500 (#F59E0B) for buttons/backgrounds, Amber-700 for text.
- **Evil Purple (#7C3AED):** Electric Violet. Used for Anti-fan faction. Use Violet-500 (#8B5CF6) for buttons, Violet-700 for text.

### Typography

- **Heading Font:** Syncopate
- **Body Font:** Space Mono
- **Mood:** Clean, precision, broadcast, future-sport
- **Google Fonts:** [Syncopate + Space Mono](https://fonts.google.com/share?selection.family=Space+Mono:wght@400;700|Syncopate:wght@400;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syncopate:wght@400;700&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths (Light Mode Crucial)

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)` | Hero images |

---

## Component Specs

### Buttons

```css
/* Primary Button (Solid Dark) */
.btn-primary {
  background: var(--color-cta);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover {
  background: #1E293B; /* Slate 800 */
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Secondary Button (Outline) */
.btn-secondary {
  background: white;
  color: var(--color-primary);
  border: 1px solid var(--color-border);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #F1F5F9; /* Slate 100 */
  border-color: #CBD5E1; /* Slate 300 */
}
```

### Cards

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: #CBD5E1; /* Slate 300 */
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  background: white;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 16px;
  color: var(--color-text);
  transition: all 200ms ease;
}

.input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1); /* Slate 900 with opacity */
}
```

---

## Style Guidelines

**Style:** Clean Future Tech
**Keywords:** High contrast, sharp typography, subtle shadows, lab aesthetic, pro sports
**Best For:** Daylight use, broadcast overlays, data-heavy dashboards

### Anti-Patterns (Do NOT Use)

- ❌ **Dark backgrounds for main content** — Keep it white/slate-50.
- ❌ **Neon glows** — Use drop shadows instead.
- ❌ **Low contrast gray text** — Text must be legible (#64748B minimum).
- ❌ **Pure black (#000000)** — Use Slate 950 (#020617) for softer contrast.
