import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class StudentDirectory(Base):
    __tablename__ = "student_directories"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    gender: Mapped[str] = mapped_column(String(10), nullable=True)  # 'male', 'female', etc.
    level: Mapped[int] = mapped_column(Integer, nullable=True)      # 100, 200, 300, etc.
    department: Mapped[str] = mapped_column(String(255), nullable=True)
    faculty: Mapped[str] = mapped_column(String(255), nullable=True)
    programme: Mapped[str] = mapped_column(String(255), nullable=True)
    student_id: Mapped[str] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    institution: Mapped["Institution"] = relationship("Institution", back_populates="students")

    # Constraints & Indexes
    __table_args__ = (
        UniqueConstraint("institution_id", "phone", name="uq_institution_phone"),
        Index("idx_students_institution", "institution_id"),
        Index("idx_students_gender", "gender"),
        Index("idx_students_level", "level"),
        Index("idx_students_department", "department"),
        Index("idx_students_faculty", "faculty"),
    )
