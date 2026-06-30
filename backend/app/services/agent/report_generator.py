"""
report_generator.py — LLM-powered commodity intelligence report generation.

Takes structured ML analysis results and generates human-readable
markdown briefings using Google Gemini.
"""

import logging
from datetime import datetime, timezone

import google.generativeai as genai

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

REPORT_PROMPT = """You are an agricultural commodity analyst writing a professional intelligence briefing.

Based on the following analysis results, generate a concise Markdown report.

## Analysis Data
{analysis_json}

## Instructions
- Write a professional commodity intelligence briefing
- Use Indian formatting: ₹, lakhs, crores, quintals
- Include an "Executive Summary" section (3-4 bullet points)
- Include a "Key Findings" section with specific numbers from the data
- Include a "Risk Assessment" section
- Include "Recommended Actions" (2-3 actionable items)
- Keep the total report under 500 words
- Use markdown headers, bullet points, and bold for emphasis
- Title format: "AgriFlow Intelligence Brief — {date}"
- Be specific — use actual numbers from the data, not vague statements

## Output Format
Return ONLY the markdown report, no preamble or explanation.
"""


async def generate_report(
    analysis_results: dict,
    job_type: str,
    commodity: str | None = None,
) -> dict:
    """Generate an LLM-powered intelligence report from analysis results.

    Args:
        analysis_results: The ML analysis output dictionary
        job_type: Type of analysis ('process_mining', 'causal_ml', 'prediction')
        commodity: Optional commodity name for the report title

    Returns:
        dict with keys:
            - title: Report title string
            - content: Markdown report content
            - job_type: Analysis type
            - commodity: Commodity name
            - generated_at: ISO timestamp
    """
    if not settings.GOOGLE_API_KEY:
        return {
            "title": "Report Generation Unavailable",
            "content": "GOOGLE_API_KEY is not configured. Please set it in your .env file.",
            "job_type": job_type,
            "commodity": commodity,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    import json

    # Clean analysis results (remove embeddings, large arrays)
    clean_results = {}
    for key, value in analysis_results.items():
        if key.startswith("_"):
            continue
        if isinstance(value, list) and len(value) > 20:
            clean_results[key] = value[:20]  # Truncate large lists
        else:
            clean_results[key] = value

    analysis_json = json.dumps(clean_results, indent=2, default=str)
    today = datetime.now().strftime("%d %B %Y")

    prompt = REPORT_PROMPT.format(
        analysis_json=analysis_json,
        date=today,
    )

    try:
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                max_output_tokens=2000,
            ),
        )

        content = response.text

        # Generate title
        commodity_str = commodity or "Multi-Commodity"
        type_labels = {
            "process_mining": "Supply Chain Bottleneck Analysis",
            "causal_ml": "MSP Policy Impact Assessment",
            "prediction": "Price Risk Forecast",
        }
        title = f"AgriFlow Brief — {commodity_str} {type_labels.get(job_type, 'Analysis')} — {today}"

        return {
            "title": title,
            "content": content,
            "job_type": job_type,
            "commodity": commodity,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.exception("Report generation failed: %s", e)
        return {
            "title": "Report Generation Failed",
            "content": f"Error generating report: {str(e)}",
            "job_type": job_type,
            "commodity": commodity,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
