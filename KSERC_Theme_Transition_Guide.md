# KSERC Truing-Up Tool — Frontend Theme Transition Guide
## From: Modern AI SaaS Dark UI → To: Cliché Indian Government Portal Aesthetic

> **Purpose**: This document provides an exhaustive, pixel-level specification for re-skinning the KSERC Truing-Up Tool to match the visual language of canonical Indian government web portals (CERC, SERC portals, MeitY, data.gov.in) — without touching a single line of backend logic.

---

## PART 1 — CURRENT DESIGN AUTOPSY

### 1.1 Observed Layout Architecture (from live site)

```
┌────────────────────────────────────────────────────────┐
│  TOPBAR: Logo | "Kerala State Electricity Regulatory   │
│           Commission" | Work Order text | User Avatar  │
│           | Logout button                              │
├──────────────┬─────────────────────────────────────────┤
│  LEFT        │                                         │
│  SIDEBAR     │   MAIN CONTENT AREA                     │
│  ─────────   │                                         │
│  [Main]      │   Page Title (H1)                       │
│   Upload     │   Subtitle ("KSERC Internal System")    │
│   Results    │   ─────────────────────────────────     │
│   Report     │   Section Heading (H2)                  │
│              │   Content / Cards / Tables              │
│  [Reference] │                                         │
│   Rules      │   Action Button (+ Start New...)        │
│              │                                         │
│  ─────────   │                                         │
│  Footer info │                                         │
│  v0.1 · RIET │                                         │
│  AI: Groq... │                                         │
└──────────────┴─────────────────────────────────────────┘
```

### 1.2 Current Design DNA (to be replaced)

| Attribute         | Current Value                     |
|-------------------|-----------------------------------|
| Background        | Very dark navy/slate (`~#0f1117`)  |
| Sidebar bg        | Slightly lighter dark (`~#1a1f2e`) |
| Topbar bg         | Dark with subtle border           |
| Primary accent    | Electric blue / teal gradient      |
| Text color        | White / light gray                 |
| Font family       | Inter / system-ui (modern)        |
| Button style      | Rounded, gradient, glowing shadow  |
| Card style        | Glass morphism / dark cards        |
| Nav items         | Pill-shaped, hover glow            |
| Avatar            | Circular, gradient fill            |
| Overall vibe      | AI startup dashboard               |

---

## PART 2 — TARGET: "CLICHÉ GOVERNMENT PORTAL" AESTHETIC

### 2.1 Reference Portals (visual DNA sources)

- **CERC (cerc.gov.in)** — Dark maroon header, white body, blue hyperlinks
- **KSERC (kseb.in era)** — Kerala government blue-gold, tabular layouts
- **MeitY / data.gov.in** — Orange-blue tricolor motif, Devanagari font hints
- **NIC-built portals** — Arial/Times New Roman body, table-heavy layout
- **India.gov.in** — Tricolor ribbon at top, saffron + navy + white palette

### 2.2 Target Design DNA

| Attribute         | Target Value                                        |
|-------------------|-----------------------------------------------------|
| Background        | `#FFFFFF` (pure white body)                         |
| Header bg         | Deep maroon `#7B1C1C` or navy `#003366`             |
| Header text       | White `#FFFFFF`                                     |
| Sidebar bg        | Light gray `#F0F0F0` with `#CCCCCC` border          |
| Sidebar text      | Dark navy `#1A1A4E`                                 |
| Active nav item   | Saffron/amber `#FF8C00` left border + light yellow bg|
| Primary accent    | Government blue `#1B4F8A`                           |
| Secondary accent  | Saffron orange `#FF8C00`                            |
| Link color        | Classic blue `#0000EE` (visited: `#551A8B`)         |
| Body text         | Black `#000000` or very dark `#1A1A1A`              |
| Font family       | Georgia (body), Arial (UI), Times New Roman (headings)|
| Button style      | Flat, rectangular, no radius, with 1px border       |
| Table style       | Alternating row #F5F5F5/#FFFFFF, 1px solid #CCCCCC  |
| Card style        | White bg, 1px solid #CCCCCC border, subtle box-shadow|
| Footer            | Dark navy bg, white text, links in light blue       |
| Tricolor accent   | 3px ribbon: saffron `#FF8C00` | white | green `#138808`|

---

## PART 3 — COMPONENT-BY-COMPONENT MIGRATION SPEC

### 3.1 TOPBAR / HEADER

#### Current:
```css
/* Current approximate */
.topbar {
  background: #1a1f2e;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  height: 64px;
}
.logo-text {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  color: #ffffff;
  font-size: 1.1rem;
}
.subtitle-text {
  color: rgba(255,255,255,0.6);
  font-size: 0.75rem;
}
```

#### Target — Government Header:
```css
/* =============================================
   GOVERNMENT HEADER — Replace topbar styles
   ============================================= */

/* Tricolor ribbon at very top */
.gov-ribbon {
  height: 5px;
  background: linear-gradient(
    to right,
    #FF8C00 33.33%,   /* Saffron */
    #FFFFFF 33.33% 66.66%, /* White */
    #138808 66.66%    /* India green */
  );
  width: 100%;
}

.topbar {
  background: #003366;           /* Deep government navy */
  border-bottom: 3px solid #FF8C00;  /* Saffron bottom accent */
  display: flex;
  align-items: center;
  padding: 0 1rem;
  height: auto;
  min-height: 80px;
  flex-wrap: wrap;
  gap: 12px;
}

/* KSERC emblem/logo area */
.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-emblem {
  width: 60px;
  height: 60px;
  background: #FFFFFF;
  border-radius: 50%;
  border: 2px solid #FFD700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 900;
  color: #003366;
  font-family: 'Georgia', serif;
}

.logo-text-block {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: #FFD700;        /* Gold text for org name */
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.logo-subtitle {
  font-family: 'Arial', sans-serif;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.85);
  letter-spacing: 0.02em;
}

.logo-workorder {
  font-family: 'Arial', sans-serif;
  font-size: 0.68rem;
  color: rgba(255,255,255,0.6);
  margin-top: 2px;
}

/* Header right — user info */
.header-user-area {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-badge {
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.3);
  color: #FFFFFF;
  padding: 4px 12px;
  font-family: 'Arial', sans-serif;
  font-size: 0.8rem;
  border-radius: 0;         /* No border radius — government style */
}

.logout-btn {
  background: #CC0000;
  color: #FFFFFF;
  border: 1px solid #990000;
  padding: 5px 14px;
  font-family: 'Arial', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;
  border-radius: 0;
  text-decoration: none;
}
.logout-btn:hover {
  background: #990000;
}
```

---

### 3.2 LEFT SIDEBAR / NAVIGATION

#### Current:
```css
/* Current approximate */
.sidebar {
  background: #1a1f2e;
  width: 220px;
  border-right: 1px solid rgba(255,255,255,0.08);
}
.nav-section-label {
  color: rgba(255,255,255,0.4);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.nav-item {
  color: rgba(255,255,255,0.7);
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: 'Inter', sans-serif;
}
.nav-item.active {
  background: rgba(59,130,246,0.2);
  color: #60a5fa;
}
.nav-item:hover {
  background: rgba(255,255,255,0.06);
}
/* Sidebar footer */
.sidebar-footer {
  font-size: 0.65rem;
  color: rgba(255,255,255,0.3);
}
```

#### Target — Government Sidebar:
```css
/* =============================================
   GOVERNMENT LEFT NAVIGATION
   ============================================= */

.sidebar {
  background: #F0F0F0;
  width: 210px;
  min-width: 210px;
  border-right: 2px solid #CCCCCC;
  display: flex;
  flex-direction: column;
}

/* Section group heading */
.nav-section-label {
  background: #003366;
  color: #FFFFFF;
  font-family: 'Arial', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 6px 10px;
  margin: 0;
  border-bottom: 1px solid #0055A5;
}

/* Nav items — flat, text-link style */
.nav-item {
  display: block;
  color: #1A1A4E;
  padding: 9px 12px 9px 16px;
  font-family: 'Arial', sans-serif;
  font-size: 0.83rem;
  text-decoration: none;
  border-bottom: 1px solid #DDDDDD;
  border-left: 4px solid transparent;
  background: #FFFFFF;
  transition: background 0.1s, border-left-color 0.1s;
}

.nav-item:hover {
  background: #EEF4FF;
  border-left-color: #1B4F8A;
  color: #003366;
  text-decoration: underline;
}

.nav-item.active {
  background: #FFF3CC;           /* Light saffron tint */
  border-left: 4px solid #FF8C00; /* Saffron active indicator */
  color: #7B1C1C;
  font-weight: 700;
}

/* Sidebar footer */
.sidebar-footer {
  margin-top: auto;
  padding: 10px 12px;
  border-top: 1px solid #CCCCCC;
  background: #E8E8E8;
  font-family: 'Arial', sans-serif;
  font-size: 0.65rem;
  color: #555555;
  line-height: 1.6;
}

.sidebar-footer strong {
  color: #003366;
}
```

---

### 3.3 MAIN CONTENT AREA

#### Current:
```css
/* Current approximate */
.main-content {
  background: #0f1117;
  padding: 2rem;
  flex: 1;
}
.page-title {
  font-family: 'Inter', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffffff;
}
.page-subtitle {
  color: rgba(255,255,255,0.5);
  font-size: 0.875rem;
}
.section-heading {
  font-size: 1.1rem;
  font-weight: 600;
  color: #e2e8f0;
}
```

#### Target — Government Content Area:
```css
/* =============================================
   GOVERNMENT MAIN CONTENT
   ============================================= */

.main-content {
  background: #FFFFFF;
  padding: 16px 20px;
  flex: 1;
  min-height: calc(100vh - 85px);
}

/* Breadcrumb (add if not present) */
.breadcrumb {
  font-family: 'Arial', sans-serif;
  font-size: 0.78rem;
  color: #555555;
  margin-bottom: 12px;
  padding: 6px 10px;
  background: #F5F5F5;
  border: 1px solid #DDDDDD;
  border-left: 3px solid #FF8C00;
}
.breadcrumb a {
  color: #0000EE;
  text-decoration: underline;
}
.breadcrumb a:visited {
  color: #551A8B;
}

/* Page heading block */
.page-heading-block {
  border-bottom: 2px solid #003366;
  padding-bottom: 8px;
  margin-bottom: 16px;
}

.page-title {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: #003366;
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-family: 'Arial', sans-serif;
  font-size: 0.8rem;
  color: #666666;
  font-style: italic;
}

/* Section headings */
.section-heading {
  font-family: 'Arial', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #FFFFFF;
  background: #1B4F8A;
  padding: 6px 12px;
  margin: 16px 0 8px 0;
  border-left: 4px solid #FF8C00;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

---

### 3.4 CARDS / INFO PANELS

#### Current (glass morphism dark cards):
```css
.card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  padding: 1.5rem;
}
```

#### Target — Government Info Box:
```css
/* =============================================
   GOVERNMENT CARDS / INFO PANELS
   ============================================= */

.card {
  background: #FFFFFF;
  border: 1px solid #BBBBBB;
  border-radius: 0;           /* No border radius */
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: 1px 1px 3px rgba(0,0,0,0.08);
}

/* Card title bar — government blue header */
.card-header {
  background: #003366;
  color: #FFFFFF;
  padding: 7px 12px;
  font-family: 'Arial', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  margin: -14px -16px 12px -16px; /* Bleed to edges */
  border-bottom: 2px solid #FF8C00;
}

/* Card body text */
.card-body {
  font-family: 'Arial', sans-serif;
  font-size: 0.83rem;
  color: #1A1A1A;
  line-height: 1.6;
}

/* Status / notice box variants */
.notice-box {
  background: #FFFDE7;
  border: 1px solid #F9A825;
  border-left: 4px solid #FF8C00;
  padding: 10px 14px;
  font-family: 'Arial', sans-serif;
  font-size: 0.82rem;
  color: #5D4037;
  margin-bottom: 12px;
}

.notice-box.info {
  background: #E3F2FD;
  border-color: #1B4F8A;
  border-left-color: #003366;
  color: #0D3050;
}

.notice-box.success {
  background: #E8F5E9;
  border-color: #2E7D32;
  border-left-color: #138808;
  color: #1B5E20;
}

.notice-box.error {
  background: #FFEBEE;
  border-color: #C62828;
  border-left-color: #CC0000;
  color: #7B1C1C;
}
```

---

### 3.5 BUTTONS

#### Current (glowing gradient rounded):
```css
.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 4px 15px rgba(59,130,246,0.4);
}
```

#### Target — Government Flat Buttons:
```css
/* =============================================
   GOVERNMENT BUTTONS — Flat, rectangular
   ============================================= */

/* Primary action */
.btn-primary {
  background: #1B4F8A;
  color: #FFFFFF;
  border: 1px solid #003366;
  border-radius: 0;
  padding: 7px 18px;
  font-family: 'Arial', sans-serif;
  font-size: 0.83rem;
  font-weight: 700;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  box-shadow: none;
  transition: background 0.1s;
}
.btn-primary:hover {
  background: #003366;
}
.btn-primary:active {
  background: #001F4D;
}

/* Secondary */
.btn-secondary {
  background: #FFFFFF;
  color: #003366;
  border: 1px solid #003366;
  border-radius: 0;
  padding: 7px 18px;
  font-family: 'Arial', sans-serif;
  font-size: 0.83rem;
  cursor: pointer;
  text-transform: uppercase;
}
.btn-secondary:hover {
  background: #EEF4FF;
}

/* Submit / Start */
.btn-action {
  background: #FF8C00;
  color: #FFFFFF;
  border: 1px solid #CC7000;
  border-radius: 0;
  padding: 8px 20px;
  font-family: 'Arial', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.btn-action:hover {
  background: #CC7000;
}

/* Danger / Delete */
.btn-danger {
  background: #CC0000;
  color: #FFFFFF;
  border: 1px solid #990000;
  border-radius: 0;
  padding: 7px 18px;
  font-family: 'Arial', sans-serif;
  font-size: 0.83rem;
  cursor: pointer;
}
.btn-danger:hover {
  background: #990000;
}
```

---

### 3.6 TABLES (Analysis Results)

#### Current:
```css
.data-table {
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  color: #e2e8f0;
}
.data-table th {
  background: rgba(59,130,246,0.15);
  color: #93c5fd;
}
.data-table tr:hover {
  background: rgba(255,255,255,0.04);
}
```

#### Target — Government Data Table:
```css
/* =============================================
   GOVERNMENT DATA TABLE
   ============================================= */

.data-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #AAAAAA;
  font-family: 'Arial', sans-serif;
  font-size: 0.82rem;
  margin-bottom: 16px;
}

.data-table thead tr {
  background: #003366;
  color: #FFFFFF;
}

.data-table th {
  padding: 8px 10px;
  text-align: left;
  font-weight: 700;
  border: 1px solid #0055A5;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.data-table td {
  padding: 7px 10px;
  border: 1px solid #CCCCCC;
  color: #1A1A1A;
  vertical-align: top;
}

/* Alternating rows — classic government zebra */
.data-table tbody tr:nth-child(even) {
  background: #F0F5FF;
}
.data-table tbody tr:nth-child(odd) {
  background: #FFFFFF;
}

.data-table tbody tr:hover {
  background: #FFF3CC;   /* Saffron tint on hover */
  cursor: default;
}

/* Subtotal / group rows */
.data-table tr.subtotal-row td {
  background: #E8EEF5;
  font-weight: 700;
  color: #003366;
  border-top: 2px solid #003366;
}

/* Grand total row */
.data-table tr.total-row td {
  background: #003366;
  color: #FFD700;
  font-weight: 700;
  border-top: 2px solid #FF8C00;
}

/* Numeric cells — right align */
.data-table td.numeric,
.data-table th.numeric {
  text-align: right;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
}

/* Status badges in table */
.badge-compliant {
  background: #138808;
  color: #FFFFFF;
  padding: 2px 7px;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: 'Arial', sans-serif;
}
.badge-deviation {
  background: #CC0000;
  color: #FFFFFF;
  padding: 2px 7px;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: 'Arial', sans-serif;
}
.badge-pending {
  background: #FF8C00;
  color: #FFFFFF;
  padding: 2px 7px;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: 'Arial', sans-serif;
}
```

---

### 3.7 FORMS / UPLOAD INPUTS

#### Current (dark, rounded, glowing focus):
```css
.input-field {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: #ffffff;
  padding: 10px 14px;
}
.input-field:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
}
```

#### Target — Government Form Fields:
```css
/* =============================================
   GOVERNMENT FORM ELEMENTS
   ============================================= */

.input-field,
input[type="text"],
input[type="email"],
input[type="password"],
select,
textarea {
  background: #FFFFFF;
  border: 1px solid #888888;
  border-radius: 0;
  color: #1A1A1A;
  padding: 6px 10px;
  font-family: 'Arial', sans-serif;
  font-size: 0.83rem;
  width: 100%;
  box-sizing: border-box;
}

input:focus,
select:focus,
textarea:focus {
  border-color: #003366;
  outline: 2px solid #6699CC;
  outline-offset: 0;
  box-shadow: none;
}

/* Form label */
label {
  display: block;
  font-family: 'Arial', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: #1A1A4E;
  margin-bottom: 3px;
}

label .required {
  color: #CC0000;
  margin-left: 2px;
}

/* File upload area */
.upload-zone {
  border: 2px dashed #888888;
  background: #F9F9F9;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  font-family: 'Arial', sans-serif;
  font-size: 0.85rem;
  color: #555555;
  border-radius: 0;
  transition: background 0.1s, border-color 0.1s;
}

.upload-zone:hover {
  background: #EEF4FF;
  border-color: #003366;
  color: #003366;
}

.upload-zone.drag-active {
  background: #FFF3CC;
  border-color: #FF8C00;
  border-style: solid;
  color: #7B1C1C;
}

/* Upload icon text */
.upload-zone .upload-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 8px;
  color: #003366;
}

/* Form group */
.form-group {
  margin-bottom: 14px;
}

/* Form section divider */
.form-section-title {
  font-family: 'Arial', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #FFFFFF;
  background: #1B4F8A;
  padding: 5px 10px;
  margin: 16px 0 10px 0;
  border-left: 3px solid #FF8C00;
}
```

---

### 3.8 LOADING STATES

#### Current (spinner, dark background, glowing):
- Animated SVG or CSS spinner with blue glow on dark bg

#### Target — Government Loading:
```css
/* =============================================
   GOVERNMENT LOADING STATES
   ============================================= */

.loading-overlay {
  background: rgba(255,255,255,0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.loading-text {
  font-family: 'Arial', sans-serif;
  font-size: 0.85rem;
  color: #003366;
  font-weight: 700;
}

/* Simple CSS spinner — no glow, no color gradients */
.gov-spinner {
  width: 36px;
  height: 36px;
  border: 4px solid #CCCCCC;
  border-top-color: #003366;
  border-radius: 50%;
  animation: govSpin 0.8s linear infinite;
}

@keyframes govSpin {
  to { transform: rotate(360deg); }
}

/* Loading bar — horizontal progress (NIC style) */
.loading-bar-track {
  width: 200px;
  height: 8px;
  background: #DDDDDD;
  border: 1px solid #AAAAAA;
  border-radius: 0;
}
.loading-bar-fill {
  height: 100%;
  background: #003366;
  transition: width 0.3s ease;
}
```

---

### 3.9 FOOTER

#### Current: Sidebar footer only (dark, minimal)

#### Target — Government Page Footer:
```css
/* =============================================
   GOVERNMENT FOOTER
   ============================================= */

.page-footer {
  background: #003366;
  color: rgba(255,255,255,0.85);
  padding: 14px 20px;
  font-family: 'Arial', sans-serif;
  font-size: 0.75rem;
  border-top: 3px solid #FF8C00;
  margin-top: auto;
}

.footer-top {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.footer-org-name {
  font-weight: 700;
  color: #FFD700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.footer-links a {
  color: #ADD8E6;    /* Light blue hyperlinks */
  text-decoration: underline;
  margin-left: 12px;
  font-size: 0.75rem;
}

.footer-links a:hover {
  color: #FFFFFF;
}

.footer-divider {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.2);
  margin: 8px 0;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  color: rgba(255,255,255,0.6);
  font-size: 0.7rem;
}

.footer-disclaimer {
  font-style: italic;
}
```

---

## PART 4 — CSS CUSTOM PROPERTIES (Root Variables)

Replace all existing color/font variables with these:

```css
/* =============================================
   KSERC GOVERNMENT THEME — CSS VARIABLES
   Full replacement of dark-mode variables
   ============================================= */
:root {
  /* === BRAND COLORS === */
  --gov-navy:          #003366;
  --gov-navy-dark:     #001F4D;
  --gov-navy-light:    #1B4F8A;
  --gov-maroon:        #7B1C1C;
  --gov-saffron:       #FF8C00;
  --gov-saffron-light: #FFF3CC;
  --gov-gold:          #FFD700;
  --gov-green:         #138808;
  --gov-red:           #CC0000;

  /* === BACKGROUND COLORS === */
  --bg-page:           #FFFFFF;
  --bg-sidebar:        #F0F0F0;
  --bg-header:         #003366;
  --bg-card:           #FFFFFF;
  --bg-alt-row:        #F0F5FF;
  --bg-table-header:   #003366;
  --bg-section-title:  #1B4F8A;
  --bg-input:          #FFFFFF;
  --bg-footer:         #003366;
  --bg-notice:         #FFFDE7;

  /* === BORDER COLORS === */
  --border-default:    #CCCCCC;
  --border-strong:     #888888;
  --border-accent:     #FF8C00;
  --border-nav:        #DDDDDD;

  /* === TEXT COLORS === */
  --text-primary:      #1A1A1A;
  --text-secondary:    #555555;
  --text-muted:        #888888;
  --text-on-dark:      #FFFFFF;
  --text-heading:      #003366;
  --text-link:         #0000EE;
  --text-link-visited: #551A8B;
  --text-nav:          #1A1A4E;
  --text-gold:         #FFD700;
  --text-saffron:      #FF8C00;

  /* === TYPOGRAPHY === */
  --font-heading:      'Georgia', 'Times New Roman', Times, serif;
  --font-body:         'Arial', Helvetica, sans-serif;
  --font-mono:         'Courier New', Courier, monospace;
  --font-ui:           'Arial', Helvetica, sans-serif;

  /* === FONT SIZES === */
  --fs-xs:    0.68rem;
  --fs-sm:    0.75rem;
  --fs-base:  0.83rem;
  --fs-md:    0.9rem;
  --fs-lg:    1rem;
  --fs-xl:    1.15rem;
  --fs-2xl:   1.4rem;
  --fs-3xl:   1.75rem;

  /* === SPACING === */
  --sp-xs:    4px;
  --sp-sm:    8px;
  --sp-md:    12px;
  --sp-lg:    16px;
  --sp-xl:    24px;

  /* === BORDERS === */
  --radius:   0px;    /* Government = zero border radius */
  --bw-thin:  1px;
  --bw-mid:   2px;
  --bw-thick: 3px;

  /* === SHADOWS === */
  --shadow-card:  1px 1px 3px rgba(0,0,0,0.08);
  --shadow-none:  none;
}
```

---

## PART 5 — PAGE-BY-PAGE APPLICATION

### 5.1 Dashboard Page (`/`)

**Current**: Dark hero with "AI Truing-Up Tool", dark cards, glowing "Start New" button  
**Target**:
- White page background
- Blue heading bar: "AI Truing-Up Tool — Dashboard"
- Breadcrumb: `Home > Dashboard`
- Notice box (info type): "Welcome to the KSERC AI Analytical System. Please select a licensee to begin."
- Recent activity in a `.data-table` with columns: S.No | Licensee | FY | Status | Date | Action
- "Start New Analysis" → `btn-action` (saffron orange, caps, rectangular)

---

### 5.2 Upload & Analyse Page (`/`)

**Current**: Dark drag-drop area with AI "magic" aesthetic  
**Target**:
- Section heading bar: "UPLOAD PETITION DOCUMENTS"
- White upload zone with dashed border, folder icon (Unicode: 📁), text "Click to select PDF file or drag and drop here"
- Dropdown select field for "Select Licensee" using standard `<select>` element
- Submit button: `btn-primary` (navy)
- Below upload: notice box with instructions about acceptable formats

---

### 5.3 Analysis Results Page (`/results`)

**Current**: Data in cards with neon status indicators  
**Target**:
- Heading: "ANALYSIS RESULTS"
- Breadcrumb
- Results in a full-width `.data-table` per regulatory head
- Compliant/Deviation/Pending badges (`.badge-compliant`, `.badge-deviation`, `.badge-pending`)
- Summary totals row in `.total-row` style
- "Generate Report" button: `btn-action`

---

### 5.4 Generate Report Page (`/report`)

**Current**: Dark preview with glowing download button  
**Target**:
- Heading: "GENERATE TRUING-UP REPORT"
- White card with report parameters form
- Flat `.data-table` preview of report sections
- "Download PDF Report" → `btn-primary`
- "Print Report" → `btn-secondary`
- Disclaimer notice box in amber

---

### 5.5 Regulatory Rules Page (`/rules`)

**Current**: Dark knowledge base cards  
**Target**:
- Heading: "REGULATORY RULES — KNOWLEDGE BASE"
- Each rule in a `.card` with `.card-header` (navy top bar)
- Rule text in body with monospace values for numbers
- Reference citations in italic, small font

---

## PART 6 — TRANSITION ANIMATIONS

### Current: Smooth fade/slide transitions, possibly Framer Motion
### Target: Minimal, institutional

```css
/* =============================================
   GOVERNMENT TRANSITIONS
   Keep animations subtle and functional only
   ============================================= */

/* Page entry — simple fade only */
.page-enter {
  animation: govFadeIn 0.15s ease-in;
}

@keyframes govFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Nav item hover — instant, no transition */
.nav-item {
  transition: background 0.08s linear, border-left-color 0.08s linear;
}

/* Button press feedback */
.btn-primary:active,
.btn-action:active {
  transform: translateY(1px);
  box-shadow: none;
}

/* Loading bar */
.loading-bar-fill {
  transition: width 0.25s linear;
}

/* NO: box-shadow animations, glow pulses, scale transforms,  */
/* gradient shifts, backdrop-filter changes, or parallax      */
```

---

## PART 7 — WHAT TO EXPLICITLY REMOVE

When migrating, strip these from CSS entirely:

```
❌ backdrop-filter: blur(...)         → government browsers may not support, and it's "modern"
❌ background: linear-gradient(...)   → on nav/buttons (use flat colors)
❌ box-shadow: 0 0 Xpx rgba(...)      → glow shadows
❌ border-radius > 0                  → all rounded corners → 0
❌ font-family: 'Inter', ...          → replace with Arial/Georgia
❌ color: rgba(255,255,255,0.X)       → semi-transparent whites on dark bg
❌ background: rgba(255,255,255,0.0X) → glass morphism cards
❌ text-shadow                        → unless on dark header
❌ animation (complex)                → keep only simple fade
❌ transform: scale() on hover        → too modern
❌ CSS custom property gradients on buttons
```

---

## PART 8 — HTML STRUCTURE ADDITIONS

### Add to `<head>`:
```html
<!-- Google Fonts not needed — use system fonts -->
<!-- Remove any CDN font imports for Inter, Manrope, etc. -->

<!-- Favicon: use government seal or placeholder -->
<link rel="icon" type="image/png" href="/kserc-favicon.png">

<!-- Meta for government portals -->
<meta name="author" content="Kerala State Electricity Regulatory Commission">
<meta name="description" content="KSERC AI Truing-Up Analytical Tool — Work Order KSERC/CSO/03-05">
```

### Add after `<body>` opens:
```html
<!-- Tricolor ribbon -->
<div class="gov-ribbon" aria-hidden="true"></div>

<!-- Skip nav for accessibility (gov requirement) -->
<a href="#main-content" class="skip-link">Skip to main content</a>
```

### Skip link CSS:
```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #003366;
  color: #FFFFFF;
  padding: 8px 16px;
  font-family: 'Arial', sans-serif;
  font-size: 0.85rem;
  z-index: 9999;
  transition: top 0.1s;
}
.skip-link:focus {
  top: 5px;
}
```

---

## PART 9 — TYPOGRAPHY SCALE (Complete Replacement)

```css
/* =============================================
   GOVERNMENT TYPOGRAPHY SYSTEM
   ============================================= */

body {
  font-family: var(--font-body);  /* Arial */
  font-size: 13px;                /* Government portals use smaller base */
  line-height: 1.5;
  color: var(--text-primary);
  background: var(--bg-page);
}

h1 {
  font-family: var(--font-heading);  /* Georgia */
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-heading);
  margin: 0 0 8px 0;
}

h2 {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 700;
  color: #FFFFFF;
  background: var(--bg-section-title);
  padding: 6px 12px;
  margin: 16px 0 8px 0;
  border-left: 4px solid var(--gov-saffron);
}

h3 {
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--gov-navy);
  border-bottom: 1px solid var(--border-default);
  padding-bottom: 4px;
  margin: 12px 0 8px 0;
}

p {
  font-family: var(--font-body);
  font-size: 0.83rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0 0 10px 0;
}

a {
  color: var(--text-link);
  text-decoration: underline;
}
a:visited {
  color: var(--text-link-visited);
}
a:hover {
  color: var(--gov-maroon);
}

small, .text-sm {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

code, pre, .monospace {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  background: #F5F5F5;
  border: 1px solid #DDDDDD;
  padding: 2px 6px;
  color: #1A1A1A;
}
```

---

## PART 10 — SUMMARY VISUAL DIFF TABLE

| Element            | BEFORE (Current)                   | AFTER (Government)                     |
|--------------------|------------------------------------|----------------------------------------|
| Body bg            | `#0f1117` (near-black)             | `#FFFFFF` (white)                      |
| Header bg          | `#1a1f2e` (dark navy)              | `#003366` (government navy)            |
| Header bottom border| None / subtle                     | `3px solid #FF8C00` (saffron)          |
| Sidebar bg         | `#1a1f2e` (dark)                   | `#F0F0F0` (light gray)                 |
| Sidebar text       | `rgba(255,255,255,0.7)` (white)    | `#1A1A4E` (dark navy)                  |
| Active nav item    | Blue glow pill                     | Saffron left-border, yellow bg         |
| Primary font       | Inter (geometric, modern)          | Arial (utilitarian)                    |
| Heading font       | Inter Bold                         | Georgia / Times New Roman              |
| Mono font          | N/A (inferred)                     | Courier New (for numbers/values)       |
| Buttons            | Rounded, gradient, glowing         | Flat, rectangular, 0 radius            |
| Cards              | Glass morphism, dark               | White, 1px border, minimal shadow      |
| Tables             | Dark, rounded, tinted              | White/blue zebra, 1px solid borders    |
| Accent color       | Electric blue / purple             | Saffron `#FF8C00` + Navy `#003366`     |
| Links              | White or blue glow                 | `#0000EE` classic blue (visited purple)|
| Border radius      | 8–12px everywhere                  | 0px everywhere                         |
| Animations         | Framer Motion / CSS transitions    | Simple 0.1–0.15s fade, button press    |
| Footer             | Sidebar only, dark                 | Full-width navy bar, light blue links  |
| Top ribbon         | None                               | 5px tricolor saffron/white/green       |

---

*End of Theme Transition Guide — KSERC AI Truing-Up Tool*  
*Generated for handoff to alternate backend implementation*  
*All CSS is drop-in compatible; no backend logic touched*
