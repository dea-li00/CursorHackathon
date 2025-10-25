# InvoiceIQ: Invoice → Excel (AP Bills)

A production-ready invoice processing system that automatically extracts data from PDF and image invoices into normalized Accounts Payable (AP) bill format with review UI and Excel export capabilities.

## Features

- **Multi-Engine Extraction**: Azure Document Intelligence, OpenAI Vision, and OCR fallback
- **Hybrid Processing**: Automatically tries engines in priority order for best results
- **Validation & Normalization**: Duplicate detection, vendor matching, and data validation
- **Review Interface**: Edit extracted data with confidence highlighting
- **Excel Export**: Generate AP_Bills.xlsx with headers and line items sheets
- **Local-First**: Runs locally with Docker Compose or simple npm/pip commands

## Architecture

```
invoiceiq/
├── frontend/          # React + Vite + TailwindCSS
├── backend/           # FastAPI + Pydantic + SQLite
├── scripts/           # Utilities and test scripts
├── data/fixtures/     # Sample data and vendor master
└── exports/           # Generated Excel files
```

## Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd invoiceiq
   cp .env.example .env
   # Edit .env with your API keys (optional)
   ```

2. **Start services**:
   ```bash
   docker-compose up
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Option 2: Local Development

1. **Backend setup**:
   ```bash
   cd backend
   pip install -r requirements.txt
   cp ../.env.example .env
   # Edit .env with your API keys
   uvicorn main:app --reload
   ```

2. **Frontend setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Configuration

### Environment Variables

Create `.env` file with:

```env
# Engine priority (comma-separated)
ENGINE_PRIORITY=prebuilt,llm,layout

# Azure Document Intelligence (optional)
AZURE_DI_ENDPOINT=your_endpoint
AZURE_DI_KEY=your_key

# OpenAI (optional)
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini

# OCR fallback
TESSERACT_CMD=/usr/bin/tesseract

# App settings
SECRET_KEY=change-me-in-production
CONF_THRESHOLD_HIGH=0.90
CONF_THRESHOLD_LOW=0.75
PORT=8000
```

### Engine Fallback Strategy

1. **Azure Document Intelligence**: Best accuracy for structured invoices
2. **OpenAI Vision**: Good for varied layouts and handwritten text
3. **Layout OCR**: Fallback using Tesseract with rule-based parsing

The system automatically tries engines in priority order and uses the best result.

## Usage

### 1. Upload Invoices

- Drag and drop PDF or image files (PNG, JPG, JPEG)
- Supports multiple file upload
- Files are processed automatically

### 2. Review Extracted Data

- View extracted fields with confidence scores
- Edit any field that needs correction
- See validation errors and warnings
- Approve bills for export

### 3. Export to Excel

- Select bills for export
- Generate AP_Bills.xlsx with two sheets:
  - `AP_Bill_Headers`: Invoice header information
  - `AP_Bill_Lines`: Line item details

## API Endpoints

- `POST /api/files` - Upload invoice files
- `POST /api/extract` - Extract data from uploaded files
- `GET /api/bills` - List bills with filtering
- `GET /api/bills/{id}` - Get full bill details
- `PATCH /api/bills/{id}` - Update bill fields
- `POST /api/bills/{id}/approve` - Approve bill
- `POST /api/export/excel` - Export bills to Excel
- `GET /api/health` - Health check and engine status

## Data Model

### APBill (Canonical Format)

```typescript
interface APBill {
  id: string;
  vendor_name: string;
  vendor_tax_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  currency: string;
  subtotal: number;
  tax?: number;
  total: number;
  lines: APBillLine[];
  extraction_meta: ExtractionMeta;
  validation: ValidationResult;
  workflow: Workflow;
}
```

### Validation Rules

- **Blockers**: Missing invoice number, date, vendor, or total
- **Warnings**: Unknown vendor, missing PO, unusual amounts
- **Duplicates**: Detected by vendor + invoice number + total + date

## Testing

### Run Extraction Tests

```bash
cd scripts
python test_extraction.py
```

### Load Sample Data

```bash
cd scripts
python dev_seed.py
```

## Development

### Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Adding New Extraction Engines

1. Create new engine class in `backend/engines/`
2. Implement `extract(file_path: str) -> Optional[APBill]`
3. Add to `ExtractionOrchestrator`
4. Update `ENGINE_PRIORITY` in config

## Production Deployment

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with environment variables
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Setup

1. Set up Azure Document Intelligence (optional)
2. Configure OpenAI API key (optional)
3. Install Tesseract OCR
4. Set strong SECRET_KEY
5. Configure database (PostgreSQL recommended)

## Performance

- **Latency Target**: < 30s per invoice end-to-end
- **Accuracy Target**: ≥85% correct header fields
- **Concurrent Processing**: Supports multiple file uploads
- **Caching**: Extracted data cached in SQLite

## Troubleshooting

### Common Issues

1. **Tesseract not found**: Install tesseract-ocr package
2. **Azure DI errors**: Check endpoint and key configuration
3. **OpenAI errors**: Verify API key and model availability
4. **File upload fails**: Check file size and format

### Debug Mode

Set `DEBUG=true` in environment for detailed logging.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review API documentation at `/docs`
- Open an issue on GitHub
