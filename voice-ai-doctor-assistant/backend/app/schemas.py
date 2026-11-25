"""
app/schemas.py - Request/response schemas for all API endpoints
"""
import json
from typing import List, Optional, Any
from pydantic import BaseModel, field_validator


# ── Doctor schemas ────────────────────────────────────────────────────────────

class DoctorResponse(BaseModel):
    id: int
    name: str
    speciality: str
    experience: int
    available_days: List[str]

    @classmethod
    def from_row(cls, row) -> "DoctorResponse":
        d = dict(row)
        d["available_days"] = json.loads(d["available_days"])
        return cls(**d)


class SlotResponse(BaseModel):
    id: int
    doctor_id: int
    appointment_date: str
    appointment_time: str
    status: str


class DoctorWithSlots(BaseModel):
    doctor: DoctorResponse
    available_slots: List[SlotResponse]


# ── Appointment schemas ───────────────────────────────────────────────────────

class AppointmentResponse(BaseModel):
    id: int
    patient_phone: str
    doctor_id: int
    doctor_name: Optional[str] = None
    appointment_date: str
    appointment_time: str
    status: str
    created_at: str

    @classmethod
    def from_row(cls, row) -> "AppointmentResponse":
        return cls(**dict(row))


class BookAppointmentRequest(BaseModel):
    patient_phone: str
    doctor_id: int
    appointment_date: str
    appointment_time: str


class CancelAppointmentRequest(BaseModel):
    patient_phone: str


# ── Stats schemas ─────────────────────────────────────────────────────────────

class StatsResponse(BaseModel):
    total_doctors: int
    available_slots: int
    total_appointments: int
    confirmed_appointments: int
    cancelled_appointments: int


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"
    service: str = "Voice AI Doctor Appointment Assistant"
