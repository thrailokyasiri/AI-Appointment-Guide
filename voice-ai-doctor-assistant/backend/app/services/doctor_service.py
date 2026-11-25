"""
app/services/doctor_service.py - Doctor-related database queries
"""
import json
from typing import List, Optional
from app.database import get_db
from app.schemas import DoctorResponse, SlotResponse, DoctorWithSlots


async def get_all_doctors() -> List[DoctorWithSlots]:
    async with get_db() as db:
        async with db.execute("SELECT * FROM doctors ORDER BY id") as cursor:
            doctors = await cursor.fetchall()

        result = []
        for doc in doctors:
            doc_response = DoctorResponse.from_row(doc)
            async with db.execute(
                """SELECT * FROM appointment_slots
                   WHERE doctor_id = ? AND status = 'available'
                   ORDER BY appointment_date, appointment_time""",
                (doc_response.id,),
            ) as slot_cursor:
                slots = await slot_cursor.fetchall()
            slot_responses = [SlotResponse(**dict(s)) for s in slots]
            result.append(DoctorWithSlots(doctor=doc_response, available_slots=slot_responses))
        return result


async def get_doctor_by_id(doctor_id: int) -> Optional[DoctorResponse]:
    async with get_db() as db:
        async with db.execute("SELECT * FROM doctors WHERE id = ?", (doctor_id,)) as cursor:
            row = await cursor.fetchone()
        if row is None:
            return None
        return DoctorResponse.from_row(row)
