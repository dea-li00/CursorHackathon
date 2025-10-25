from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from uuid import uuid4


class WorkflowStatus(str, Enum):
    NEW = "new"
    NEEDS_REVIEW = "needs_review"
    APPROVED = "approved"
    EXPORTED = "exported"


class ValidationStatus(str, Enum):
    PASSED = "passed"
    WARNINGS = "warnings"
    FAILED = "failed"


class ExtractionEngine(str, Enum):
    AZURE_DI = "azure_di"
    OPENAI_VISION = "openai_vision"
    LAYOUT_OCR = "layout_ocr"


class APBillLine(BaseModel):
    description: str
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    amount: Decimal
    sku: Optional[str] = None
    cost_center: Optional[str] = None
    gl_account: Optional[str] = None
    tax_code: Optional[str] = None


class ExtractionMeta(BaseModel):
    engine: ExtractionEngine
    version: str
    confidence_scores: Dict[str, float] = Field(default_factory=dict)
    processing_time: float = 0.0
    pages_processed: int = 1


class ValidationResult(BaseModel):
    status: ValidationStatus
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None


class WorkflowHistory(BaseModel):
    timestamp: datetime
    user: str = "system"
    action: str
    details: Optional[str] = None


class Workflow(BaseModel):
    status: WorkflowStatus = WorkflowStatus.NEW
    history: List[WorkflowHistory] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class APBill(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    source_file_id: str
    vendor_name: str
    vendor_tax_id: Optional[str] = None
    vendor_iban: Optional[str] = None
    invoice_number: str
    invoice_date: date
    due_date: Optional[date] = None
    po_number: Optional[str] = None
    currency: str = "USD"
    subtotal: Decimal
    tax: Optional[Decimal] = None
    tax_rate_pct: Optional[Decimal] = None
    total: Decimal
    notes: Optional[str] = None
    lines: List[APBillLine] = Field(default_factory=list)
    extraction_meta: ExtractionMeta
    validation: ValidationResult
    workflow: Workflow
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class FileUpload(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    filename: str
    content_type: str
    size: int
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    file_path: str


class ExtractionRequest(BaseModel):
    file_ids: List[str]


class BillUpdate(BaseModel):
    vendor_name: Optional[str] = None
    vendor_tax_id: Optional[str] = None
    vendor_iban: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    po_number: Optional[str] = None
    currency: Optional[str] = None
    subtotal: Optional[Decimal] = None
    tax: Optional[Decimal] = None
    tax_rate_pct: Optional[Decimal] = None
    total: Optional[Decimal] = None
    notes: Optional[str] = None
    lines: Optional[List[APBillLine]] = None


class ExportRequest(BaseModel):
    ids: Optional[List[str]] = None


class BillSummary(BaseModel):
    id: str
    vendor_name: str
    invoice_number: str
    invoice_date: date
    total: Decimal
    currency: str
    status: WorkflowStatus
    engine: ExtractionEngine
    confidence: float
    created_at: datetime
