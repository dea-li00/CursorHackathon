import asyncio
import re
from typing import Dict, Any, Optional, List, Tuple
from decimal import Decimal
from datetime import datetime, date
import pytesseract
import cv2
import numpy as np
from pdf2image import convert_from_path
from PIL import Image
from ..models import APBill, APBillLine, ExtractionMeta, ExtractionEngine
from ..config import settings


class LayoutOCRExtractor:
    def __init__(self):
        # Set tesseract command if provided
        if settings.TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
    
    async def extract(self, file_path: str) -> Optional[APBill]:
        """Extract invoice data using OCR and layout rules"""
        try:
            # Convert to images
            images = await self._convert_to_images(file_path)
            if not images:
                return None
            
            # Extract text from all images
            all_text = []
            for img in images:
                text = self._extract_text_from_image(img)
                all_text.append(text)
            
            # Combine all text
            combined_text = "\n".join(all_text)
            
            # Parse using layout rules
            return self._parse_with_rules(combined_text, file_path)
        except Exception as e:
            print(f"Layout OCR extraction failed: {e}")
            return None
    
    async def _convert_to_images(self, file_path: str) -> List[Image.Image]:
        """Convert PDF to images or load existing image"""
        try:
            if file_path.lower().endswith('.pdf'):
                images = convert_from_path(file_path, dpi=300)
                return images
            else:
                image = Image.open(file_path)
                return [image]
        except Exception as e:
            print(f"Image conversion failed: {e}")
            return []
    
    def _extract_text_from_image(self, image: Image.Image) -> str:
        """Extract text from image using OCR"""
        try:
            # Convert to OpenCV format
            img_array = np.array(image)
            
            # Preprocess image for better OCR
            processed_img = self._preprocess_image(img_array)
            
            # Extract text
            text = pytesseract.image_to_string(processed_img, config='--psm 6')
            return text
        except Exception as e:
            print(f"OCR failed: {e}")
            return ""
    
    def _preprocess_image(self, img_array: np.ndarray) -> np.ndarray:
        """Preprocess image for better OCR results"""
        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Apply denoising
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # Apply threshold
        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        return thresh
    
    def _parse_with_rules(self, text: str, file_path: str) -> APBill:
        """Parse text using layout rules and heuristics"""
        lines = text.split('\n')
        
        # Extract fields using regex patterns
        vendor_name = self._extract_vendor_name(lines)
        invoice_number = self._extract_invoice_number(lines)
        invoice_date = self._extract_invoice_date(lines)
        due_date = self._extract_due_date(lines)
        currency = self._extract_currency(lines)
        subtotal = self._extract_subtotal(lines)
        tax = self._extract_tax(lines)
        total = self._extract_total(lines)
        line_items = self._extract_line_items(lines)
        
        # Calculate tax rate if possible
        tax_rate_pct = None
        if tax and subtotal and subtotal > 0:
            tax_rate_pct = (tax / subtotal) * 100
        
        # Create confidence scores (lower for OCR)
        confidence_scores = {
            "vendor_name": 0.70,
            "invoice_number": 0.75,
            "invoice_date": 0.70,
            "total": 0.80,
            "subtotal": 0.70,
            "tax": 0.65
        }
        
        # Create extraction metadata
        extraction_meta = ExtractionMeta(
            engine=ExtractionEngine.LAYOUT_OCR,
            version="1.0",
            confidence_scores=confidence_scores,
            processing_time=0.0,
            pages_processed=1
        )
        
        # Create APBill
        bill = APBill(
            source_file_id=file_path,
            vendor_name=vendor_name or "Unknown Vendor",
            vendor_tax_id=None,
            vendor_iban=None,
            invoice_number=invoice_number or "Unknown",
            invoice_date=invoice_date or date.today(),
            due_date=due_date,
            po_number=None,
            currency=currency or "USD",
            subtotal=subtotal or Decimal("0"),
            tax=tax,
            tax_rate_pct=tax_rate_pct,
            total=total or Decimal("0"),
            notes=None,
            lines=line_items,
            extraction_meta=extraction_meta,
            validation=None,  # Will be set by validator
            workflow=None  # Will be set by orchestrator
        )
        
        return bill
    
    def _extract_vendor_name(self, lines: List[str]) -> Optional[str]:
        """Extract vendor name using heuristics"""
        # Look for common vendor name patterns
        patterns = [
            r"^[A-Z][a-zA-Z\s&.,]+(?:Inc|LLC|Corp|Ltd|Company|Co\.?)$",
            r"^[A-Z][a-zA-Z\s&.,]+(?:Invoice|Bill|Statement)$",
        ]
        
        for line in lines[:10]:  # Check first 10 lines
            line = line.strip()
            if len(line) > 5 and len(line) < 100:
                for pattern in patterns:
                    if re.match(pattern, line, re.IGNORECASE):
                        return line
        
        # Fallback: look for lines that look like company names
        for line in lines[:5]:
            line = line.strip()
            if (len(line) > 10 and len(line) < 80 and 
                not re.search(r'\d', line) and 
                not re.search(r'(invoice|bill|date|total|amount)', line, re.IGNORECASE)):
                return line
        
        return None
    
    def _extract_invoice_number(self, lines: List[str]) -> Optional[str]:
        """Extract invoice number"""
        patterns = [
            r"(?:invoice|inv|bill|invoice\s*no|invoice\s*number|inv\s*no)[\s:]*([A-Z0-9\-/]+)",
            r"^([A-Z0-9\-/]{3,20})$"
        ]
        
        for line in lines:
            line = line.strip()
            for pattern in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    return match.group(1)
        
        return None
    
    def _extract_invoice_date(self, lines: List[str]) -> Optional[date]:
        """Extract invoice date"""
        date_patterns = [
            r"(?:invoice\s*date|date|bill\s*date)[\s:]*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})",
            r"(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})",
            r"(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})"
        ]
        
        for line in lines:
            for pattern in date_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    date_str = match.group(1)
                    return self._parse_date_string(date_str)
        
        return None
    
    def _extract_due_date(self, lines: List[str]) -> Optional[date]:
        """Extract due date"""
        patterns = [
            r"(?:due\s*date|payment\s*due|due)[\s:]*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})",
            r"(?:net\s*\d+)[\s:]*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})"
        ]
        
        for line in lines:
            for pattern in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    date_str = match.group(1)
                    return self._parse_date_string(date_str)
        
        return None
    
    def _extract_currency(self, lines: List[str]) -> Optional[str]:
        """Extract currency"""
        currency_patterns = [
            r"([A-Z]{3})",  # ISO codes
            r"(\$|USD|€|EUR|£|GBP|¥|JPY)"
        ]
        
        for line in lines:
            for pattern in currency_patterns:
                match = re.search(pattern, line)
                if match:
                    currency = match.group(1)
                    if currency in ['$', 'USD']:
                        return 'USD'
                    elif currency in ['€', 'EUR']:
                        return 'EUR'
                    elif currency in ['£', 'GBP']:
                        return 'GBP'
                    elif currency in ['¥', 'JPY']:
                        return 'JPY'
                    elif len(currency) == 3:
                        return currency
        
        return 'USD'  # Default
    
    def _extract_subtotal(self, lines: List[str]) -> Optional[Decimal]:
        """Extract subtotal"""
        patterns = [
            r"(?:subtotal|sub\s*total|sub\s*total)[\s:]*([\d,]+\.?\d*)",
            r"(?:before\s*tax|pre\s*tax)[\s:]*([\d,]+\.?\d*)"
        ]
        
        for line in lines:
            for pattern in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    return self._parse_amount(match.group(1))
        
        return None
    
    def _extract_tax(self, lines: List[str]) -> Optional[Decimal]:
        """Extract tax amount"""
        patterns = [
            r"(?:tax|vat|gst)[\s:]*([\d,]+\.?\d*)",
            r"(?:total\s*tax)[\s:]*([\d,]+\.?\d*)"
        ]
        
        for line in lines:
            for pattern in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    return self._parse_amount(match.group(1))
        
        return None
    
    def _extract_total(self, lines: List[str]) -> Optional[Decimal]:
        """Extract total amount"""
        patterns = [
            r"(?:total|amount\s*due|grand\s*total)[\s:]*([\d,]+\.?\d*)",
            r"^[\s]*([\d,]+\.?\d*)[\s]*$"  # Line with just a number
        ]
        
        # Look for total in various positions
        for i, line in enumerate(lines):
            for pattern in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    amount = self._parse_amount(match.group(1))
                    if amount and amount > 0:
                        return amount
        
        return None
    
    def _extract_line_items(self, lines: List[str]) -> List[APBillLine]:
        """Extract line items from text"""
        items = []
        
        # Look for table-like structures
        in_table = False
        for line in lines:
            line = line.strip()
            
            # Detect start of line items table
            if re.search(r'(description|item|qty|quantity|price|amount)', line, re.IGNORECASE):
                in_table = True
                continue
            
            # Skip empty lines
            if not line:
                continue
            
            # Look for lines that might be line items
            if in_table and self._looks_like_line_item(line):
                item = self._parse_line_item(line)
                if item:
                    items.append(item)
        
        return items
    
    def _looks_like_line_item(self, line: str) -> bool:
        """Check if line looks like a line item"""
        # Look for patterns that suggest line items
        patterns = [
            r'^\d+\.?\s+',  # Starts with number
            r'[\d,]+\.?\d*\s+[\d,]+\.?\d*',  # Has multiple numbers
            r'[A-Za-z].*\d+\.?\d*$'  # Text followed by number
        ]
        
        for pattern in patterns:
            if re.search(pattern, line):
                return True
        return False
    
    def _parse_line_item(self, line: str) -> Optional[APBillLine]:
        """Parse a line into APBillLine"""
        try:
            # Split line into parts
            parts = re.split(r'\s+', line.strip())
            
            # Look for numbers (quantity, unit price, amount)
            numbers = []
            text_parts = []
            
            for part in parts:
                if re.match(r'[\d,]+\.?\d*$', part):
                    numbers.append(self._parse_amount(part))
                else:
                    text_parts.append(part)
            
            if not numbers:
                return None
            
            # Create line item
            description = ' '.join(text_parts) if text_parts else "Line Item"
            amount = numbers[-1] if numbers else Decimal("0")
            quantity = numbers[0] if len(numbers) > 1 else None
            unit_price = numbers[1] if len(numbers) > 2 else None
            
            return APBillLine(
                description=description,
                quantity=quantity,
                unit_price=unit_price,
                amount=amount,
                sku=None,
                cost_center=None,
                gl_account=None,
                tax_code=None
            )
        except:
            return None
    
    def _parse_date_string(self, date_str: str) -> Optional[date]:
        """Parse date string to date object"""
        formats = [
            "%m/%d/%Y",
            "%d/%m/%Y", 
            "%Y-%m-%d",
            "%m-%d-%Y",
            "%d-%m-%Y"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except:
                continue
        
        return None
    
    def _parse_amount(self, amount_str: str) -> Optional[Decimal]:
        """Parse amount string to Decimal"""
        try:
            # Remove commas and currency symbols
            cleaned = re.sub(r'[,$]', '', amount_str.strip())
            return Decimal(cleaned)
        except:
            return None
