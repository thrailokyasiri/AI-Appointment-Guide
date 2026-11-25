"""
app/api/routes.py - REST and WebSocket routes for the Doctor Appointment Assistant
"""
import logging
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from app.schemas import HealthResponse, StatsResponse
from app.services.doctor_service import get_all_doctors
from app.services.appointment_service import (
    get_all_appointments,
    cancel_appointment_by_id,
    get_stats,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/api/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok")


# ── Doctors ───────────────────────────────────────────────────────────────────

@router.get("/api/doctors")
async def list_doctors():
    """List all doctors with their available slots."""
    doctors = await get_all_doctors()
    return [d.model_dump() for d in doctors]


# ── Appointments ──────────────────────────────────────────────────────────────

@router.get("/api/appointments")
async def list_appointments():
    """List all appointments with doctor names."""
    appointments = await get_all_appointments()
    return [a.model_dump() for a in appointments]


@router.delete("/api/appointments/{appointment_id}")
async def cancel_appointment(appointment_id: int):
    """Cancel an appointment by ID."""
    success = await cancel_appointment_by_id(appointment_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Appointment {appointment_id} not found or already cancelled.",
        )
    return {"success": True, "message": f"Appointment {appointment_id} cancelled."}


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/api/stats", response_model=StatsResponse)
async def stats():
    """Return dashboard statistics."""
    return await get_stats()


# ── Voice WebSocket ───────────────────────────────────────────────────────────

@router.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket):
    """Voice pipeline WebSocket endpoint."""
    await websocket.accept()
    logger.info("WebSocket /ws/voice accepted.")

    try:
        from app.voice.pipeline import create_voice_pipeline
        await create_voice_pipeline(websocket)
    except EnvironmentError as exc:
        # Missing API keys — send error message then close
        logger.error("Voice pipeline env error: %s", exc)
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass
        await websocket.close(code=1011)
    except ImportError as exc:
        logger.error("Pipecat not installed: %s", exc)
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass
        await websocket.close(code=1011)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected normally.")
    except Exception as exc:
        logger.exception("Unexpected error in voice pipeline: %s", exc)
        try:
            await websocket.send_json({"type": "error", "message": "Internal voice pipeline error."})
        except Exception:
            pass
        await websocket.close(code=1011)
