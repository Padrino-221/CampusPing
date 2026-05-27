import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, Text, Index
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False
    )
    sender_id_ref: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sender_ids.id", ondelete="SET NULL"),
        nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    filters: Mapped[dict] = mapped_column(JSONB, nullable=True)  # Snapshot of filtering criteria
    custom_recipients: Mapped[list] = mapped_column(ARRAY(String(20)), nullable=True)  # User-pasted phone numbers
    recipient_count: Mapped[int] = mapped_column(Integer, default=0)
    credits_used: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, queued, sending, completed, failed
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="campaigns")
    sender_id_relation: Mapped["SenderID"] = relationship("SenderID", back_populates="campaigns")
    logs: Mapped[list["CampaignLog"]] = relationship(
        "CampaignLog",
        back_populates="campaign",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_campaigns_candidate", "candidate_id"),
    )


class CampaignLog(Base):
    __tablename__ = "campaign_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("student_directories.id", ondelete="SET NULL"),
        nullable=True
    )
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="queued")  # queued, sent, delivered, failed
    arkesel_msg_id: Mapped[str] = mapped_column(Text, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="logs")

    __table_args__ = (
        Index("idx_logs_campaign", "campaign_id"),
        Index("idx_logs_status", "status"),
    )
