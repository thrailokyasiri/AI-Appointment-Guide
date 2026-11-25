"""
app/models.py - Pydantic models matching the SQLite schema
"""
from typing import List, Optional
from pydantic import BaseModel


class Doctor(BaseModel):
    id: int
    name: str
    speciality: str
    experience: int
    available_days: List[str]  # Parsed from JSON string in DB


class AppointmentSlot(BaseModel):
    id: int
    doctor_id: int
    appointment_date: str   # YYYY-MM-DD
    appointment_time: str   # HH:MM
    status: str             # available | booked


class Appointment(BaseModel):
    id: int
    patient_phone: str
    doctor_id: int
    appointment_date: str
    appointment_time: str
    status: str             # confirmed | cancelled
    created_at: str
