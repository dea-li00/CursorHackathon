import asyncio
from typing import Optional, List
from ..models import APBill, ExtractionEngine
from ..config import settings
from .prebuilt_azure_di import AzureDIExtractor
from .llm_openai import OpenAIVisionExtractor
from .layout_rules import LayoutOCRExtractor


class ExtractionOrchestrator:
    def __init__(self):
        self.engines = {
            ExtractionEngine.AZURE_DI: AzureDIExtractor(),
            ExtractionEngine.OPENAI_VISION: OpenAIVisionExtractor(),
            ExtractionEngine.LAYOUT_OCR: LayoutOCRExtractor()
        }
    
    async def extract(self, file_path: str) -> Optional[APBill]:
        """Extract invoice data using hybrid approach"""
        best_result = None
        best_confidence = 0.0
        
        # Try engines in priority order
        for engine_name in settings.ENGINE_PRIORITY:
            try:
                engine = self._get_engine(engine_name)
                if not engine:
                    continue
                
                print(f"Trying {engine_name} extraction...")
                result = await engine.extract(file_path)
                
                if result:
                    # Calculate overall confidence
                    confidence = self._calculate_confidence(result)
                    print(f"{engine_name} confidence: {confidence:.2f}")
                    
                    # Check if this is the best result so far
                    if confidence > best_confidence:
                        best_result = result
                        best_confidence = confidence
                    
                    # If confidence is high enough, use this result
                    if confidence >= settings.CONF_THRESHOLD_HIGH:
                        print(f"High confidence result from {engine_name}")
                        return result
                    
                    # If confidence is above low threshold and we have critical fields
                    if (confidence >= settings.CONF_THRESHOLD_LOW and 
                        self._has_critical_fields(result)):
                        print(f"Acceptable confidence result from {engine_name}")
                        return result
                
            except Exception as e:
                print(f"Engine {engine_name} failed: {e}")
                continue
        
        # Return best result if any found
        if best_result:
            print(f"Using best result with confidence {best_confidence:.2f}")
            return best_result
        
        print("All extraction engines failed")
        return None
    
    def _get_engine(self, engine_name: str):
        """Get engine by name"""
        engine_map = {
            "prebuilt": ExtractionEngine.AZURE_DI,
            "llm": ExtractionEngine.OPENAI_VISION,
            "layout": ExtractionEngine.LAYOUT_OCR
        }
        
        if engine_name in engine_map:
            return self.engines.get(engine_map[engine_name])
        return None
    
    def _calculate_confidence(self, bill: APBill) -> float:
        """Calculate overall confidence score"""
        if not bill.extraction_meta.confidence_scores:
            return 0.5  # Default confidence
        
        # Weight critical fields more heavily
        critical_fields = ["vendor_name", "invoice_number", "invoice_date", "total"]
        weights = {
            "vendor_name": 0.25,
            "invoice_number": 0.25,
            "invoice_date": 0.20,
            "total": 0.20,
            "subtotal": 0.05,
            "tax": 0.05
        }
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for field, confidence in bill.extraction_meta.confidence_scores.items():
            weight = weights.get(field, 0.05)
            weighted_sum += confidence * weight
            total_weight += weight
        
        return weighted_sum / total_weight if total_weight > 0 else 0.5
    
    def _has_critical_fields(self, bill: APBill) -> bool:
        """Check if bill has critical fields"""
        return (
            bill.vendor_name and bill.vendor_name != "Unknown Vendor" and
            bill.invoice_number and bill.invoice_number != "Unknown" and
            bill.total and bill.total > 0
        )
    
    async def reextract(self, file_path: str, engine_name: Optional[str] = None) -> Optional[APBill]:
        """Re-extract with specific engine or next in priority"""
        if engine_name:
            engine = self._get_engine(engine_name)
            if engine:
                return await engine.extract(file_path)
        
        # Try next engine in priority
        return await self.extract(file_path)
