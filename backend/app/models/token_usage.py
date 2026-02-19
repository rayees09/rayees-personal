from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AiTokenUsage(Base):
    """Tracks AI token usage per family/user for billing and limits."""
    __tablename__ = "ai_token_usage"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # What feature used the AI
    feature_used = Column(String(50), nullable=False)  # learning, worksheet, image_analysis, etc.

    # Model details
    model_used = Column(String(50), nullable=False)  # gpt-4, gpt-4-vision, gpt-3.5-turbo

    # Token counts
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)

    # Cost tracking (approximate based on OpenAI pricing)
    cost_usd = Column(Float, default=0.0)

    # Request details (optional)
    request_id = Column(String(100), nullable=True)  # For debugging

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family = relationship("Family", back_populates="token_usage")
    user = relationship("User", back_populates="token_usage")


# Approximate pricing per 1K tokens (as of 2024)
AI_PRICING = {
    "gpt-4-vision-preview": {"input": 0.01, "output": 0.03},
    "gpt-4": {"input": 0.03, "output": 0.06},
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
}


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Calculate approximate cost for a request."""
    pricing = AI_PRICING.get(model, AI_PRICING["gpt-4"])
    input_cost = (prompt_tokens / 1000) * pricing["input"]
    output_cost = (completion_tokens / 1000) * pricing["output"]
    return round(input_cost + output_cost, 6)
