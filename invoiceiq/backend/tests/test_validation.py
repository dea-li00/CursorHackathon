import pytest
from decimal import Decimal
from datetime import date
from models import APBill, APBillLine, ExtractionMeta, ValidationResult, Workflow, ExtractionEngine
from validate import InvoiceValidator


class TestInvoiceValidator:
    def setup_method(self):
        self.validator = InvoiceValidator()
    
    def create_sample_bill(self, **kwargs):
        """Create a sample APBill for testing"""
        defaults = {
            "id": "test-bill-1",
            "source_file_id": "test-file.pdf",
            "vendor_name": "Test Vendor",
            "vendor_tax_id": "12-3456789",
            "invoice_number": "INV-001",
            "invoice_date": date(2024, 1, 15),
            "due_date": date(2024, 2, 15),
            "currency": "USD",
            "subtotal": Decimal("1000.00"),
            "tax": Decimal("100.00"),
            "total": Decimal("1100.00"),
            "lines": [
                APBillLine(
                    description="Test Item",
                    quantity=Decimal("1"),
                    unit_price=Decimal("1000.00"),
                    amount=Decimal("1000.00")
                )
            ],
            "extraction_meta": ExtractionMeta(
                engine=ExtractionEngine.LAYOUT_OCR,
                version="1.0",
                confidence_scores={"vendor_name": 0.9, "total": 0.95}
            ),
            "validation": ValidationResult(status="passed"),
            "workflow": Workflow(status="new")
        }
        defaults.update(kwargs)
        return APBill(**defaults)
    
    def test_validate_success(self):
        """Test successful validation"""
        bill = self.create_sample_bill()
        result = self.validator.validate(bill)
        
        assert result.status == "passed"
        assert len(result.errors) == 0
        assert not result.is_duplicate
    
    def test_validate_missing_vendor_name(self):
        """Test validation with missing vendor name"""
        bill = self.create_sample_bill(vendor_name="")
        result = self.validator.validate(bill)
        
        assert result.status == "failed"
        assert "Vendor name is required" in result.errors
    
    def test_validate_missing_invoice_number(self):
        """Test validation with missing invoice number"""
        bill = self.create_sample_bill(invoice_number="")
        result = self.validator.validate(bill)
        
        assert result.status == "failed"
        assert "Invoice number is required" in result.errors
    
    def test_validate_missing_total(self):
        """Test validation with missing total"""
        bill = self.create_sample_bill(total=Decimal("0"))
        result = self.validator.validate(bill)
        
        assert result.status == "failed"
        assert "Total amount must be greater than zero" in result.errors
    
    def test_validate_due_date_before_invoice_date(self):
        """Test validation with due date before invoice date"""
        bill = self.create_sample_bill(
            invoice_date=date(2024, 1, 15),
            due_date=date(2024, 1, 10)
        )
        result = self.validator.validate(bill)
        
        assert result.status == "failed"
        assert "Due date cannot be before invoice date" in result.errors
    
    def test_validate_unsupported_currency(self):
        """Test validation with unsupported currency"""
        bill = self.create_sample_bill(currency="XYZ")
        result = self.validator.validate(bill)
        
        assert result.status == "warnings"
        assert "Unsupported currency" in result.warnings[0]
    
    def test_validate_total_mismatch(self):
        """Test validation with total mismatch"""
        bill = self.create_sample_bill(
            subtotal=Decimal("1000.00"),
            tax=Decimal("100.00"),
            total=Decimal("1200.00")  # Should be 1100.00
        )
        result = self.validator.validate(bill)
        
        assert result.status == "warnings"
        assert "Subtotal + tax does not equal total" in result.warnings[0]
    
    def test_duplicate_detection(self):
        """Test duplicate detection"""
        bill1 = self.create_sample_bill(id="bill-1")
        bill2 = self.create_sample_bill(id="bill-2")
        
        # First bill should not be duplicate
        result1 = self.validator.validate(bill1)
        assert not result1.is_duplicate
        
        # Second identical bill should be duplicate
        result2 = self.validator.validate(bill2)
        assert result2.is_duplicate
        assert result2.status == "failed"
    
    def test_normalize_vendor_name(self):
        """Test vendor name normalization"""
        bill = self.create_sample_bill(vendor_name="  test vendor  ")
        normalized = self.validator.normalize(bill)
        
        assert normalized.vendor_name == "Test Vendor"
    
    def test_normalize_invoice_number(self):
        """Test invoice number normalization"""
        bill = self.create_sample_bill(invoice_number="  inv-001  ")
        normalized = self.validator.normalize(bill)
        
        assert normalized.invoice_number == "INV-001"
    
    def test_normalize_currency(self):
        """Test currency normalization"""
        bill = self.create_sample_bill(currency="$")
        normalized = self.validator.normalize(bill)
        
        assert normalized.currency == "USD"
    
    def test_normalize_amounts(self):
        """Test amount normalization"""
        bill = self.create_sample_bill(
            subtotal="1000.50",
            tax="100.25",
            total="1100.75"
        )
        normalized = self.validator.normalize(bill)
        
        assert normalized.subtotal == Decimal("1000.50")
        assert normalized.tax == Decimal("100.25")
        assert normalized.total == Decimal("1100.75")
    
    def test_parse_date_string(self):
        """Test date string parsing"""
        # Test various date formats
        test_dates = [
            ("2024-01-15", date(2024, 1, 15)),
            ("01/15/2024", date(2024, 1, 15)),
            ("15/01/2024", date(2024, 1, 15)),
            ("2024-01-15T10:30:00", date(2024, 1, 15)),
            ("invalid-date", None)
        ]
        
        for date_str, expected in test_dates:
            result = self.validator._parse_date(date_str)
            assert result == expected
