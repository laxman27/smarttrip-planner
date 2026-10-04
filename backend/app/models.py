from sqlalchemy import BigInteger, DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default="now()")
    trips: Mapped[list["Trip"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class Trip(Base):
    __tablename__ = "trips"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    start_label: Mapped[str] = mapped_column(String(255))
    destination_label: Mapped[str] = mapped_column(String(255))
    departure_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    vehicle_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    preferences: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default="now()")
    user: Mapped[User] = relationship(back_populates="trips")
