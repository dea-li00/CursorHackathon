#!/usr/bin/env python3
"""
Test script for invoice extraction
"""
import os
import sys
import asyncio
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from engines import ExtractionOrchestrator
from validate import InvoiceValidator

async def test_extraction():
    """Test extraction on sample invoices"""
    extractor = ExtractionOrchestrator()
    validator = InvoiceValidator()
    
    # Test with sample invoice files
    sample_dir = Path(__file__).parent.parent / "data" / "fixtures" / "sample_invoices"
    
    if not sample_dir.exists():
        print("Sample invoices directory not found")
        return
    
    # Find sample files
    sample_files = list(sample_dir.glob("*.txt"))
    
    if not sample_files:
        print("No sample invoice files found")
        return
    
    print(f"Testing extraction on {len(sample_files)} sample files...")
    
    for sample_file in sample_files:
        print(f"\nTesting: {sample_file.name}")
        
        try:
            # Extract invoice data
            bill = await extractor.extract(str(sample_file))
            
            if bill:
                print(f"  ✓ Extraction successful")
                print(f"  Vendor: {bill.vendor_name}")
                print(f"  Invoice #: {bill.invoice_number}")
                print(f"  Total: {bill.currency} {bill.total}")
                print(f"  Engine: {bill.extraction_meta.engine}")
                
                # Validate
                bill = validator.normalize(bill)
                validation = validator.validate(bill)
                
                print(f"  Validation: {validation.status}")
                if validation.errors:
                    print(f"  Errors: {validation.errors}")
                if validation.warnings:
                    print(f"  Warnings: {validation.warnings}")
            else:
                print(f"  ✗ Extraction failed")
                
        except Exception as e:
            print(f"  ✗ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_extraction())
