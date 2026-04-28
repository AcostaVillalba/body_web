from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    role = Column(String, default="Client") # "Admin", "Coach", "Client"
    google_id = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    phone = Column(String, nullable=True)
    instagram = Column(String, nullable=True)

    profile = relationship("ClientProfile", back_populates="user", uselist=False)
    routines = relationship("Routine", back_populates="user")
    weight_history = relationship("WeightHistory", back_populates="user")

class ClientProfile(Base):
    __tablename__ = "client_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    age = Column(String)
    weight = Column(String)
    goal = Column(String)
    plan_type = Column(String)
    start_date = Column(String)
    end_date = Column(String)
    control_date = Column(String)

    user = relationship("User", back_populates="profile")

class Routine(Base):
    __tablename__ = "routines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Store the entire routine output as a JSON string so we can easily recreate the complex UI
    routine_data = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    user = relationship("User", back_populates="routines")
    weight_entries = relationship("WeightHistory", back_populates="routine")

class WeightHistory(Base):
    __tablename__ = "weight_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    routine_id = Column(Integer, ForeignKey("routines.id"), nullable=True)
    
    weight = Column(String)
    created_at = Column(TIMESTAMP, server_default=func.now())
    notes = Column(String, nullable=True) # e.g. "Actualización de rutina"

    user = relationship("User", back_populates="weight_history")
    routine = relationship("Routine", back_populates="weight_entries")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String)
    created_at = Column(TIMESTAMP, server_default=func.now())
    is_read = Column(Boolean, default=False)

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    coach_id = Column(Integer, ForeignKey("users.id"))
    client_id = Column(Integer, ForeignKey("users.id"))
    client_name = Column(String)
    amount = Column(Integer)
    plan_type = Column(String)
    status = Column(String, default="Pending") # Pending, Paid
    batch_id = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

