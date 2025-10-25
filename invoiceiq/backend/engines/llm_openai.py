import asyncio
import base64
from typing import Dict, Any, Optional, List
from decimal import Decimal
from datetime import datetime, date
import json
from openai import AsyncOpenAI
from pdf2image import convert_from_path
from PIL import Image
import io
from ..models import APBill, APBillLine, ExtractionMeta, ExtractionEngine
from ..config import settings


class OpenAIVisionExtractor:
    def __init__(self):
        self.client = None
        if settings.has_openai:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def extract(self, file_path: str) -> Optional[APBill]:
        """Extract invoice data using OpenAI Vision"""
        if not self.client:
            return None
        
        try:
            # Convert PDF to images if needed
            images = await self._convert_to_images(file_path)
            if not images:
                return None
            
            # Extract data from images
            extracted_data = await self._extract_from_images(images)
            if not extracted_data:
                return None
            
            return self._parse_openai_result(extracted_data, file_path)
        except Exception as e:
            print(f"OpenAI Vision extraction failed: {e}")
            return None
    
    async def _convert_to_images(self, file_path: str) -> List[Image.Image]:
        """Convert PDF to images or load existing image"""
        try:
            if file_path.lower().endswith('.pdf'):
                # Convert PDF to images
                images = convert_from_path(file_path, dpi=300)
                return images
            else:
                # Load existing image
                image = Image.open(file_path)
                return [image]
        except Exception as e:
            print(f"Image conversion failed: {e}")
            return []
    
    async def _extract_from_images(self, images: List[Image.Image]) -> Optional[Dict]:
        """Extract data from images using OpenAI Vision"""
        try:
            # Convert images to base64
            image_data = []
            for img in images:
                # Resize if too large
                if img.width > 2048 or img.height > 2048:
                    img.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
                
                buffer = io.BytesIO()
                img.save(buffer, format='PNG')
                img_base64 = base64.b64encode(buffer.getvalue()).decode()
                image_data.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{img_base64}"
                    }
                })
            
            # Prepare messages
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert invoice parser. Extract invoice data and return structured JSON. Use ISO 8601 dates (YYYY-MM-DD), ISO-4217 currency codes, and decimal numbers. If totals disagree, recompute subtotal + tax. Only extract final invoice values, not quotes or proforma."
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract invoice fields from these images. Return JSON matching this schema:\n" + self._get_schema_prompt()
                        }
                    ] + image_data
                }
            ]
            
            # Call OpenAI API
            response = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                temperature=0.1,
                max_tokens=4000
            )
            
            content = response.choices[0].message.content
            if not content:
                return None
            
            # Parse JSON response
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                # Try to extract JSON from response
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                return None
                
        except Exception as e:
            print(f"OpenAI API call failed: {e}")
            return None
    
    def _get_schema_prompt(self) -> str:
        """Get schema prompt for OpenAI"""
        return """
{
  "vendor_name": "string",
  "vendor_tax_id": "string or null",
  "vendor_iban": "string or null", 
  "invoice_number": "string",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD or null",
  "po_number": "string or null",
  "currency": "ISO-4217 code",
  "subtotal": "decimal number",
  "tax": "decimal number or null",
  "tax_rate_pct": "decimal number or null",
  "total": "decimal number",
  "notes": "string or null",
  "lines": [
    {
      "description": "string",
      "quantity": "decimal number or null",
      "unit_price": "decimal number or null", 
      "amount": "decimal number",
      "sku": "string or null",
      "cost_center": "string or null",
      "gl_account": "string or null",
      "tax_code": "string or null"
    }
  ]
}
"""
    
    def _parse_openai_result(self, data: Dict, file_path: str) -> APBill:
        """Parse OpenAI result into APBill format"""
        # Extract basic fields
        vendor_name = data.get("vendor_name", "Unknown Vendor")
        vendor_tax_id = data.get("vendor_tax_id")
        vendor_iban = data.get("vendor_iban")
        invoice_number = data.get("invoice_number", "Unknown")
        
        # Parse dates
        invoice_date = self._parse_date(data.get("invoice_date"))
        due_date = self._parse_date(data.get("due_date"))
        
        # Financial fields
        currency = data.get("currency", "USD")
        subtotal = self._parse_decimal(data.get("subtotal", 0))
        tax = self._parse_decimal(data.get("tax"))
        tax_rate_pct = self._parse_decimal(data.get("tax_rate_pct"))
        total = self._parse_decimal(data.get("total", 0))
        
        # Parse line items
        lines = []
        for line_data in data.get("lines", []):
            lines.append(APBillLine(
                description=line_data.get("description", ""),
                quantity=self._parse_decimal(line_data.get("quantity")),
                unit_price=self._parse_decimal(line_data.get("unit_price")),
                amount=self._parse_decimal(line_data.get("amount", 0)),
                sku=line_data.get("sku"),
                cost_center=line_data.get("cost_center"),
                gl_account=line_data.get("gl_account"),
                tax_code=line_data.get("tax_code")
            ))
        
        # Create confidence scores (OpenAI doesn't provide these)
        confidence_scores = {
            "vendor_name": 0.85,
            "invoice_number": 0.85,
            "invoice_date": 0.85,
            "total": 0.85,
            "subtotal": 0.80,
            "tax": 0.80
        }
        
        # Create extraction metadata
        extraction_meta = ExtractionMeta(
            engine=ExtractionEngine.OPENAI_VISION,
            version="1.0",
            confidence_scores=confidence_scores,
            processing_time=0.0,
            pages_processed=1
        )
        
        # Create APBill
        bill = APBill(
            source_file_id=file_path,
            vendor_name=vendor_name,
            vendor_tax_id=vendor_tax_id,
            vendor_iban=vendor_iban,
            invoice_number=invoice_number,
            invoice_date=invoice_date or date.today(),
            due_date=due_date,
            po_number=data.get("po_number"),
            currency=currency,
            subtotal=subtotal,
            tax=tax,
            tax_rate_pct=tax_rate_pct,
            total=total,
            notes=data.get("notes"),
            lines=lines,
            extraction_meta=extraction_meta,
            validation=None,  # Will be set by validator
            workflow=None  # Will be set by orchestrator
        )
        
        return bill
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[date]:
        """Parse date string to date object"""
        if not date_str:
            return None
        
        try:
            # Try ISO format first
            if isinstance(date_str, str) and len(date_str) == 10:
                return datetime.strptime(date_str, "%Y-%m-%d").date()
            return None
        except:
            return None
    
    def _parse_decimal(self, value: Any) -> Optional[Decimal]:
        """Parse value to Decimal"""
        if value is None:
            return None
        
        try:
            if isinstance(value, (int, float)):
                return Decimal(str(value))
            elif isinstance(value, str):
                # Remove currency symbols and clean up
                cleaned = value.replace("$", "").replace(",", "").strip()
                return Decimal(cleaned)
            return None
        except:
            return None
