> Last updated: 2026-03-15
> AI Context: Design system for Tasky.io extracted from the UI mockup. Color tokens, typography, layout grid, component patterns. Use this when building any frontend or when writing Swagger UI customisation.

# Tasky.io — Design System

## Inspiration
Design language extracted from the **Tasky.io** UI mockup (Figma-style B2B task management dashboard).
Key visual references: dark navy sidebar, card-based content, blue accent data visualisation, clean sans-serif typography.

---

## 1. Color Tokens

```css
:root {
  /* Backgrounds */
  --color-sidebar:          #1B2033;   /* Dark navy — left nav */
  --color-sidebar-hover:    #252C42;   /* Slightly lighter on hover */
  --color-sidebar-active:   #1E4D8C;   /* Blue pill — active nav item */
  --color-bg:               #EEF2F7;   /* Light blue-grey — page background */
  --color-card:             #FFFFFF;   /* White — card surfaces */
  --color-panel:            #F5F7FA;   /* Off-white — right panel */

  /* Brand */
  --color-primary:          #1E4D8C;   /* Deep blue — primary buttons, active states */
  --color-primary-hover:    #1A4278;   /* Darker on hover */
  --color-accent:           #3B82F6;   /* Bright blue — charts, badges, progress */
  --color-accent-light:     #DBEAFE;   /* Light blue tint — chip backgrounds */

  /* Text */
  --color-text-primary:     #1A1F2E;   /* Near-black — headings */
  --color-text-secondary:   #6B7280;   /* Mid-grey — subtext, timestamps, metadata */
  --color-text-inverted:    #FFFFFF;   /* White — text on dark surfaces */
  --color-text-muted:       #9CA3AF;   /* Light grey — placeholder text */

  /* Status */
  --color-success:          #10B981;   /* Green — done status, success */
  --color-warning:          #F59E0B;   /* Amber — medium/high priority, warnings */
  --color-error:            #EF4444;   /* Red — urgent priority, errors */
  --color-info:             #3B82F6;   /* Blue — info badges */

  /* Borders */
  --color-border:           #E5E7EB;   /* Light grey — card borders */
  --color-border-dark:      #D1D5DB;   /* Slightly darker border */

  /* Status badge backgrounds */
  --status-todo-bg:         #F3F4F6;
  --status-todo-text:       #374151;
  --status-inprogress-bg:   #DBEAFE;
  --status-inprogress-text: #1D4ED8;
  --status-inreview-bg:     #FEF3C7;
  --status-inreview-text:   #92400E;
  --status-done-bg:         #D1FAE5;
  --status-done-text:       #065F46;
  --status-archived-bg:     #F3F4F6;
  --status-archived-text:   #6B7280;
}
```

---

## 2. Typography

```css
/* Font stack */
font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;

/* Scale */
--text-xs:   12px / 1.4  weight-400   /* Timestamps, metadata */
--text-sm:   13px / 1.5  weight-400   /* Secondary body, labels */
--text-base: 14px / 1.6  weight-400   /* Primary body text */
--text-md:   16px / 1.5  weight-600   /* Section headers, card titles */
--text-lg:   20px / 1.4  weight-600   /* Page section headings */
--text-xl:   24px / 1.3  weight-700   /* Page titles (e.g. "Dashboard") */
--text-2xl:  32px / 1.2  weight-700   /* Hero numbers (50%+) */
```

Usage in context:
- Page title ("Dashboard"): `xl 700 #1A1F2E`
- Date subtitle ("13 March 2021"): `sm 400 #6B7280`
- Card section header ("Tasks Progress"): `md 600 #1A1F2E`
- Stat number ("72 task"): `base 600 #3B82F6`
- Message preview: `sm 400 #6B7280`
- Sender name: `sm 600 #1A1F2E`
- Timestamp: `xs 400 #9CA3AF`

---

## 3. Layout Grid

### 3-Column Dashboard Layout
```
┌──────────────┬──────────────────────────────────┬──────────────┐
│  Sidebar     │  Main Content Area               │  Right Panel │
│  240px fixed │  flex-grow (min 600px)           │  280px fixed │
│  #1B2033     │  #EEF2F7 background              │  #F5F7FA     │
└──────────────┴──────────────────────────────────┴──────────────┘
```

### Sidebar Structure
```
┌─────────────────────┐
│  ⬤ Tasky.io         │  ← logo + brand name (white, 700 16px)
│                     │
│  Project            │  ← label (xs, #9CA3AF)
│  [Hope project ▼]   │  ← project selector chip
│                     │
│  ▪ Dashboard        │  ← nav item (active: blue pill bg)
│  ▪ Tracking         │
│  ▪ projects         │
│  ▪ work History     │
│                     │
│  Tools              │  ← section label
│  ▪ Inbox            │
│  ▪ Setting          │
│                     │
│  [+] ADD NEW TASK   │  ← CTA button (primary blue, full width)
│                     │
│  [avatar] Joe Max   │  ← user profile
│  Team Leader  ▼     │
└─────────────────────┘
```

---

## 4. Component Patterns

### Card
```
background: #FFFFFF
border-radius: 8px
box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)
padding: 20px 24px
```

### Stat Widget (dark tile)
```
background: #1B2033   (or #1E4D8C for active)
border-radius: 8px
color: #FFFFFF
padding: 16px 20px
Icon: bar-chart, white, right-aligned
Value: "50%+" — 2xl 700 white
Label: "projects" — sm 400 #9CA3AF
```

### Progress Bar
```
height: 6px
background (track): #E5E7EB
background (fill): #3B82F6
border-radius: 3px
Label: "50% Complete" right-aligned, xs #6B7280
```

### Status Badge
```
display: inline-flex
padding: 2px 10px
border-radius: 999px (pill)
font-size: 12px, weight-500
Colors: see --status-* tokens above
```

### Priority Badge
```
low:    bg #F3F4F6, text #374151
medium: bg #FEF3C7, text #92400E
high:   bg #FEE2E2, text #991B1B
urgent: bg #FEE2E2, text #7F1D1D, border 1px #F87171
```

### Avatar
```
width: 32px (list), 40px (profile panel), 64px (large profile)
height: equal to width
border-radius: 50%
object-fit: cover
border: 2px solid #FFFFFF
```

### CTA Button (Add New Task)
```
background: #1B2033
color: #FFFFFF
border-radius: 8px
padding: 12px 16px
font: 14px 600
width: 100% (sidebar)
icon: + left-aligned
```

### Nav Item
```
height: 40px
padding: 0 12px
border-radius: 6px
font: 14px 500
color (inactive): #D1D5DB
color (active): #FFFFFF
background (active): #1E4D8C
icon: 20px, left-aligned, 8px gap to text
```

### Inbox Message Item
```
layout: flex row
avatar: 32px circle, left
content: flex-col, name (sm 600) + preview (xs 400 #6B7280, 1 line truncate)
timestamp: xs 400 #9CA3AF, right-aligned
padding: 12px 0
border-bottom: 1px #E5E7EB (except last)
```

### Chart Colors (line/bar)
```
Primary line:    #3B82F6  (accent blue)
Secondary line:  #CBD5E1  (light slate — comparison)
Bar fill:        #1E4D8C  (dark blue)
Bar fill hover:  #3B82F6  (lighter on hover)
Highlight point: #F59E0B  (amber — peak value)
Grid lines:      #E5E7EB
Axis text:       #6B7280, xs
```

---

## 5. Swagger UI Customisation

When mounting `swagger-ui-express`, apply these overrides for brand consistency:

```js
swaggerUi.setup(swaggerDoc, {
  customCss: `
    .topbar { background-color: #1B2033; }
    .topbar-wrapper img { content: url('data:image/svg+xml,...'); }
    .swagger-ui .info .title { color: #1A1F2E; }
    .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #10B981; }
    .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #3B82F6; }
    .swagger-ui .opblock.opblock-patch .opblock-summary { border-color: #F59E0B; }
    .swagger-ui .opblock.opblock-delete .opblock-summary { border-color: #EF4444; }
  `,
  customSiteTitle: 'Tasky.io API Docs'
});
```

---

## 6. API Response Colour Conventions (for documentation)
| HTTP Method | Colour |
|-------------|--------|
| GET | `#3B82F6` blue |
| POST | `#10B981` green |
| PATCH | `#F59E0B` amber |
| DELETE | `#EF4444` red |
