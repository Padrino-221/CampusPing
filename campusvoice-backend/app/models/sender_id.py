import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class SenderID(Base):
    __tablename__ = "sender_ids"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False
    )
    sender_name: Mapped[str] = mapped_column(String(11), nullable=False)  # max 11 characters
    status: Mapped[str] = mapped_column(String(20), default="pending")  # 'pending', 'approved', 'rejected'
    arkesel_ref: Mapped[str] = mapped_column(Text, nullable=True)       # Arkesel API reference
    rejection_note: Mapped[str] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="sender_ids")
    campaigns: Mapped[list["Campaign"]] = relationship("Campaign", back_populates="sender_id_relation")
