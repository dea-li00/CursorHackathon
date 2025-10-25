import asyncio
from typing import Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, date
import json
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from ..models import APBill, APBillLine, ExtractionMeta, ExtractionEngine
from ..config import settings


class AzureDIExtractor:
    def __init__(self):
        self.client = None
        if settings.has_azure_di:
            self.client = DocumentIntelligenceClient(
                endpoint=settings.AZURE_DI_ENDPOINT,
                credential=AzureKeyCredential(settings.AZURE_DI_KEY)
            )
    
    async def extract(self, file_path: str) -> Optional[APBill]:
        """Extract invoice data using Azure Document Intelligence"""
        if not self.client:
            return None
            
        try:
            with open(file_path, "rb") as f:
                poller = self.client.begin_analyze_document(
                    "prebuilt-invoice", 
                    document=f
                )
                result = poller.result()
            
            return self._parse_azure_result(result, file_path)
        except Exception as e:
            print(f"Azure DI extraction failed: {e}")
            return None
    
    def _parse_azure_result(self, result, file_path: str) -> APBill:
        """Parse Azure DI result into APBill format"""
        documents = result.documents
        if not documents:
            raise ValueError("No documents found in Azure DI result")
        
        doc = documents[0]
        fields = doc.fields
        
        # Extract basic fields with confidence scores
        confidence_scores = {}
        
        # Vendor information
        vendor_name = self._get_field_value(fields, "VendorName", confidence_scores)
        vendor_tax_id = self._get_field_value(fields, "VendorTaxId", confidence_scores)
        vendor_address = self._get_field_value(fields, "VendorAddress", confidence_scores)
        
        # Invoice details
        invoice_number = self._get_field_value(fields, "InvoiceId", confidence_scores)
        invoice_date = self._get_date_field(fields, "InvoiceDate", confidence_scores)
        due_date = self._get_date_field(fields, "DueDate", confidence_scores)
        
        # Financial information
        subtotal = self._get_decimal_field(fields, "SubTotal", confidence_scores)
        tax = self._get_decimal_field(fields, "TotalTax", confidence_scores)
        total = self._get_decimal_field(fields, "InvoiceTotal", confidence_scores)
        currency = self._get_field_value(fields, "Currency", confidence_scores) or "USD"
        
        # Calculate tax rate if possible
        tax_rate_pct = None
        if tax and subtotal and subtotal > 0:
            tax_rate_pct = (tax / subtotal) * 100
        
        # Extract line items
        lines = self._extract_line_items(fields, confidence_scores)
        
        # Create extraction metadata
        extraction_meta = ExtractionMeta(
            engine=ExtractionEngine.AZURE_DI,
            version="1.0",
            confidence_scores=confidence_scores,
            processing_time=0.0,  # Azure doesn't provide this
            pages_processed=1
        )
        
        # Create APBill
        bill = APBill(
            source_file_id=file_path,
            vendor_name=vendor_name or "Unknown Vendor",
            vendor_tax_id=vendor_tax_id,
            invoice_number=invoice_number or "Unknown",
            invoice_date=invoice_date or date.today(),
            due_date=due_date,
            currency=currency,
            subtotal=subtotal or Decimal("0"),
            tax=tax,
            tax_rate_pct=tax_rate_pct,
            total=total or Decimal("0"),
            lines=lines,
            extraction_meta=extraction_meta,
            validation=None,  # Will be set by validator
            workflow=None  # Will be set by orchestrator
        )
        
        return bill
    
    def _get_field_value(self, fields: Dict, field_name: str, confidence_scores: Dict) -> Optional[str]:
        """Extract string field value with confidence"""
        if field_name not in fields:
            return None
        
        field = fields[field_name]
        confidence_scores[field_name] = getattr(field, 'confidence', 0.0)
        
        if hasattr(field, 'value') and field.value:
            return str(field.value)
        return None
    
    def _get_decimal_field(self, fields: Dict, field_name: str, confidence_scores: Dict) -> Optional[Decimal]:
        """Extract decimal field value with confidence"""
        if field_name not in fields:
            return None
        
        field = fields[field_name]
        confidence_scores[field_name] = getattr(field, 'confidence', 0.0)
        
        if hasattr(field, 'value') and field.value is not None:
            try:
                return Decimal(str(field.value))
            except:
                return None
        return None
    
    def _get_date_field(self, fields: Dict, field_name: str, confidence_scores: Dict) -> Optional[date]:
        """Extract date field value with confidence"""
        if field_name not in fields:
            return None
        
        field = fields[field_name]
        confidence_scores[field_name] = getattr(field, 'confidence', 0.0)
        
        if hasattr(field, 'value') and field.value:
            try:
                if isinstance(field.value, str):
                    # Try parsing common date formats
                    for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S"]:
                        try:
                            return datetime.strptime(field.value, fmt).date()
                        except:
                            continue
                elif hasattr(field.value, 'date'):
                    return field.value.date()
            except:
                pass
        return None
    
    def _extract_line_items(self, fields: Dict, confidence_scores: Dict) -> list[APBillLine]:
        """Extract line items from Azure DI result"""
        lines = []
        
        if "Items" in fields:
            items_field = fields["Items"]
            confidence_scores["Items"] = getattr(items_field, 'confidence', 0.0)
            
            if hasattr(items_field, 'value') and items_field.value:
                for item in items_field.value:
                    if hasattr(item, 'value'):
                        item_data = item.value
                        
                        description = self._get_field_value(item_data, "Description", confidence_scores)
                        quantity = self._get_decimal_field(item_data, "Quantity", confidence_scores)
                        unit_price = self._get_decimal_field(item_data, "UnitPrice", confidence_scores)
                        amount = self._get_decimal_field(item_data, "Amount", confidence_scores)
                        
                        if description or amount:
                            lines.append(APBillLine(
                                description=description or "",
                                quantity=quantity,
                                unit_price=unit_price,
                                amount=amount or Decimal("0"),
                                sku=None,
                                cost_center=None,
                                gl_account=None,
                                tax_code=None
                            ))
        
        return lines
