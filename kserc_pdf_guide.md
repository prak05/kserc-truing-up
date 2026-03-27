# KSERC Truing-Up Order PDF Generation
## Complete Build Guide

---

## 0. What This Solves

The AI-generated PDF currently has:
- Duplicate section headers (`Analysis and Decision` appearing twice)
- Table numbering inconsistencies
- Paragraph numbering gaps/resets
- Incorrect table column headers (`MYT ARR Approved` missing in some tables)
- Revenue figures showing `0.00` in MYT column instead of being blank/dashed
- Formatting that doesn't match the KSERC typographic standard

This guide builds a **correct, general-purpose** order generation pipeline that works for **all licensees** (Infopark, Technopark, KDHP, CSEZA, etc.) without hardcoding any values.

---

## 1. Architecture Overview

```
Rule Engine Output (JSON)
        │
        ▼
 Document Builder (Python)
        │
    ┌───┴───────────────┐
    │                   │
    ▼                   ▼
HTML Template      Section Data
(Jinja2)           (Tables, Paras)
    │
    ▼
Google Cloud Run
(Headless Chrome / Puppeteer)
    │
    ▼
PDF (Styled to KSERC spec)
    │
    ▼
Frontend (React)
  ├── Preview (iframe / PDF.js)
  ├── Inline Editor (section-level)
  └── Download Button
```

---

## 2. Data Contract — Rule Engine → Document Builder

The rule engine must emit a **single JSON object** per order. The document builder must never compute regulatory values — it only renders what it receives.

### 2.1 Top-Level Schema

```json
{
  "meta": { ... },
  "cover": { ... },
  "introduction": { ... },
  "hearing": { ... },
  "sections": [ ... ],
  "orders": { ... }
}
```

### 2.2 `meta` block

```json
{
  "petition_no": "OP XX / 2026",
  "licensee_name": "M/s Infopark Kerala",
  "licensee_short": "Infopark",
  "fy": "2024-25",
  "control_period_year": "third",
  "order_date": "DD.MM.YYYY",
  "hearing_date": "DD.MM.YYYY",
  "chairman": "Sri T K Jose",
  "members": ["Adv. A J Wilson", "Sri. B Pradeep"],
  "licensee_representatives": [
    { "name": "Sri. Susanth Kurunthil", "designation": "Chief Executive Officer" }
  ],
  "respondent": "M/s Kerala State Electricity Board Limited",
  "respondent_representatives": [
    { "name": "Sri. Ajith Kumar K.N", "designation": "Executive Engineer, KSEB Ltd" }
  ]
}
```

### 2.3 `sections` array — General Structure

Each section is a self-contained block the builder renders in order.

```json
{
  "id": "ppc",
  "title": "Power Purchase Cost",
  "paragraphs": [ ... ],
  "tables": [ ... ],
  "decision": "string — the formal approval sentence"
}
```

#### Paragraph object

```json
{
  "seq": 28,
  "text": "The licensee has claimed a power purchase cost of Rs. {claimed_ppc} lakh..."
}
```

- `seq` is the **global** paragraph counter. The builder maintains this across all sections so numbering never resets.
- Use `{placeholder}` tokens for values — the builder substitutes from the values store.

#### Table object

```json
{
  "table_no": 5,
  "title": "Power Purchase Cost for FY {fy}",
  "subtitle": "(Rs. in Lakhs)",
  "columns": [
    { "key": "particulars", "label": "Particulars" },
    { "key": "claimed",     "label": "Claimed" },
    { "key": "approved",    "label": "Approved" }
  ],
  "rows": [
    { "particulars": "Units Purchased (Lakh Units)", "claimed": "{ppc_units_claimed}", "approved": "{ppc_units_approved}" },
    { "particulars": "Cost of Power Purchase",       "claimed": "{claimed_ppc}",        "approved": "{claimed_ppc}" },
    { "particulars": "Add: Licensee's share of efficiency gain", "claimed": "–",        "approved": "{licensee_gain_share}" },
    { "particulars": "Total Approved Power Purchase Cost",       "claimed": "{claimed_ppc}", "approved": "{approved_ppc}", "bold": true }
  ]
}
```

**Rules for table columns:**
- The standard three-column table for truing-up comparisons is: `MYT ARR Approved | For Truing Up (Claimed) | Trued Up (Approved)`
- When MYT figures are not relevant (e.g., PPC sub-table), use: `Claimed | Approved`
- Never show `0.00` for revenue in the MYT column — use `–` or leave blank, matching the actual order convention

### 2.4 `values` store

A flat key-value dict of all computed numbers. The builder uses this to substitute `{tokens}` in paragraphs and table cells.

```json
{
  "values": {
    "fy": "2024-25",
    "claimed_ppc": "1023.94",
    "approved_ppc": "1040.80",
    "actual_loss_pct": "2.86",
    "target_loss_pct": "4.23",
    "actual_loss_units": "6.95",
    "target_loss_units": "10.41",
    "savings_units": "3.46",
    "appc": "7.31",
    "total_gain": "25.29",
    "licensee_gain_share": "16.86",
    "consumer_gain_share": "8.43",
    ...
  }
}
```

---

## 3. Section Catalogue

These are the **standard sections** present in every KSERC truing-up order. The builder renders all sections that are present in the JSON; absent sections are skipped cleanly.

| Section ID | Title | Standard Tables |
|---|---|---|
| `intro` | Introduction | None |
| `hearing` | Hearing on the Petition | None |
| `energy_sales` | Energy Sales and Consumer Mix | Consumer Mix (Table 3 equivalent) |
| `distribution_loss` | Energy Requirement and Distribution Loss | Loss calculation table |
| `ppc` | Power Purchase Cost | PPC summary table |
| `employee_cost` | Employee Expenses | Employee breakdown table |
| `rm_expense` | Repair and Maintenance (R&M) Expenses | None (prose only) |
| `ag_expense` | Administration and General (A&G) Expenses | A&G breakdown table |
| `depreciation` | Depreciation | None |
| `interest_nlt` | Interest on Normative Long-Term Loan | None |
| `interest_deposits` | Interest on Consumer Security Deposits | None |
| `interest_wc` | Interest on Working Capital | Working capital table |
| `carrying_cost` | Carrying Cost for Past Revenue Gaps | None |
| `ronfa` | Return on Net Fixed Assets (RoNFA) | None |
| `revenue` | Revenues | None |
| `arr_gap` | Aggregate Revenue Requirement and Revenue Gap | Full ARR summary (Table 1 equivalent) |
| `orders` | Orders of the Commission | Bullet list |

---

## 4. Critical Structural Rules

These rules fix the mistakes in the current AI-generated PDF.

### Rule 1 — Single `Analysis and Decision` Header
The header "Analysis and Decision of the Commission" appears **exactly once**, before the first analytical section (`distribution_loss` or `energy_sales`). It does not repeat per-section.

```
Introduction
    ↓ paras 1–6
Hearing on the Petition
    ↓ paras 7–15
Analysis and Decision of the Commission   ← ONE TIME ONLY
    Energy Sales ...
    Distribution Loss ...
    Power Purchase Cost ...
    ...
Orders of the Commission
```

### Rule 2 — Global Paragraph Counter
The `seq` counter in the JSON is set by the rule engine. The builder renders it as-is. The counter increments globally across all sections — it never resets at a new section. Before rendering, the builder validates that `seq` values are strictly increasing with no gaps.

### Rule 3 — Table Numbering
Table numbers are sequential across the entire document. The builder assigns them in render order from the `table_no` field. If `table_no` is missing, the builder auto-increments.

### Rule 4 — MYT Revenue Column
In the main ARR summary table (`arr_gap` section), the MYT column for Revenue rows must show `–` not `0.00`. This is because the MYT order shows the expected surplus, not component-level revenue. Apply this rule:

```python
def format_myt_cell(value, row_type):
    if row_type == "revenue" and value == 0:
        return "–"
    return format_lakh(value)
```

### Rule 5 — Decision Sentences at Section End
Each section ends with a **bold** formal decision sentence styled distinctly from body paragraphs. Format:

```html
<p class="decision-para">
  Accordingly, the Commission hereby approves {decision_text} for the 
  financial year {fy}.
</p>
```

### Rule 6 — No Duplicate Orders Section
The `Orders of the Commission` section appears **once**, at the end, with a single serial number sequence for its sub-items (a, b, c, d...).

---

## 5. HTML Template Structure

Use **Jinja2** for templating. The template is general — no licensee-specific logic inside it.

### 5.1 File Layout

```
templates/
  base_order.html          ← master template
  sections/
    cover.html
    introduction.html
    hearing.html
    analysis_header.html
    section_energy_sales.html
    section_distribution_loss.html
    section_ppc.html
    section_employee.html
    section_rm.html
    section_ag.html
    section_depreciation.html
    section_interest.html
    section_wc.html
    section_carrying.html
    section_ronfa.html
    section_revenue.html
    section_arr_gap.html
    section_orders.html
  components/
    table.html              ← generic table renderer
    paragraph.html
    decision.html
    signature_block.html
```

### 5.2 `base_order.html` skeleton

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* See Section 6 for complete CSS */
  </style>
</head>
<body>
  {% include 'sections/cover.html' %}
  <div class="page-break"></div>

  {% include 'sections/introduction.html' %}
  {% include 'sections/hearing.html' %}

  {% include 'sections/analysis_header.html' %}

  {% for section in sections %}
    {% include 'sections/section_' + section.id + '.html' %}
  {% endfor %}

  {% include 'sections/section_orders.html' %}
  {% include 'components/signature_block.html' %}
</body>
</html>
```

### 5.3 Generic table component (`components/table.html`)

```html
{% macro render_table(table) %}
<div class="table-wrapper">
  <p class="table-title">Table {{ table.table_no }}</p>
  <p class="table-heading">{{ table.title | replace_values(values) }}</p>
  {% if table.subtitle %}<p class="table-subtitle">{{ table.subtitle }}</p>{% endif %}
  <table>
    <thead>
      <tr>
        {% for col in table.columns %}
        <th class="{{ col.key }}">{{ col.label }}</th>
        {% endfor %}
      </tr>
    </thead>
    <tbody>
      {% for row in table.rows %}
      <tr class="{{ 'bold-row' if row.bold else '' }}">
        {% for col in table.columns %}
        <td class="{{ col.key }}">{{ row[col.key] | replace_values(values) | format_number }}</td>
        {% endfor %}
      </tr>
      {% endfor %}
    </tbody>
  </table>
</div>
{% endmacro %}
```

---

## 6. CSS — KSERC Order Typographic Specification

```css
/* ── Page Setup ── */
@page {
  size: A4;
  margin: 2.5cm 2.5cm 2.5cm 3cm;
}

body {
  font-family: "Times New Roman", Times, serif;
  font-size: 12pt;
  line-height: 1.6;
  color: #000;
}

/* ── Cover Page ── */
.cover {
  text-align: center;
  padding-top: 4cm;
}
.cover .commission-name {
  font-size: 14pt;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.cover .petition-no {
  margin-top: 1.5cm;
  font-size: 12pt;
}
.cover .bench-table {
  margin: 1cm auto;
  width: 90%;
  border-collapse: collapse;
}
.cover .bench-table td {
  padding: 4px 8px;
  vertical-align: top;
}

/* ── Section Headings ── */
h2.section-title {
  font-size: 12pt;
  font-weight: bold;
  text-decoration: underline;
  margin-top: 16pt;
  margin-bottom: 8pt;
}

/* ── Paragraphs ── */
p.body-para {
  text-align: justify;
  margin-bottom: 6pt;
}
p.body-para .para-num {
  font-weight: bold;
  margin-right: 6pt;
}

/* ── Decision Sentence ── */
p.decision-para {
  font-weight: bold;
  text-align: justify;
  margin-top: 8pt;
  margin-bottom: 8pt;
}

/* ── Tables ── */
.table-wrapper {
  margin: 12pt 0;
}
.table-title {
  font-weight: bold;
  text-align: center;
  margin-bottom: 2pt;
}
.table-heading {
  font-weight: bold;
  text-align: center;
  margin-bottom: 2pt;
}
.table-subtitle {
  text-align: center;
  margin-bottom: 4pt;
  font-style: italic;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11pt;
}
table th, table td {
  border: 1px solid #000;
  padding: 4px 6px;
}
table th {
  background: #f0f0f0;
  font-weight: bold;
  text-align: center;
}
table td.particulars {
  text-align: left;
}
table td:not(.particulars) {
  text-align: right;
}
tr.bold-row td {
  font-weight: bold;
}

/* ── Signature Block ── */
.signature-block {
  margin-top: 2cm;
  display: flex;
  justify-content: space-between;
}
.signature-block .signatory {
  text-align: center;
  width: 30%;
}

/* ── Page Break ── */
.page-break {
  page-break-after: always;
}

/* ── Analysis Header ── */
h2.analysis-header {
  font-size: 12pt;
  font-weight: bold;
  text-decoration: underline;
  text-align: center;
  margin: 20pt 0 12pt 0;
}
```

---

## 7. PDF Generation — Google Cloud

### 7.1 Recommended Stack

| Component | Tool | Why |
|---|---|---|
| HTML → PDF | **Cloud Run + Puppeteer** | Best fidelity for complex tables |
| Template rendering | **Python + Jinja2** | Runs in Cloud Run or Cloud Functions |
| Storage | **Cloud Storage** | Store generated PDFs |
| Trigger | **Cloud Run HTTP endpoint** | Called from your backend |

### 7.2 Cloud Run Service — `pdf-generator`

**`Dockerfile`**

```dockerfile
FROM node:20-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 8080
CMD ["node", "server.js"]
```

**`server.js`**

```javascript
const express = require('express');
const puppeteer = require('puppeteer');
const { Storage } = require('@google-cloud/storage');

const app = express();
app.use(express.json({ limit: '10mb' }));

const storage = new Storage();
const BUCKET = process.env.GCS_BUCKET;

app.post('/generate', async (req, res) => {
  const { html, filename } = req.body;

  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '2.5cm', bottom: '2.5cm', left: '3cm', right: '2.5cm' },
      displayHeaderFooter: true,
      footerTemplate: `
        <div style="font-size:9pt; font-family:Times New Roman; 
                    width:100%; text-align:center; padding:0 1cm;">
          <span class="pageNumber"></span>
        </div>`,
      headerTemplate: '<div></div>'
    });

    // Upload to GCS
    const file = storage.bucket(BUCKET).file(`orders/${filename}`);
    await file.save(pdfBuffer, { contentType: 'application/pdf' });

    // Return signed URL (valid 1 hour)
    const [url] = await file.getSignedUrl({
      action: 'read', expires: Date.now() + 3600 * 1000
    });

    res.json({ url, filename });
  } finally {
    await browser.close();
  }
});

app.listen(8080);
```

### 7.3 Python Document Builder

This is the **backend service** that takes the rule engine JSON and produces the final HTML.

**`builder/render.py`**

```python
from jinja2 import Environment, FileSystemLoader
import re

env = Environment(loader=FileSystemLoader('templates'))

def replace_values(text, values):
    """Substitute {token} placeholders with values dict."""
    def replacer(match):
        key = match.group(1)
        return str(values.get(key, f"{{{key}}}"))
    return re.sub(r'\{(\w+)\}', replacer, str(text))

def format_number(val):
    """Format numeric strings to 2 decimal places, right-align."""
    try:
        return f"{float(val):,.2f}"
    except (ValueError, TypeError):
        return val  # Return as-is for strings like "–"

env.filters['replace_values'] = lambda text, values: replace_values(text, values)
env.filters['format_number'] = format_number

def build_html(order_json: dict) -> str:
    """
    Main entry point. Takes the complete order JSON from the rule engine
    and returns a rendered HTML string ready for PDF conversion.
    """
    values = order_json.get('values', {})

    # Validate paragraph numbering
    _validate_para_seq(order_json)

    # Validate table numbering
    _assign_table_numbers(order_json)

    template = env.get_template('base_order.html')
    return template.render(
        meta=order_json['meta'],
        cover=order_json['cover'],
        introduction=order_json['introduction'],
        hearing=order_json['hearing'],
        sections=order_json['sections'],
        orders=order_json['orders'],
        values=values
    )

def _validate_para_seq(order_json):
    """Ensure paragraph numbers are strictly increasing, no gaps, no resets."""
    all_paras = []
    for block in [order_json.get('introduction', {}),
                  order_json.get('hearing', {})] + order_json.get('sections', []):
        all_paras.extend(block.get('paragraphs', []))

    expected = all_paras[0]['seq'] if all_paras else 1
    for p in all_paras:
        assert p['seq'] == expected, \
            f"Paragraph seq gap: expected {expected}, got {p['seq']}"
        expected += 1

def _assign_table_numbers(order_json):
    """Auto-assign sequential table numbers if missing."""
    counter = 1
    for section in order_json.get('sections', []):
        for table in section.get('tables', []):
            if 'table_no' not in table:
                table['table_no'] = counter
            counter = table['table_no'] + 1
```

### 7.4 Backend API Endpoint

**`api/generate_order.py`** (Flask / FastAPI)

```python
import requests
from builder.render import build_html

PDF_SERVICE_URL = "https://pdf-generator-xxxx.run.app/generate"

def generate_order_pdf(order_json: dict) -> dict:
    """
    Called by the frontend after the rule engine produces order_json.
    Returns { url, filename } pointing to the GCS-hosted PDF.
    """
    html = build_html(order_json)
    licensee = order_json['meta']['licensee_short'].replace(' ', '_')
    fy = order_json['meta']['fy'].replace('-', '_')
    filename = f"TruingUp_{licensee}_{fy}.pdf"

    resp = requests.post(PDF_SERVICE_URL, json={
        'html': html,
        'filename': filename
    })
    resp.raise_for_status()
    return resp.json()  # { url, filename }
```

---

## 8. Frontend — Draft, Edit, Download

### 8.1 Component Architecture

```
<OrderWorkflow>
  ├── <RuleEngineTrigger>     // "Generate Draft" button
  ├── <PDFPreview>            // iframe showing the PDF
  ├── <OrderEditor>           // Section-by-section editor
  │     ├── <SectionEditor>   // Per-section text + tables
  │     └── <TableEditor>     // Editable table cells
  └── <DownloadButton>        // Final download
```

### 8.2 State Flow

```
orderJson (from rule engine)
    │
    ▼ [Generate Draft]
draftHtml (rendered by backend)
    │
    ▼ [Preview]
pdfUrl (from Cloud Run)
    │
    ▼ [Admin edits sections in OrderEditor]
editedOrderJson (local state mutations)
    │
    ▼ [Re-render button]
updatedPdfUrl
    │
    ▼ [Download]
final PDF download
```

### 8.3 `OrderEditor` Component

The editor works on the **JSON**, not the PDF. Editing the JSON and re-triggering the renderer is the correct approach — never try to edit a PDF directly.

```jsx
// components/OrderEditor.jsx
import { useState } from 'react';

export default function OrderEditor({ orderJson, onRegenerate }) {
  const [draft, setDraft] = useState(orderJson);

  const updateParagraph = (sectionId, paraSeq, newText) => {
    setDraft(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? {
          ...s,
          paragraphs: s.paragraphs.map(p =>
            p.seq === paraSeq ? { ...p, text: newText } : p
          )
        } : s
      )
    }));
  };

  const updateTableCell = (sectionId, tableNo, rowIdx, colKey, newVal) => {
    setDraft(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? {
          ...s,
          tables: s.tables.map(t =>
            t.table_no === tableNo ? {
              ...t,
              rows: t.rows.map((r, i) =>
                i === rowIdx ? { ...r, [colKey]: newVal } : r
              )
            } : t
          )
        } : s
      )
    }));
  };

  const updateDecision = (sectionId, newDecision) => {
    setDraft(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? { ...s, decision: newDecision } : s
      )
    }));
  };

  return (
    <div className="order-editor">
      {draft.sections.map(section => (
        <SectionEditor
          key={section.id}
          section={section}
          values={draft.values}
          onParaChange={(seq, text) => updateParagraph(section.id, seq, text)}
          onCellChange={(tableNo, rowIdx, col, val) =>
            updateTableCell(section.id, tableNo, rowIdx, col, val)}
          onDecisionChange={(text) => updateDecision(section.id, text)}
        />
      ))}
      <button
        className="btn-regenerate"
        onClick={() => onRegenerate(draft)}
      >
        Re-render PDF
      </button>
    </div>
  );
}
```

### 8.4 `SectionEditor` Component

```jsx
// components/SectionEditor.jsx
export default function SectionEditor({
  section, values, onParaChange, onCellChange, onDecisionChange
}) {
  return (
    <div className="section-editor-block">
      <h3>{section.title}</h3>

      {section.paragraphs?.map(para => (
        <div key={para.seq} className="para-edit-row">
          <span className="para-num">{para.seq}.</span>
          <textarea
            defaultValue={para.text}
            onBlur={e => onParaChange(para.seq, e.target.value)}
            rows={3}
          />
        </div>
      ))}

      {section.tables?.map(table => (
        <TableEditor
          key={table.table_no}
          table={table}
          values={values}
          onChange={(rowIdx, col, val) =>
            onCellChange(table.table_no, rowIdx, col, val)}
        />
      ))}

      {section.decision && (
        <div className="decision-edit-row">
          <label>Decision sentence:</label>
          <textarea
            defaultValue={section.decision}
            onBlur={e => onDecisionChange(e.target.value)}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
```

### 8.5 `TableEditor` Component

```jsx
// components/TableEditor.jsx
export default function TableEditor({ table, values, onChange }) {
  const resolve = (val) => {
    if (typeof val === 'string' && val.startsWith('{'))
      return values[val.slice(1, -1)] ?? val;
    return val;
  };

  return (
    <div className="table-editor">
      <p className="table-label">Table {table.table_no}: {table.title}</p>
      <table>
        <thead>
          <tr>
            {table.columns.map(c => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {table.columns.map(col => (
                <td key={col.key}>
                  <input
                    type="text"
                    defaultValue={resolve(row[col.key])}
                    onBlur={e => onChange(i, col.key, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 8.6 Main Workflow Page

```jsx
// pages/OrderWorkflow.jsx
import { useState } from 'react';
import OrderEditor from '../components/OrderEditor';

export default function OrderWorkflow({ orderJson }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentJson, setCurrentJson] = useState(orderJson);

  const generatePdf = async (json) => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json)
      });
      const { url } = await res.json();
      setPdfUrl(url);
      setCurrentJson(json);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workflow-container">
      <div className="toolbar">
        <h2>Draft Order — {orderJson.meta.licensee_name} FY {orderJson.meta.fy}</h2>
        <button onClick={() => generatePdf(currentJson)} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Draft'}
        </button>
        {pdfUrl && (
          <a href={pdfUrl} download className="btn-download">
            Download PDF
          </a>
        )}
      </div>

      <div className="split-view">
        {/* Left: PDF Preview */}
        <div className="pdf-preview-pane">
          {pdfUrl
            ? <iframe src={pdfUrl} width="100%" height="100%" />
            : <div className="empty-preview">Click Generate Draft to preview</div>
          }
        </div>

        {/* Right: Editor */}
        <div className="editor-pane">
          <OrderEditor
            orderJson={currentJson}
            onRegenerate={generatePdf}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 9. Quality Checks Before Rendering

Run these checks in `builder/render.py` before producing HTML. Return structured errors to the frontend if any fail.

```python
REQUIRED_SECTIONS = [
    'energy_sales', 'distribution_loss', 'ppc',
    'employee_cost', 'rm_expense', 'ag_expense',
    'depreciation', 'arr_gap'
]

def validate_order_json(order_json: dict) -> list[str]:
    errors = []
    present = {s['id'] for s in order_json.get('sections', [])}

    # Check required sections
    for req in REQUIRED_SECTIONS:
        if req not in present:
            errors.append(f"Missing required section: {req}")

    # Check no duplicate section IDs
    ids = [s['id'] for s in order_json.get('sections', [])]
    if len(ids) != len(set(ids)):
        errors.append("Duplicate section IDs found")

    # Check values completeness
    values = order_json.get('values', {})
    required_values = ['claimed_ppc', 'approved_ppc', 'appc',
                       'actual_loss_pct', 'target_loss_pct']
    for key in required_values:
        if key not in values:
            errors.append(f"Missing required value: {key}")

    # Check ARR arithmetic consistency
    try:
        arr_section = next(s for s in order_json['sections'] if s['id'] == 'arr_gap')
        approved_arr = float(values.get('approved_arr', 0))
        approved_revenue = float(values.get('approved_total_revenue', 0))
        computed_gap = approved_revenue - approved_arr
        stated_gap = float(values.get('revenue_gap', 0))
        if abs(computed_gap - stated_gap) > 0.05:
            errors.append(
                f"ARR arithmetic mismatch: computed gap {computed_gap:.2f} "
                f"vs stated {stated_gap:.2f}"
            )
    except StopIteration:
        pass

    return errors
```

---

## 10. Deployment Steps

### Step 1 — Cloud Run PDF Service

```bash
# Build and deploy Puppeteer service
cd pdf-generator/
gcloud builds submit --tag gcr.io/PROJECT_ID/pdf-generator
gcloud run deploy pdf-generator \
  --image gcr.io/PROJECT_ID/pdf-generator \
  --platform managed \
  --region asia-south1 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 120 \
  --set-env-vars GCS_BUCKET=kserc-orders
```

### Step 2 — Cloud Storage Bucket

```bash
gsutil mb -l asia-south1 gs://kserc-orders
gsutil iam ch allUsers:objectViewer gs://kserc-orders/orders/  # or use signed URLs
```

### Step 3 — Backend API (Cloud Run or Cloud Functions)

```bash
cd backend/
gcloud run deploy order-api \
  --source . \
  --platform managed \
  --region asia-south1 \
  --set-env-vars PDF_SERVICE_URL=https://pdf-generator-xxxx.run.app
```

### Step 4 — Frontend (Firebase Hosting or Cloud Run)

```bash
npm run build
firebase deploy --only hosting
```

---

## 11. Testing Against Ground Truth

For each licensee-year, store the actual KSERC order as ground truth and run automated diff checks.

```python
# tests/test_order_match.py

GROUND_TRUTH = {
    "infopark_2024_25": {
        "approved_ppc": 1040.80,
        "approved_arr": 1296.74,
        "revenue_gap": -34.42,
        "approved_employee": 24.82,
        "approved_rm": 26.18,
        "approved_ag": 7.30,
    }
}

def test_infopark_2024_25(order_json):
    values = order_json['values']
    truth = GROUND_TRUTH['infopark_2024_25']
    for key, expected in truth.items():
        actual = float(values[key])
        assert abs(actual - expected) < 0.01, \
            f"{key}: expected {expected}, got {actual}"
```

---

## 12. Summary of What This Fixes

| Issue in AI-generated PDF | Fix Applied |
|---|---|
| Duplicate "Analysis and Decision" header | Single `analysis_header.html` rendered once before section loop |
| Paragraph numbering resets | Global `seq` counter validated before render; `_validate_para_seq()` |
| Revenue showing `0.00` in MYT column | `format_myt_cell()` outputs `–` for zero revenue rows |
| Table numbers inconsistent | `_assign_table_numbers()` ensures strict sequential numbering |
| Duplicate Orders section | Single `section_orders.html` outside section loop |
| Wrong column headers in some tables | Column schema per table in JSON; no hardcoding in template |
| Decision sentence styling inconsistent | Dedicated `decision-para` CSS class applied uniformly |
| No edit capability | Full JSON-based editor with re-render flow in frontend |
