"""
app/tools/appointment_tools.py

Three Pipecat/Gemini function-calling tools for the voice AI assistant.
All functions are async and interact with the SQLite database directly.
"""
import re
import json
from typing import Optional
from app.database import get_db


# ─────────────────────────────────────────────────────────────────────────────
# Tool 1: check_doctor_availability
# ─────────────────────────────────────────────────────────────────────────────

async def check_doctor_availability(
    doctor_name: Optional[str] = None,
    speciality: Optional[str] = None,
    appointment_date: Optional[str] = None,
) -> dict:
    """
    Find doctors and available appointment slots.

    Args:
        doctor_name: Partial or full doctor name (fuzzy match).
        speciality: Medical speciality to filter by (fuzzy match).
        appointment_date: Date in YYYY-MM-DD format. If None, returns all future slots.

    Returns:
        {
            "available": bool,
            "doctors": [...],
            "slots": [...],
            "message": str
        }
    """
    async with get_db() as db:
        # Build doctor query
        conditions = []
        params = []

        if doctor_name:
            conditions.append("LOWER(name) LIKE ?")
            params.append(f"%{doctor_name.lower()}%")

        if speciality:
            conditions.append("LOWER(speciality) LIKE ?")
            params.append(f"%{speciality.lower()}%")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        query = f"SELECT * FROM doctors {where_clause} ORDER BY name"

        async with db.execute(query, params) as cursor:
            doctors_rows = await cursor.fetchall()

        if not doctors_rows:
            return {
                "available": False,
                "doctors": [],
                "slots": [],
                "message": "No doctors found matching your criteria.",
            }

        doctors = []
        all_slots = []

        for doc in doctors_rows:
            doc_dict = dict(doc)
            doc_dict["available_days"] = json.loads(doc_dict["available_days"])
            doctors.append(doc_dict)

            # Fetch slots
            slot_conditions = ["doctor_id = ?", "status = 'available'"]
            slot_params = [doc_dict["id"]]

            if appointment_date:
                slot_conditions.append("appointment_date = ?")
                slot_params.append(appointment_date)
            else:
                slot_conditions.append("appointment_date >= date('now')")

            slot_query = (
                "SELECT * FROM appointment_slots WHERE "
                + " AND ".join(slot_conditions)
                + " ORDER BY appointment_date, appointment_time LIMIT 20"
            )

            async with db.execute(slot_query, slot_params) as slot_cursor:
                slots = await slot_cursor.fetchall()
            all_slots.extend([dict(s) for s in slots])

        if not all_slots:
            message = (
                f"No available slots found for the requested date."
                if appointment_date
                else "No available slots found for these doctors."
            )
            return {"available": False, "doctors": doctors, "slots": [], "message": message}

        # Compose a human-readable summary
        slot_previews = []
        for s in all_slots[:5]:
            doc_name = next((d["name"] for d in doctors if d["id"] == s["doctor_id"]), "Unknown")
            slot_previews.append(
                f"{doc_name} on {s['appointment_date']} at {s['appointment_time']}"
            )
        summary = "; ".join(slot_previews)
        if len(all_slots) > 5:
            summary += f" (and {len(all_slots) - 5} more slots)"

        return {
            "available": True,
            "doctors": doctors,
            "slots": all_slots,
            "message": f"Found {len(all_slots)} available slot(s): {summary}",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Tool 2: book_appointment
# ─────────────────────────────────────────────────────────────────────────────

async def book_appointment(
    patient_phone: str,
    doctor_id: int,
    appointment_date: str,
    appointment_time: str,
) -> dict:
    """
    Book an appointment for a patient.

    Args:
        patient_phone: Patient's phone number (10+ digits).
        doctor_id: ID of the doctor.
        appointment_date: Date in YYYY-MM-DD format.
        appointment_time: Time in HH:MM format.

    Returns:
        {"success": bool, "appointment_id": int | None, "message": str, "details": dict}
    """
    # Validate phone number (must contain 10+ digits)
    digits_only = re.sub(r"\D", "", patient_phone)
    if len(digits_only) < 10:
        return {
            "success": False,
            "appointment_id": None,
            "message": "Invalid phone number. Please provide at least 10 digits.",
            "details": {},
        }

    async with get_db() as db:
        # Verify doctor exists
        async with db.execute("SELECT * FROM doctors WHERE id = ?", (doctor_id,)) as cursor:
            doctor = await cursor.fetchone()

        if not doctor:
            return {
                "success": False,
                "appointment_id": None,
                "message": f"Doctor with ID {doctor_id} not found.",
                "details": {},
            }

        # Check the slot is still available
        async with db.execute(
            """SELECT * FROM appointment_slots
               WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status = 'available'""",
            (doctor_id, appointment_date, appointment_time),
        ) as cursor:
            slot = await cursor.fetchone()

        if not slot:
            return {
                "success": False,
                "appointment_id": None,
                "message": f"The slot on {appointment_date} at {appointment_time} is no longer available. Please choose another slot.",
                "details": {},
            }

        # Prevent duplicate booking (same phone + doctor + date + time)
        async with db.execute(
            """SELECT id FROM appointments
               WHERE patient_phone = ? AND doctor_id = ? AND appointment_date = ?
               AND appointment_time = ? AND status = 'confirmed'""",
            (patient_phone, doctor_id, appointment_date, appointment_time),
        ) as cursor:
            duplicate = await cursor.fetchone()

        if duplicate:
            return {
                "success": False,
                "appointment_id": duplicate["id"],
                "message": "You already have a confirmed appointment at this exact slot.",
                "details": {"existing_appointment_id": duplicate["id"]},
            }

        # Insert appointment
        async with db.execute(
            """INSERT INTO appointments (patient_phone, doctor_id, appointment_date, appointment_time, status)
               VALUES (?, ?, ?, ?, 'confirmed')""",
            (patient_phone, doctor_id, appointment_date, appointment_time),
        ) as cursor:
            appointment_id = cursor.lastrowid

        # Mark slot as booked
        await db.execute(
            """UPDATE appointment_slots SET status = 'booked'
               WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?""",
            (doctor_id, appointment_date, appointment_time),
        )
        await db.commit()

        doctor_dict = dict(doctor)
        return {
            "success": True,
            "appointment_id": appointment_id,
            "message": (
                f"Appointment booked successfully! Your appointment ID is {appointment_id}. "
                f"You are booked with {doctor_dict['name']} on {appointment_date} at {appointment_time}."
            ),
            "details": {
                "appointment_id": appointment_id,
                "patient_phone": patient_phone,
                "doctor_id": doctor_id,
                "doctor_name": doctor_dict["name"],
                "speciality": doctor_dict["speciality"],
                "appointment_date": appointment_date,
                "appointment_time": appointment_time,
                "status": "confirmed",
            },
        }


# ─────────────────────────────────────────────────────────────────────────────
# Tool 3: cancel_appointment
# ─────────────────────────────────────────────────────────────────────────────

async def cancel_appointment(
    patient_phone: str,
    appointment_id: Optional[int] = None,
) -> dict:
    """
    Cancel one or more appointments for a patient.

    Args:
        patient_phone: Patient's phone number.
        appointment_id: Specific appointment to cancel. If None, looks up all confirmed appointments.

    Returns:
        {"success": bool, "cancelled": dict | None, "appointments": list, "message": str}
    """
    async with get_db() as db:
        if appointment_id is not None:
            # Cancel a specific appointment
            async with db.execute(
                """SELECT a.*, d.name AS doctor_name FROM appointments a
                   LEFT JOIN doctors d ON a.doctor_id = d.id
                   WHERE a.id = ? AND a.patient_phone = ? AND a.status = 'confirmed'""",
                (appointment_id, patient_phone),
            ) as cursor:
                appt = await cursor.fetchone()

            if not appt:
                return {
                    "success": False,
                    "cancelled": None,
                    "appointments": [],
                    "message": f"No confirmed appointment #{appointment_id} found for phone {patient_phone}.",
                }

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

            return {
                "success": True,
                "cancelled": appt_dict,
                "appointments": [],
                "message": (
                    f"Appointment #{appointment_id} with {appt_dict.get('doctor_name', 'your doctor')} "
                    f"on {appt_dict['appointment_date']} at {appt_dict['appointment_time']} has been cancelled."
                ),
            }

        else:
            # Look up all confirmed appointments for this phone
            async with db.execute(
                """SELECT a.*, d.name AS doctor_name FROM appointments a
                   LEFT JOIN doctors d ON a.doctor_id = d.id
                   WHERE a.patient_phone = ? AND a.status = 'confirmed'
                   ORDER BY a.appointment_date, a.appointment_time""",
                (patient_phone,),
            ) as cursor:
                appts = await cursor.fetchall()

            if not appts:
                return {
                    "success": False,
                    "cancelled": None,
                    "appointments": [],
                    "message": f"No confirmed appointments found for phone number {patient_phone}.",
                }

            appt_list = [dict(a) for a in appts]

            if len(appt_list) == 1:
                # Only one — cancel it automatically
                appt_dict = appt_list[0]
                await db.execute(
                    "UPDATE appointments SET status = 'cancelled' WHERE id = ?",
                    (appt_dict["id"],),
                )
                await db.execute(
                    """UPDATE appointment_slots SET status = 'available'
                       WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?""",
                    (appt_dict["doctor_id"], appt_dict["appointment_date"], appt_dict["appointment_time"]),
                )
                await db.commit()

                return {
                    "success": True,
                    "cancelled": appt_dict,
                    "appointments": [],
                    "message": (
                        f"Your appointment #{appt_dict['id']} with {appt_dict.get('doctor_name', 'your doctor')} "
                        f"on {appt_dict['appointment_date']} at {appt_dict['appointment_time']} has been cancelled."
                    ),
                }

            # Multiple appointments — ask patient to choose
            summaries = [
                {
                    "appointment_id": a["id"],
                    "doctor_name": a.get("doctor_name", "Unknown"),
                    "appointment_date": a["appointment_date"],
                    "appointment_time": a["appointment_time"],
                }
                for a in appt_list
            ]
            descriptions = "; ".join(
                f"#{s['appointment_id']} with {s['doctor_name']} on {s['appointment_date']} at {s['appointment_time']}"
                for s in summaries
            )
            return {
                "success": False,
                "cancelled": None,
                "appointments": summaries,
                "message": (
                    f"You have {len(appt_list)} confirmed appointments: {descriptions}. "
                    "Please specify which appointment ID you'd like to cancel."
                ),
            }


# ─────────────────────────────────────────────────────────────────────────────
# Tool schemas for Pipecat / Gemini function calling
# ─────────────────────────────────────────────────────────────────────────────

APPOINTMENT_TOOLS = [
    {
        "function_declarations": [
            {
                "name": "check_doctor_availability",
                "description": (
                    "Check available doctors and appointment slots. "
                    "Call this to find doctors by name or speciality and see open time slots."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "doctor_name": {
                            "type": "string",
                            "description": "Full or partial doctor name to search for.",
                        },
                        "speciality": {
                            "type": "string",
                            "description": "Medical speciality, e.g. Cardiologist, Pediatrician.",
                        },
                        "appointment_date": {
                            "type": "string",
                            "description": "Date to check availability for, in YYYY-MM-DD format.",
                        },
                    },
                    "required": [],
                },
            },
            {
                "name": "book_appointment",
                "description": (
                    "Book a confirmed appointment for a patient. "
                    "Only call this after the patient has confirmed all details."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_phone": {
                            "type": "string",
                            "description": "Patient's phone number (10+ digits).",
                        },
                        "doctor_id": {
                            "type": "integer",
                            "description": "The integer ID of the doctor.",
                        },
                        "appointment_date": {
                            "type": "string",
                            "description": "Date of the appointment in YYYY-MM-DD format.",
                        },
                        "appointment_time": {
                            "type": "string",
                            "description": "Time of the appointment in HH:MM (24-hour) format.",
                        },
                    },
                    "required": ["patient_phone", "doctor_id", "appointment_date", "appointment_time"],
                },
            },
            {
                "name": "cancel_appointment",
                "description": (
                    "Cancel a patient's appointment. "
                    "If the patient has multiple appointments, return a list for selection."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_phone": {
                            "type": "string",
                            "description": "Patient's phone number to identify their appointments.",
                        },
                        "appointment_id": {
                            "type": "integer",
                            "description": "Specific appointment ID to cancel. Omit to list all appointments for the phone number.",
                        },
                    },
                    "required": ["patient_phone"],
                },
            },
        ]
    }
]

# Map tool name → callable for the pipeline dispatcher
TOOL_REGISTRY = {
    "check_doctor_availability": check_doctor_availability,
    "book_appointment": book_appointment,
    "cancel_appointment": cancel_appointment,
}
