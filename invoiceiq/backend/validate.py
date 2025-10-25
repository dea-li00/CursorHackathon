import hashlib
import csv
from datetime import date, datetime
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from rapidfuzz import fuzz
from ..models import APBill, ValidationResult, ValidationStatus, WorkflowHistory
from ..config import settings


class InvoiceValidator:
    def __init__(self):
        self.vendors = self._load_vendors()
        self.processed_files = set()  # Track processed file hashes
    
    def _load_vendors(self) -> Dict[str, Dict]:
        """Load vendor master data"""
        vendors = {}
        try:
            with open("data/fixtures/vendors.csv", "r") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    vendor_id = row.get("vendor_id", "")
                    vendors[vendor_id] = {
                        "name": row.get("vendor_name", ""),
                        "tax_id": row.get("tax_id", ""),
                        "iban": row.get("iban", ""),
                        "address": row.get("address", ""),
                        "email": row.get("email", ""),
                        "po_required": row.get("po_required", "false").lower() == "true"
                    }
        except FileNotFoundError:
            print("Vendor master file not found, using empty vendor list")
        return vendors
    
    def validate(self, bill: APBill) -> ValidationResult:
        """Validate invoice bill"""
        errors = []
        warnings = []
        
        # Check for duplicates
        is_duplicate, duplicate_of = self._check_duplicate(bill)
        if is_duplicate:
            errors.append(f"Duplicate invoice detected: {duplicate_of}")
        
        # Validate critical fields
        if not bill.vendor_name or bill.vendor_name == "Unknown Vendor":
            errors.append("Vendor name is required")
        
        if not bill.invoice_number or bill.invoice_number == "Unknown":
            errors.append("Invoice number is required")
        
        if not bill.invoice_date:
            errors.append("Invoice date is required")
        
        if not bill.total or bill.total <= 0:
            errors.append("Total amount must be greater than zero")
        
        # Validate dates
        if bill.invoice_date and bill.due_date:
            if bill.due_date < bill.invoice_date:
                errors.append("Due date cannot be before invoice date")
        
        # Validate currency
        if bill.currency not in ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"]:
            warnings.append(f"Unsupported currency: {bill.currency}")
        
        # Validate totals
        if bill.subtotal and bill.tax and bill.total:
            calculated_total = bill.subtotal + bill.tax
            if abs(calculated_total - bill.total) > Decimal("0.01"):
                warnings.append("Subtotal + tax does not equal total")
        
        # Validate vendor
        vendor_match = self._match_vendor(bill)
        if not vendor_match:
            warnings.append("Vendor not found in master data")
        elif vendor_match.get("po_required") and not bill.po_number:
            warnings.append("PO number required for this vendor")
        
        # Determine validation status
        if errors:
            status = ValidationStatus.FAILED
        elif warnings:
            status = ValidationStatus.WARNINGS
        else:
            status = ValidationStatus.PASSED
        
        return ValidationResult(
            status=status,
            errors=errors,
            warnings=warnings,
            is_duplicate=is_duplicate,
            duplicate_of=duplicate_of
        )
    
    def _check_duplicate(self, bill: APBill) -> Tuple[bool, Optional[str]]:
        """Check if invoice is a duplicate"""
        # Create a unique key for duplicate detection
        key = f"{bill.vendor_name}|{bill.invoice_number}|{bill.total}|{bill.invoice_date}"
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        
        if key_hash in self.processed_files:
            return True, key
        else:
            self.processed_files.add(key_hash)
            return False, None
    
    def _match_vendor(self, bill: APBill) -> Optional[Dict]:
        """Match vendor against master data"""
        best_match = None
        best_score = 0.0
        
        for vendor_data in self.vendors.values():
            # Try exact matches first
            if (bill.vendor_tax_id and vendor_data.get("tax_id") and 
                bill.vendor_tax_id == vendor_data["tax_id"]):
                return vendor_data
            
            if (bill.vendor_iban and vendor_data.get("iban") and 
                bill.vendor_iban == vendor_data["iban"]):
                return vendor_data
            
            # Try fuzzy name matching
            if bill.vendor_name:
                score = fuzz.ratio(bill.vendor_name.lower(), vendor_data["name"].lower())
                if score > best_score and score >= 92:  # High threshold for name matching
                    best_match = vendor_data
                    best_score = score
        
        return best_match
    
    def normalize(self, bill: APBill) -> APBill:
        """Normalize invoice data"""
        # Normalize vendor name
        if bill.vendor_name:
            bill.vendor_name = bill.vendor_name.strip().title()
        
        # Normalize invoice number
        if bill.invoice_number:
            bill.invoice_number = bill.invoice_number.strip().upper()
        
        # Normalize currency
        currency_map = {
            "$": "USD",
            "€": "EUR", 
            "£": "GBP",
            "¥": "JPY"
        }
        if bill.currency in currency_map:
            bill.currency = currency_map[bill.currency]
        
        # Normalize dates (ensure they're proper date objects)
        if isinstance(bill.invoice_date, str):
            bill.invoice_date = self._parse_date(bill.invoice_date)
        if isinstance(bill.due_date, str):
            bill.due_date = self._parse_date(bill.due_date)
        
        # Normalize amounts (ensure they're Decimal)
        if isinstance(bill.subtotal, (int, float, str)):
            bill.subtotal = Decimal(str(bill.subtotal))
        if isinstance(bill.tax, (int, float, str)):
            bill.tax = Decimal(str(bill.tax))
        if isinstance(bill.total, (int, float, str)):
            bill.total = Decimal(str(bill.total))
        
        # Normalize line items
        for line in bill.lines:
            if isinstance(line.quantity, (int, float, str)) and line.quantity:
                line.quantity = Decimal(str(line.quantity))
            if isinstance(line.unit_price, (int, float, str)) and line.unit_price:
                line.unit_price = Decimal(str(line.unit_price))
            if isinstance(line.amount, (int, float, str)):
                line.amount = Decimal(str(line.amount))
        
        return bill
    
    def _parse_date(self, date_str: str) -> Optional[date]:
        """Parse date string to date object"""
        if not date_str:
            return None
        
        formats = [
            "%Y-%m-%d",
            "%m/%d/%Y",
            "%d/%m/%Y",
            "%Y-%m-%dT%H:%M:%S",
            "%m-%d-%Y",
            "%d-%m-%Y"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except:
                continue
        
        return None
    
    def add_workflow_history(self, bill: APBill, action: str, details: Optional[str] = None) -> None:
        """Add entry to workflow history"""
        history_entry = WorkflowHistory(
            timestamp=datetime.utcnow(),
            user="system",
            action=action,
            details=details
        )
        bill.workflow.history.append(history_entry)
        bill.workflow.updated_at = datetime.utcnow()
