import pytest
import tempfile
import os
from decimal import Decimal
from datetime import date, datetime
from models import APBill, APBillLine, ExtractionMeta, ValidationResult, Workflow, ExtractionEngine, WorkflowStatus
from export_excel import ExcelExporter


class TestExcelExporter:
    def setup_method(self):
        self.exporter = ExcelExporter()
        # Use temporary directory for exports
        self.exporter.export_dir = tempfile.mkdtemp()
    
    def teardown_method(self):
        # Clean up temporary files
        import shutil
        shutil.rmtree(self.exporter.export_dir, ignore_errors=True)
    
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
                    description="Test Item 1",
                    quantity=Decimal("2"),
                    unit_price=Decimal("500.00"),
                    amount=Decimal("1000.00")
                )
            ],
            "extraction_meta": ExtractionMeta(
                engine=ExtractionEngine.LAYOUT_OCR,
                version="1.0",
                confidence_scores={"vendor_name": 0.9, "total": 0.95}
            ),
            "validation": ValidationResult(status="passed"),
            "workflow": Workflow(status=WorkflowStatus.APPROVED),
            "created_at": datetime(2024, 1, 15, 10, 0, 0),
            "updated_at": datetime(2024, 1, 15, 10, 0, 0)
        }
        defaults.update(kwargs)
        return APBill(**defaults)
    
    def test_create_headers_dataframe(self):
        """Test headers dataframe creation"""
        bill = self.create_sample_bill()
        df = self.exporter._create_headers_dataframe([bill])
        
        assert len(df) == 1
        assert df.iloc[0]['vendor_name'] == "Test Vendor"
        assert df.iloc[0]['invoice_number'] == "INV-001"
        assert df.iloc[0]['total'] == 1100.0
        assert df.iloc[0]['status'] == "approved"
    
    def test_create_lines_dataframe(self):
        """Test lines dataframe creation"""
        bill = self.create_sample_bill()
        df = self.exporter._create_lines_dataframe([bill])
        
        assert len(df) == 1
        assert df.iloc[0]['bill_id'] == "test-bill-1"
        assert df.iloc[0]['description'] == "Test Item 1"
        assert df.iloc[0]['quantity'] == 2.0
        assert df.iloc[0]['unit_price'] == 500.0
        assert df.iloc[0]['amount'] == 1000.0
    
    def test_export_bills(self):
        """Test Excel export functionality"""
        bill1 = self.create_sample_bill(id="bill-1", vendor_name="Vendor 1")
        bill2 = self.create_sample_bill(id="bill-2", vendor_name="Vendor 2")
        
        filepath = self.exporter.export_bills([bill1, bill2])
        
        assert os.path.exists(filepath)
        assert filepath.endswith('.xlsx')
        
        # Verify file can be opened (basic check)
        import pandas as pd
        headers_df = pd.read_excel(filepath, sheet_name='AP_Bill_Headers')
        lines_df = pd.read_excel(filepath, sheet_name='AP_Bill_Lines')
        
        assert len(headers_df) == 2
        assert len(lines_df) == 2
        assert 'Vendor 1' in headers_df['vendor_name'].values
        assert 'Vendor 2' in headers_df['vendor_name'].values
    
    def test_export_summary(self):
        """Test export summary generation"""
        bill1 = self.create_sample_bill(id="bill-1", total=Decimal("1000.00"), currency="USD")
        bill2 = self.create_sample_bill(id="bill-2", total=Decimal("2000.00"), currency="EUR")
        
        summary = self.exporter.get_export_summary([bill1, bill2])
        
        assert summary['total_bills'] == 2
        assert summary['total_amount'] == 3000.0
        assert summary['status_counts']['approved'] == 2
        assert summary['currency_counts']['USD'] == 1
        assert summary['currency_counts']['EUR'] == 1
        assert 'export_timestamp' in summary
    
    def test_export_empty_bills(self):
        """Test export with empty bills list"""
        filepath = self.exporter.export_bills([])
        
        assert os.path.exists(filepath)
        
        # Should create empty sheets
        import pandas as pd
        headers_df = pd.read_excel(filepath, sheet_name='AP_Bill_Headers')
        lines_df = pd.read_excel(filepath, sheet_name='AP_Bill_Lines')
        
        assert len(headers_df) == 0
        assert len(lines_df) == 0
