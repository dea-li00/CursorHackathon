import pytest
import asyncio
from unittest.mock import Mock, patch
from models import APBill, ExtractionEngine
from engines import ExtractionOrchestrator


class TestExtractionOrchestrator:
    def setup_method(self):
        self.orchestrator = ExtractionOrchestrator()
    
    @pytest.mark.asyncio
    async def test_extract_with_no_engines(self):
        """Test extraction when no engines are available"""
        # Mock all engines to return None
        with patch.object(self.orchestrator.engines[ExtractionEngine.AZURE_DI], 'extract', return_value=None), \
             patch.object(self.orchestrator.engines[ExtractionEngine.OPENAI_VISION], 'extract', return_value=None), \
             patch.object(self.orchestrator.engines[ExtractionEngine.LAYOUT_OCR], 'extract', return_value=None):
            
            result = await self.orchestrator.extract("test_file.pdf")
            assert result is None
    
    @pytest.mark.asyncio
    async def test_extract_with_high_confidence(self):
        """Test extraction with high confidence result"""
        mock_bill = Mock()
        mock_bill.extraction_meta.confidence_scores = {
            "vendor_name": 0.95,
            "invoice_number": 0.90,
            "total": 0.95
        }
        
        with patch.object(self.orchestrator.engines[ExtractionEngine.AZURE_DI], 'extract', return_value=mock_bill):
            result = await self.orchestrator.extract("test_file.pdf")
            assert result == mock_bill
    
    def test_calculate_confidence(self):
        """Test confidence calculation"""
        mock_bill = Mock()
        mock_bill.extraction_meta.confidence_scores = {
            "vendor_name": 0.9,
            "invoice_number": 0.8,
            "invoice_date": 0.85,
            "total": 0.95,
            "subtotal": 0.7,
            "tax": 0.6
        }
        
        confidence = self.orchestrator._calculate_confidence(mock_bill)
        assert 0.7 <= confidence <= 0.9  # Should be weighted average
    
    def test_has_critical_fields(self):
        """Test critical fields check"""
        mock_bill = Mock()
        mock_bill.vendor_name = "Test Vendor"
        mock_bill.invoice_number = "INV-001"
        mock_bill.total = 100.0
        
        assert self.orchestrator._has_critical_fields(mock_bill) == True
        
        # Test with missing fields
        mock_bill.vendor_name = "Unknown Vendor"
        assert self.orchestrator._has_critical_fields(mock_bill) == False
        
        mock_bill.vendor_name = "Test Vendor"
        mock_bill.invoice_number = "Unknown"
        assert self.orchestrator._has_critical_fields(mock_bill) == False
        
        mock_bill.invoice_number = "INV-001"
        mock_bill.total = 0
        assert self.orchestrator._has_critical_fields(mock_bill) == False
