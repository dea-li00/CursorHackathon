Cursor Super-Prompt — “InvoiceIQ: Invoice → Excel (AP Bills)”
You are an expert full-stack engineer. Build a production-ready, demoable project called InvoiceIQ that lets SMEs/NGOs upload PDFs or images of invoices and automatically extract the data into a normalized Accounts Payable (AP) bill format, with a review UI and Export to Excel.

0) Outcomes & Constraints
Primary outcome: users upload invoice files (PDF/JPG/PNG), see extracted fields, correct anything, and export to AP_Bills.xlsx (Headers and Line Items sheets).

No vendor lock-in: default to Azure Document Intelligence – Invoices if env keys exist; fallback to OpenAI Vision; final fallback to layout+OCR rules (Tesseract). All three wired and selectable via config.

Latency target: < 30s per invoice end-to-end for typical 1–2 page PDFs.

Accuracy target (MVP): ≥85% correct header fields across diverse invoices.

Local-first: should run locally via docker compose up or simple npm run dev + uvicorn.

1) Tech Stack & Repo Structure
Create a monorepo:

invoiceiq/
├─ frontend/          # React + Vite + Tailwind
├─ backend/           # FastAPI + Pydantic + Celery (optional thread/executor ok)
├─ scripts/           # utilities (e.g., sample data load)
├─ data/fixtures/     # sample invoices + vendor master CSV + PO CSV
├─ .env.example
├─ docker-compose.yml
├─ README.md
└─ LICENSE
Frontend
React + Vite + TailwindCSS

Pages/components:

Upload page (drag-drop multiple files)

Extraction preview page with confidence highlighting (green ≥0.9, amber 0.75–0.9, red <0.75)

Edit/Review form for header + line items

Batch list/table with status filters (New, Needs Review, Approved, Exported)

Button: Export to Excel

Nice touches: toast notifications, loading states, file chip list.

Backend
FastAPI

Pydantic v2 models for schemas

Dependencies: azure-ai-documentintelligence (or current SDK), openai (or Azure OpenAI), pytesseract, pdf2image, opencv-python, pandas, openpyxl, python-docx (not required, but fine), rapidfuzz, python-multipart, uvicorn, python-dotenv

Optional: celery or Python concurrent.futures for background extraction.

Storage: local filesystem for files; SQLite for metadata (use SQLModel or SQLAlchemy).

2) Environment & Config
Create .env.example with:

# Engine selection: prebuilt|llm|layout  (comma-separated priority for hybrid)
ENGINE_PRIORITY=prebuilt,llm,layout

# Azure Document Intelligence
AZURE_DI_ENDPOINT=
AZURE_DI_KEY=

# OpenAI (or Azure OpenAI) Vision
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# OCR fallback
TESSERACT_CMD=/usr/bin/tesseract

# App
SECRET_KEY=change-me
CONF_THRESHOLD_HIGH=0.90
CONF_THRESHOLD_LOW=0.75
PORT=8000
The backend should auto-detect which engines are available and use the hybrid strategy:

Try Azure DI (Invoices);

If missing fields or low confidence, OpenAI Vision;

If still low, layout+OCR rules.

3) Canonical Data Model (Pydantic)
Implement these models in backend/models.py:

APBill (canonical header + lines + meta)

APBillLine

ExtractionMeta (engine, version, per-field confidence)

ValidationResult (status, errors, warnings)

Workflow (status enum: new|needs_review|approved|exported + history)

Schema:

class APBillLine(BaseModel):
    description: str
    quantity: Decimal | None = None
    unit_price: Decimal | None = None
    amount: Decimal
    sku: str | None = None
    cost_center: str | None = None
    gl_account: str | None = None
    tax_code: str | None = None

class APBill(BaseModel):
    id: str
    source_file_id: str
    vendor_name: str
    vendor_tax_id: str | None = None   # TRN/VAT
    vendor_iban: str | None = None
    invoice_number: str
    invoice_date: date
    due_date: date | None = None
    po_number: str | None = None
    currency: str
    subtotal: Decimal
    tax: Decimal | None = None
    tax_rate_pct: Decimal | None = None
    total: Decimal
    notes: str | None = None
    lines: list[APBillLine] = []
    extraction_meta: ExtractionMeta
    validation: ValidationResult
    workflow: Workflow
4) Endpoints (FastAPI)
Implement these routes in backend/main.py:

POST /api/files — upload 1..N files (PDF/JPG/PNG). Return file IDs.

POST /api/extract — body: { file_ids: string[] }. For each, run extraction pipeline → persist APBill JSON → return minimal summaries.

GET /api/bills — list bills with filters (status, search by vendor/invoice#).

GET /api/bills/{id} — full bill JSON.

PATCH /api/bills/{id} — update fields from review UI; append to workflow history.

POST /api/bills/{id}/approve — set status → approved.

POST /api/export/excel — body: { ids?: string[] } (if omitted, export all approved|needs_review); produce /exports/AP_Bills.xlsx. Return file path for download.

POST /api/reextract/{id} — rerun extraction with next engine in priority or forced engine override (for testing).

5) Extraction Engines
Create backend/engines/:

prebuilt_azure_di.py

Use Invoices model. Map common fields to canonical. Collect per-field confidences (if provided).

llm_openai.py

For each page (as 300 DPI PNG), call Vision model with a strict function/tool JSON schema that matches APBill (header + minimal lines). Merge pages. Enforce numeric/date parsing server-side.

Include a compact prompt that instructs: “extract only invoice semantics, not quotes or proforma; return ISO dates; currency ISO-4217; recompute totals if needed.”

layout_rules.py

Use pdf2image + pytesseract + opencv to get text blocks; anchor-based heuristics to detect Invoice #, Date, Due Date, Total, Currency, and a simple line table (if obvious).

Provide confidence scores per field (lower by default than prebuilt).

Hybrid Orchestrator (backend/extract.py):

Try engines in ENGINE_PRIORITY.

Compute overall confidence = weighted avg of critical fields (invoice_number, invoice_date, vendor_name, total).

If < LOW threshold or blockers missing, try next engine.

Always return the best result with engine tag.

6) Normalization & Validation
Implement backend/validate.py:

Normalize:

Dates → ISO (disambiguate with context).

Currency → map symbols to ISO.

Recalculate totals: subtotal + tax ≈ total with epsilon.

Vendor name: fuzzy match against data/fixtures/vendors.csv by tax_id/IBAN (hard match if present) else Jaro-Winkler ≥ 0.92.

Duplicate detection: (normalized vendor, invoice_number, total, invoice_date) + SHA-256 file content hash. If dup → blocker.

Blockers: missing invoice_number/date/vendor/total; total mismatch; due_date < invoice_date; unsupported currency.

Warnings: unknown vendor; missing PO for PO-required vendors; unusual amount vs vendor median (if enough history).

Return a ValidationResult with status: passed|warnings|failed.

7) Excel Export
Create backend/export_excel.py:

Build AP_Bills.xlsx with:

Sheet AP_Bill_Headers: one row per bill (id, vendor_name, vendor_tax_id, invoice_number, invoice_date, due_date, po_number, currency, subtotal, tax, tax_rate_pct, total, status).

Sheet AP_Bill_Lines: (bill_id, line_index, description, quantity, unit_price, amount, sku, cost_center, gl_account, tax_code).

Use pandas + openpyxl; format dates and currency columns.

8) Frontend UX (React)
Upload: drag-drop area; show file chips; POST to /api/files then /api/extract.

List: table with vendor, invoice #, date, total, engine, confidence, status badges.

Detail/Review: form to edit fields (header + lines) with confidence color cues; show validation messages (errors vs warnings); buttons Approve and Save.

Export: select bills (checkbox) → call /api/export/excel → show download link.

State: use React Query or SWR.

9) Sample Data & Fixtures
Add to data/fixtures/:

8–10 invoices (mix): digital PDFs, scanned images, multi-page, different currencies; include one Arabic sample if possible.

vendors.csv with realistic columns: vendor_id,vendor_name,tax_id,iban,address,email,po_required(true/false)

pos.csv (optional for matching phase): po_number,vendor_id,sku,description,qty,unit_price,received_qty

10) Tests
Unit tests for: number/date/total parsing; duplicate detection; normalization; validator.

Integration test that runs extraction on 2 sample invoices (one digital, one scanned) and asserts canonical JSON keys present and Excel export succeeds.

11) Scripts & Docker
scripts/dev_seed.py — loads vendors.csv into SQLite.

docker-compose.yml — services for backend, frontend, and tesseract.

NPM scripts: dev, build, lint.

Python: uvicorn backend.main:app --reload.

12) README
Include:

Features, architecture diagram (ASCII is fine), engine fallback strategy.

Setup:

cp .env.example .env and fill keys if available.

Optional Azure/OpenAI; works without them via OCR fallback.

Run locally:

npm --prefix frontend install && npm --prefix frontend run dev

pip install -r backend/requirements.txt && uvicorn backend.main:app --reload

Or docker compose up.

Demo script: upload 2 invoices → review → approve → export Excel → open file.

13) LLM Extraction Prompt (for backend)
In backend/engines/llm_openai.py, define a tool/function schema that matches APBill. Provide this prompt:

System:
You are an expert invoice parser. Return only structured JSON per the provided schema. Extract invoice header and line items. Use ISO 8601 dates (YYYY-MM-DD). Use ISO-4217 currency codes. If totals disagree, recompute subtotal + tax and set tax from line items where possible. Do not include proforma or quotes; only final invoice values.

User:
Extract fields from the attached invoice image(s). If a field is not present, return null. Prefer explicit vendor names over logos. Prefer explicit “Invoice No.” over generic numbers. Return best effort for line items; if uncertain, return header-only with correct totals.

Use tool calling to enforce the JSON.

14) Acceptance Criteria
Uploading 5 mixed invoices produces 5 APBill records with status set to needs_review or approved, each with engine and overall confidence.

Editing any field updates workflow history (who/when/what changed).

Export produces exports/AP_Bills.xlsx with 2 sheets and correct row counts.

Duplicate invoices are detected and blocked with a clear error.

Runs locally without Azure/OpenAI keys using OCR fallback (reduced accuracy acceptable).

15) Nice-to-Have (time permitting, not blocking)
Per-vendor tolerance rules; PO-required vendors warning.

Batch ZIP upload; auto-split multi-invoice PDFs.

Simple login (single admin user via .env password).

Power Automate webhook that posts a Teams message on Approval.

Build all of the above now. Generate the code, install instructions, tests, and sample data. When done, summarize what you created and list the next steps to deploy.

