export interface APBillLine {
  description: string;
  quantity?: number;
  unit_price?: number;
  amount: number;
  sku?: string;
  cost_center?: string;
  gl_account?: string;
  tax_code?: string;
}

export interface ExtractionMeta {
  engine: string;
  version: string;
  confidence_scores: Record<string, number>;
  processing_time: number;
  pages_processed: number;
}

export interface ValidationResult {
  status: 'passed' | 'warnings' | 'failed';
  errors: string[];
  warnings: string[];
  is_duplicate: boolean;
  duplicate_of?: string;
}

export interface WorkflowHistory {
  timestamp: string;
  user: string;
  action: string;
  details?: string;
}

export interface Workflow {
  status: 'new' | 'needs_review' | 'approved' | 'exported';
  history: WorkflowHistory[];
  created_at: string;
  updated_at: string;
}

export interface APBill {
  id: string;
  source_file_id: string;
  vendor_name: string;
  vendor_tax_id?: string;
  vendor_iban?: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  po_number?: string;
  currency: string;
  subtotal: number;
  tax?: number;
  tax_rate_pct?: number;
  total: number;
  notes?: string;
  lines: APBillLine[];
  extraction_meta: ExtractionMeta;
  validation: ValidationResult;
  workflow: Workflow;
  created_at: string;
  updated_at: string;
}

export interface BillSummary {
  id: string;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  total: number;
  currency: string;
  status: 'new' | 'needs_review' | 'approved' | 'exported';
  engine: string;
  confidence: number;
  created_at: string;
}

export interface FileUpload {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  uploaded_at: string;
  file_path: string;
}
