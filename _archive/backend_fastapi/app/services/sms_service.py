"""
SMS Alert Service — Fast2SMS integration for farmer price alerts.

Sends DLT-compliant SMS via Fast2SMS API to registered farmer numbers.
Supports both transactional (DLT template-based) and quick SMS modes.
"""

import logging
from datetime import datetime
from typing import List, Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

FAST2SMS_BASE = "https://www.fast2sms.com/dev/bulkV2"


class SMSService:
    """Handles all SMS dispatch via Fast2SMS API."""

    def __init__(self):
        self.api_key = settings.FAST2SMS_API_KEY
        self.sender_id = settings.FAST2SMS_SENDER_ID
        self.enabled = bool(self.api_key)

    async def send_sms(
        self,
        phone_numbers: List[str],
        message: str,
        *,
        dlt_template_id: Optional[str] = None,
    ) -> dict:
        """Send SMS to one or more phone numbers.

        Args:
            phone_numbers: List of 10-digit Indian mobile numbers.
            message: SMS body text (must match DLT template if using DLT route).
            dlt_template_id: Optional DLT template ID for TRAI compliance.

        Returns:
            API response dict with delivery status.
        """
        if not self.enabled:
            logger.warning("SMS not sent — FAST2SMS_API_KEY not configured")
            return {"status": "skipped", "reason": "api_key_not_set"}

        # Clean phone numbers — remove +91, spaces, dashes
        cleaned = []
        for num in phone_numbers:
            n = num.strip().replace(" ", "").replace("-", "").replace("+91", "")
            if len(n) == 10 and n.isdigit():
                cleaned.append(n)
            else:
                logger.warning("Skipping invalid phone number: %s", num)

        if not cleaned:
            return {"status": "error", "reason": "no_valid_numbers"}

        numbers_str = ",".join(cleaned)

        # Build payload — DLT route if template ID provided, else quick SMS
        if dlt_template_id:
            payload = {
                "route": "dlt",
                "sender_id": self.sender_id,
                "message": message,
                "language": "unicode",  # Hindi support
                "numbers": numbers_str,
                "flash": "0",
                "entity_id": settings.FAST2SMS_ENTITY_ID,
                "template_id": dlt_template_id,
            }
        else:
            # Quick SMS mode — for testing only (not DLT compliant)
            payload = {
                "route": "q",
                "message": message,
                "language": "unicode",
                "numbers": numbers_str,
                "flash": "0",
            }

        headers = {
            "authorization": self.api_key,
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(FAST2SMS_BASE, json=payload, headers=headers)
                result = resp.json()

            if result.get("return"):
                logger.info(
                    "SMS sent to %d numbers | request_id=%s",
                    len(cleaned),
                    result.get("request_id", "unknown"),
                )
            else:
                logger.error("SMS failed: %s", result.get("message", "unknown error"))

            return {
                "status": "sent" if result.get("return") else "failed",
                "recipients": len(cleaned),
                "request_id": result.get("request_id"),
                "api_response": result.get("message"),
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.exception("SMS dispatch error: %s", str(e))
            return {"status": "error", "reason": str(e)}

    async def send_price_alert(
        self,
        phone_numbers: List[str],
        commodity: str,
        mandi: str,
        current_price: float,
        risk_level: str,
        advice: str,
        *,
        lang: str = "hi",
    ) -> dict:
        """Send a formatted price alert SMS.

        Args:
            phone_numbers: Target farmer numbers.
            commodity: Crop name (e.g., "Onion").
            mandi: Mandi name (e.g., "Lasalgaon").
            current_price: Today's modal price in ₹/quintal.
            risk_level: "HIGH", "MEDIUM", or "LOW".
            advice: Short recommendation text.
            lang: "hi" for Hindi, "en" for English.
        """
        if lang == "hi":
            message = (
                f"AgriFlow: {commodity} का भाव {mandi} मंडी में आज ₹{current_price:.0f}/क्विंटल। "
                f"जोखिम: {risk_level}। "
                f"{advice}"
            )
        else:
            message = (
                f"AgriFlow: {commodity} price at {mandi} Mandi today Rs.{current_price:.0f}/quintal. "
                f"Risk: {risk_level}. "
                f"{advice}"
            )

        return await self.send_sms(
            phone_numbers,
            message,
            dlt_template_id=settings.FAST2SMS_PRICE_ALERT_TEMPLATE_ID,
        )

    async def send_crash_warning(
        self,
        phone_numbers: List[str],
        commodity: str,
        mandi: str,
        current_price: float,
        predicted_price: float,
        crash_probability: float,
        hold_days: int,
    ) -> dict:
        """Send an urgent price crash warning SMS in Hindi."""
        drop_pct = ((current_price - predicted_price) / current_price) * 100

        message = (
            f"AgriFlow चेतावनी: {commodity} के भाव में {drop_pct:.0f}% गिरावट की {crash_probability:.0f}% संभावना। "
            f"आज: ₹{current_price:.0f}, अनुमान: ₹{predicted_price:.0f}। "
            f"सलाह: {hold_days} दिन माल न बेचें।"
        )

        return await self.send_sms(
            phone_numbers,
            message,
            dlt_template_id=settings.FAST2SMS_CRASH_TEMPLATE_ID,
        )


# Singleton
sms_service = SMSService()
