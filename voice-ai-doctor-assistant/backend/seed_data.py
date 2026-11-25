"""
seed_data.py - Standalone script to seed the SQLite database with realistic mock data.

Usage:
    python seed_data.py

Run this once after creating the database (or after clearing it).
"""
import asyncio
import json
import sys
from datetime import date, timedelta, time
from pathlib import Path

# Add the backend directory to sys.path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent))

import aiosqlite

DATABASE_PATH = "./doctor_appointments.db"

DOCTORS = [
    {
        "name": "Dr. Sarah Johnson",
        "speciality": "Cardiologist",
        "experience": 15,
        "available_days": ["Monday", "Wednesday", "Friday"],
    },
    {
        "name": "Dr. Michael Chen",
        "speciality": "Neurologist",
        "experience": 12,
        "available_days": ["Tuesday", "Thursday", "Saturday"],
    },
    {
        "name": "Dr. Emily Rodriguez",
        "speciality": "Pediatrician",
        "experience": 8,
        "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday"],
    },
    {
        "name": "Dr. James Wilson",
        "speciality": "Orthopedist",
        "experience": 20,
        "available_days": ["Monday", "Wednesday", "Friday", "Saturday"],
    },
    {
        "name": "Dr. Priya Patel",
        "speciality": "Dermatologist",
        "experience": 10,
        "available_days": ["Tuesday", "Thursday", "Friday"],
    },
    {
        "name": "Dr. Robert Kim",
        "speciality": "General Physician",
        "experience": 18,
        "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
]


def _generate_time_slots():
    """Generate 30-min slots from 09:00 to 17:00 (inclusive start, exclusive 17:30)."""
    slots = []
    start = time(9, 0)
    end_hour, end_minute = 17, 0
    h, m = start.hour, start.minute
    while (h, m) <= (end_hour, end_minute):
        slots.append(f"{h:02d}:{m:02d}")
        m += 30
        if m >= 60:
            h += 1
            m -= 60
    return slots  # 09:00 … 17:00  → 17 slots


TIME_SLOTS = _generate_time_slots()


async def seed():
    # Load .env if present
    try:
        from dotenv import load_dotenv
        load_dotenv()
        import os
        db_path = os.getenv("DATABASE_URL", DATABASE_PATH)
    except ImportError:
        db_path = DATABASE_PATH

    async with aiosqlite.connect(db_path) as db:
        await db.execute("PRAGMA foreign_keys = ON;")

        # Create tables
        await db.execute("""
            CREATE TABLE IF NOT EXISTS doctors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                speciality TEXT NOT NULL,
                experience INTEGER NOT NULL,
                available_days TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS appointment_slots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doctor_id INTEGER NOT NULL,
                appointment_date TEXT NOT NULL,
                appointment_time TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'available',
                FOREIGN KEY (doctor_id) REFERENCES doctors(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_phone TEXT NOT NULL,
                doctor_id INTEGER NOT NULL,
                appointment_date TEXT NOT NULL,
                appointment_time TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'confirmed',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (doctor_id) REFERENCES doctors(id)
            )
        """)
        await db.commit()

        # Clear existing seed data so re-runs are idempotent
        await db.execute("DELETE FROM appointment_slots")
        await db.execute("DELETE FROM appointments")
        await db.execute("DELETE FROM doctors")
        await db.execute("DELETE FROM sqlite_sequence WHERE name IN ('doctors','appointment_slots','appointments')")
        await db.commit()

        # Insert doctors
        today = date.today()
        for doc in DOCTORS:
            cursor = await db.execute(
                "INSERT INTO doctors (name, speciality, experience, available_days) VALUES (?, ?, ?, ?)",
                (doc["name"], doc["speciality"], doc["experience"], json.dumps(doc["available_days"])),
            )
            doctor_id = cursor.lastrowid
            print(f"  Inserted doctor: {doc['name']} (id={doctor_id})")

            # Generate slots for the next 14 days
            slot_count = 0
            for day_offset in range(1, 15):
                target_date = today + timedelta(days=day_offset)
                day_name = target_date.strftime("%A")  # e.g. "Monday"
                if day_name not in doc["available_days"]:
                    continue

                for slot_time in TIME_SLOTS:
                    await db.execute(
                        """INSERT INTO appointment_slots (doctor_id, appointment_date, appointment_time, status)
                           VALUES (?, ?, ?, 'available')""",
                        (doctor_id, target_date.isoformat(), slot_time),
                    )
                    slot_count += 1

            print(f"    → {slot_count} slots created for {doc['name']}")

        await db.commit()
        print("\nSeeding complete!")

        # Print summary
        async with db.execute("SELECT COUNT(*) FROM doctors") as c:
            print(f"  Doctors: {(await c.fetchone())[0]}")
        async with db.execute("SELECT COUNT(*) FROM appointment_slots") as c:
            print(f"  Appointment slots: {(await c.fetchone())[0]}")


if __name__ == "__main__":
    print("Seeding database…")
    asyncio.run(seed())
