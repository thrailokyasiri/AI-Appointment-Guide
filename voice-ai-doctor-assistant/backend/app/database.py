"""
app/database.py - Async SQLite database layer using aiosqlite
"""
import aiosqlite
from contextlib import asynccontextmanager
from app.config import settings

DATABASE_PATH = settings.DATABASE_URL


CREATE_DOCTORS_TABLE = """
CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    speciality TEXT NOT NULL,
    experience INTEGER NOT NULL,
    available_days TEXT NOT NULL
);
"""

CREATE_APPOINTMENT_SLOTS_TABLE = """
CREATE TABLE IF NOT EXISTS appointment_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);
"""

CREATE_APPOINTMENTS_TABLE = """
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_phone TEXT NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);
"""


async def init_db() -> None:
    """Create all tables if they don't exist."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON;")
        await db.execute(CREATE_DOCTORS_TABLE)
        await db.execute(CREATE_APPOINTMENT_SLOTS_TABLE)
        await db.execute(CREATE_APPOINTMENTS_TABLE)
        await db.commit()


@asynccontextmanager
async def get_db():
    """Async context manager that yields a database connection."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON;")
        try:
            yield db
        except Exception:
            await db.rollback()
            raise
