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

    profile = relationship("ClientProfile", back_populates="user", uselist=False)
    routines = relationship("Routine", back_populates="user")

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
