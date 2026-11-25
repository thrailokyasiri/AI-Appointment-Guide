"""
app/services/appointment_service.py - Appointment database operations
"""
import re
from typing import List, Optional
from app.database import get_db
from app.schemas import AppointmentResponse, StatsResponse


async def get_all_appointments() -> List[AppointmentResponse]:
    async with get_db() as db:
        async with db.execute(
            """SELECT a.*, d.name AS doctor_name
               FROM appointments a
               LEFT JOIN doctors d ON a.doctor_id = d.id
               ORDER BY a.id DESC"""
        ) as cursor:
            rows = await cursor.fetchall()
        return [AppointmentResponse.from_row(r) for r in rows]


async def cancel_appointment_by_id(appointment_id: int) -> bool:
    """Cancel an appointment and free its slot. Returns True if found."""
    async with get_db() as db:
        async with db.execute(
            "SELECT * FROM appointments WHERE id = ? AND status = 'confirmed'",
            (appointment_id,),
        ) as cursor:
            appt = await cursor.fetchone()

        if appt is None:
            return False

        appt_dict = dict(appt)
        await db.execute(
            "UPDATE appointments SET status = 'cancelled' WHERE id = ?",
            (appointment_id,),
        )
        await db.execute(
            """UPDATE appointment_slots SET status = 'available'
               WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?""",
            (appt_dict["doctor_id"], appt_dict["appointment_date"], appt_dict["appointment_time"]),
        )
        await db.commit()
        return True


async def get_stats() -> StatsResponse:
    async with get_db() as db:
        async with db.execute("SELECT COUNT(*) FROM doctors") as c:
            total_doctors = (await c.fetchone())[0]
        async with db.execute(
            "SELECT COUNT(*) FROM appointment_slots WHERE status = 'available'"
        ) as c:
            available_slots = (await c.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM appointments") as c:
            total_appointments = (await c.fetchone())[0]
        async with db.execute(
            "SELECT COUNT(*) FROM appointments WHERE status = 'confirmed'"
        ) as c:
            confirmed_appointments = (await c.fetchone())[0]
        async with db.execute(
            "SELECT COUNT(*) FROM appointments WHERE status = 'cancelled'"
        ) as c:
            cancelled_appointments = (await c.fetchone())[0]

    return StatsResponse(
        total_doctors=total_doctors,
        available_slots=available_slots,
        total_appointments=total_appointments,
        confirmed_appointments=confirmed_appointments,
        cancelled_appointments=cancelled_appointments,
    )
