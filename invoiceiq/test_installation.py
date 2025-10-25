#!/usr/bin/env python3
"""
Test script to verify InvoiceIQ installation
"""
import sys
import os
from pathlib import Path

def test_imports():
    """Test that all required modules can be imported"""
    print("Testing imports...")
    
    try:
        # Test backend imports
        sys.path.insert(0, str(Path(__file__).parent / "backend"))
        
        from models import APBill, APBillLine, ExtractionEngine
        from engines import ExtractionOrchestrator
        from validate import InvoiceValidator
        from export_excel import ExcelExporter
        from config import settings
        
        print("✅ Backend imports successful")
        return True
    except ImportError as e:
        print(f"❌ Backend import failed: {e}")
        return False

def test_configuration():
    """Test configuration loading"""
    print("Testing configuration...")
    
    try:
        from config import settings
        
        print(f"  Engine priority: {settings.ENGINE_PRIORITY}")
        print(f"  Azure DI available: {settings.has_azure_di}")
        print(f"  OpenAI available: {settings.has_openai}")
        print(f"  Confidence thresholds: {settings.CONF_THRESHOLD_LOW} - {settings.CONF_THRESHOLD_HIGH}")
        
        print("✅ Configuration loaded successfully")
        return True
    except Exception as e:
        print(f"❌ Configuration failed: {e}")
        return False

def test_directories():
    """Test that required directories exist"""
    print("Testing directories...")
    
    required_dirs = [
        "backend",
        "frontend", 
        "data/fixtures",
        "scripts"
    ]
    
    all_exist = True
    for dir_path in required_dirs:
        if Path(dir_path).exists():
            print(f"  ✅ {dir_path}")
        else:
            print(f"  ❌ {dir_path}")
            all_exist = False
    
    return all_exist

def test_sample_data():
    """Test sample data files"""
    print("Testing sample data...")
    
    sample_files = [
        "data/fixtures/vendors.csv",
        "data/fixtures/pos.csv",
        "data/fixtures/sample_invoices/sample_invoice_1.txt"
    ]
    
    all_exist = True
    for file_path in sample_files:
        if Path(file_path).exists():
            print(f"  ✅ {file_path}")
        else:
            print(f"  ❌ {file_path}")
            all_exist = False
    
    return all_exist

def main():
    """Run all tests"""
    print("🧪 InvoiceIQ Installation Test")
    print("=" * 40)
    
    tests = [
        test_directories,
        test_sample_data,
        test_imports,
        test_configuration
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 40)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! InvoiceIQ is ready to use.")
        print("\nNext steps:")
        print("1. Edit .env file with your API keys (optional)")
        print("2. Run: ./start.sh")
        print("3. Open http://localhost:3000")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
