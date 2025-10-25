import os
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import aiofiles
from pathlib import Path

from models import (
    APBill, FileUpload, ExtractionRequest, BillUpdate, ExportRequest, 
    BillSummary, WorkflowStatus
)
from database import get_session, create_db_and_tables
from config import settings
from engines import ExtractionOrchestrator
from validate import InvoiceValidator
from export_excel import ExcelExporter

# Create FastAPI app
app = FastAPI(
    title="InvoiceIQ API",
    description="Invoice processing and extraction API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
extractor = ExtractionOrchestrator()
validator = InvoiceValidator()
exporter = ExcelExporter()

# Create directories
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EXPORT_DIR, exist_ok=True)

# In-memory storage for demo (replace with database in production)
bills_storage: dict[str, APBill] = {}
files_storage: dict[str, FileUpload] = {}

@app.on_event("startup")
async def startup_event():
    """Initialize database and create tables"""
    create_db_and_tables()

@app.post("/api/files", response_model=List[str])
async def upload_files(files: List[UploadFile] = File(...)):
    """Upload invoice files"""
    file_ids = []
    
    for file in files:
        # Validate file type
        if not file.content_type.startswith(('image/', 'application/pdf')):
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {file.content_type}"
            )
        
        # Generate unique filename
        file_id = str(datetime.now().timestamp()).replace('.', '')
        file_extension = Path(file.filename).suffix
        filename = f"{file_id}{file_extension}"
        file_path = os.path.join(settings.UPLOAD_DIR, filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Store file metadata
        file_upload = FileUpload(
            id=file_id,
            filename=file.filename,
            content_type=file.content_type,
            size=len(content),
            file_path=file_path
        )
        files_storage[file_id] = file_upload
        file_ids.append(file_id)
    
    return file_ids

@app.post("/api/extract", response_model=List[BillSummary])
async def extract_invoices(request: ExtractionRequest):
    """Extract invoice data from uploaded files"""
    results = []
    
    for file_id in request.file_ids:
        if file_id not in files_storage:
            continue
        
        file_upload = files_storage[file_id]
        
        try:
            # Extract invoice data
            bill = await extractor.extract(file_upload.file_path)
            if not bill:
                continue
            
            # Normalize and validate
            bill = validator.normalize(bill)
            bill.validation = validator.validate(bill)
            
            # Set workflow status based on validation
            if bill.validation.status.value == "failed":
                bill.workflow.status = WorkflowStatus.NEEDS_REVIEW
            elif bill.validation.status.value == "warnings":
                bill.workflow.status = WorkflowStatus.NEEDS_REVIEW
            else:
                bill.workflow.status = WorkflowStatus.APPROVED
            
            # Add workflow history
            validator.add_workflow_history(bill, "extracted", f"Extracted using {bill.extraction_meta.engine.value}")
            
            # Store bill
            bills_storage[bill.id] = bill
            
            # Create summary
            confidence = sum(bill.extraction_meta.confidence_scores.values()) / len(bill.extraction_meta.confidence_scores) if bill.extraction_meta.confidence_scores else 0.5
            
            summary = BillSummary(
                id=bill.id,
                vendor_name=bill.vendor_name,
                invoice_number=bill.invoice_number,
                invoice_date=bill.invoice_date,
                total=bill.total,
                currency=bill.currency,
                status=bill.workflow.status,
                engine=bill.extraction_meta.engine,
                confidence=confidence,
                created_at=bill.created_at
            )
            results.append(summary)
            
        except Exception as e:
            print(f"Extraction failed for {file_id}: {e}")
            continue
    
    return results

@app.get("/api/bills", response_model=List[BillSummary])
async def list_bills(
    status: Optional[WorkflowStatus] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=1000)
):
    """List bills with optional filtering"""
    bills = list(bills_storage.values())
    
    # Filter by status
    if status:
        bills = [b for b in bills if b.workflow.status == status]
    
    # Filter by search term
    if search:
        search_lower = search.lower()
        bills = [b for b in bills if 
                search_lower in b.vendor_name.lower() or 
                search_lower in b.invoice_number.lower()]
    
    # Sort by created date (newest first)
    bills.sort(key=lambda x: x.created_at, reverse=True)
    
    # Limit results
    bills = bills[:limit]
    
    # Convert to summaries
    summaries = []
    for bill in bills:
        confidence = sum(bill.extraction_meta.confidence_scores.values()) / len(bill.extraction_meta.confidence_scores) if bill.extraction_meta.confidence_scores else 0.5
        
        summary = BillSummary(
            id=bill.id,
            vendor_name=bill.vendor_name,
            invoice_number=bill.invoice_number,
            invoice_date=bill.invoice_date,
            total=bill.total,
            currency=bill.currency,
            status=bill.workflow.status,
            engine=bill.extraction_meta.engine,
            confidence=confidence,
            created_at=bill.created_at
        )
        summaries.append(summary)
    
    return summaries

@app.get("/api/bills/{bill_id}", response_model=APBill)
async def get_bill(bill_id: str):
    """Get full bill details"""
    if bill_id not in bills_storage:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    return bills_storage[bill_id]

@app.patch("/api/bills/{bill_id}", response_model=APBill)
async def update_bill(bill_id: str, update: BillUpdate):
    """Update bill fields"""
    if bill_id not in bills_storage:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    bill = bills_storage[bill_id]
    
    # Update fields
    update_dict = update.dict(exclude_unset=True)
    for field, value in update_dict.items():
        if hasattr(bill, field):
            setattr(bill, field, value)
    
    # Re-validate
    bill = validator.normalize(bill)
    bill.validation = validator.validate(bill)
    
    # Add workflow history
    validator.add_workflow_history(bill, "updated", f"Updated fields: {list(update_dict.keys())}")
    bill.updated_at = datetime.utcnow()
    
    return bill

@app.post("/api/bills/{bill_id}/approve", response_model=APBill)
async def approve_bill(bill_id: str):
    """Approve bill"""
    if bill_id not in bills_storage:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    bill = bills_storage[bill_id]
    bill.workflow.status = WorkflowStatus.APPROVED
    
    # Add workflow history
    validator.add_workflow_history(bill, "approved", "Bill approved for export")
    bill.updated_at = datetime.utcnow()
    
    return bill

@app.post("/api/export/excel")
async def export_excel(request: ExportRequest):
    """Export bills to Excel"""
    # Get bills to export
    if request.ids:
        bills = [bills_storage[bid] for bid in request.ids if bid in bills_storage]
    else:
        # Export all approved or needs_review bills
        bills = [b for b in bills_storage.values() 
                if b.workflow.status in [WorkflowStatus.APPROVED, WorkflowStatus.NEEDS_REVIEW]]
    
    if not bills:
        raise HTTPException(status_code=400, detail="No bills to export")
    
    # Export to Excel
    filepath = exporter.export_bills(bills)
    
    # Update status to exported
    for bill in bills:
        bill.workflow.status = WorkflowStatus.EXPORTED
        validator.add_workflow_history(bill, "exported", f"Exported to {os.path.basename(filepath)}")
        bill.updated_at = datetime.utcnow()
    
    return {"filepath": filepath, "filename": os.path.basename(filepath)}

@app.get("/api/export/download/{filename}")
async def download_export(filename: str):
    """Download exported Excel file"""
    filepath = os.path.join(settings.EXPORT_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        filepath, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename
    )

@app.post("/api/reextract/{bill_id}")
async def reextract_bill(bill_id: str, engine: Optional[str] = None):
    """Re-extract bill with specific engine"""
    if bill_id not in bills_storage:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    bill = bills_storage[bill_id]
    file_path = bill.source_file_id
    
    # Re-extract
    new_bill = await extractor.reextract(file_path, engine)
    if not new_bill:
        raise HTTPException(status_code=400, detail="Re-extraction failed")
    
    # Update bill with new data
    new_bill.id = bill_id  # Keep same ID
    new_bill.workflow = bill.workflow  # Keep existing workflow
    new_bill.created_at = bill.created_at  # Keep original creation time
    
    # Normalize and validate
    new_bill = validator.normalize(new_bill)
    new_bill.validation = validator.validate(new_bill)
    
    # Add workflow history
    validator.add_workflow_history(new_bill, "reextracted", f"Re-extracted using {new_bill.extraction_meta.engine.value}")
    new_bill.updated_at = datetime.utcnow()
    
    # Update storage
    bills_storage[bill_id] = new_bill
    
    return new_bill

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "engines": {
            "azure_di": settings.has_azure_di,
            "openai": settings.has_openai,
            "tesseract": True  # Assume available
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
