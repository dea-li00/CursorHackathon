#!/usr/bin/env python3
"""
Development seed script to load vendor master data
"""
import os
import sys
import csv
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from database import create_db_and_tables, engine
from sqlmodel import Session, text

def load_vendors():
    """Load vendor data from CSV"""
    vendors_file = Path(__file__).parent.parent / "data" / "fixtures" / "vendors.csv"
    
    if not vendors_file.exists():
        print(f"Vendor file not found: {vendors_file}")
        return
    
    print("Loading vendor master data...")
    
    # Create tables
    create_db_and_tables()
    
    # For now, just print the vendors (in production, you'd insert into database)
    with open(vendors_file, 'r') as f:
        reader = csv.DictReader(f)
        vendors = list(reader)
    
    print(f"Loaded {len(vendors)} vendors:")
    for vendor in vendors:
        print(f"  - {vendor['vendor_name']} ({vendor['vendor_id']})")
    
    print("Vendor data loaded successfully!")

if __name__ == "__main__":
    load_vendors()
