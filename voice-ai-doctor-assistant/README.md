# Voice AI Doctor Appointment Assistant

A production-quality, end-to-end Voice AI application for booking doctor appointments using real-time voice conversation.

## Architecture

```
Patient (Browser)
      │
      │  WebSocket (binary PCM audio)
      ▼
┌─────────────────────────────────────────┐
│          FastAPI Backend                │
│                                         │
│  ElevenLabs STT ──▶ Pipecat Pipeline   │
│                          │              │
│                    Google Gemini LLM    │
│                          │              │
│               Function Calling Tools   │
│         ┌────────┬───────┴──────────┐  │
│  check_doctor   book_appointment  cancel│
│  _availability                         │
│         └────────┴──────────┬────────┘  │
│                        SQLite DB        │
│                             │           │
│                    ElevenLabs TTS       │
│                             │           │
│                     (audio back)        │
└─────────────────────────────────────────┘
      │
      │  REST API (JSON)
      ▼
┌─────────────────────────────────────────┐
│        React Dashboard (Vite)           │
│  Overview │ Voice │ Doctors │ Appts     │
│  Real-time transcript & booking updates │
└─────────────────────────────────────────┘
```

## Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Web framework | FastAPI 0.111 |
| Voice pipeline | Pipecat-AI 0.0.47 |
| LLM | Google Gemini 1.5 Flash |
| STT | ElevenLabs Speech-to-Text |
| TTS | ElevenLabs Text-to-Speech |
| VAD | Silero VAD (via Pipecat) |
| Database | SQLite (async via aiosqlite) |
| Runtime | Python 3.10+ / Uvicorn |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Audio | Web Audio API (PCM 16-bit, 16kHz) |

## Voice Pipeline

```
Microphone → PCM 16-bit → WebSocket → Pipecat Transport
                                              │
                                    ElevenLabs STT
                                              │
                                    LLM Context Aggregator
                                              │
                                    Google Gemini LLM
                                              │
                              ┌───────────────┤
                              │  Function Call │
                              │  (tool name + │
                              │   arguments)  │
                              └───────────────┤
                                              │
                                    Tool execution (SQLite)
                                              │
                                    Tool result → Gemini
                                              │
                                    ElevenLabs TTS
                                              │
                              PCM Audio → WebSocket → Browser
                                              │
                                       Web Audio API playback
```

## Function-Calling Tools

### 1. `check_doctor_availability`
- Fuzzy-matches doctors by name or speciality
- Returns available slots for a given date
- Never returns already-booked slots
- Returns up to 20 nearest slots

### 2. `book_appointment`
- Validates phone number (10+ digits)
- Re-checks slot availability before booking
- Prevents duplicate bookings
- Atomically marks slot as `booked` and inserts appointment

### 3. `cancel_appointment`
- Finds appointments by patient phone
- Handles single and multiple appointment scenarios
- Frees the slot back to `available` status

## Database Schema

```sql
doctors
  id | name | speciality | experience | available_days (JSON)

appointment_slots
  id | doctor_id | appointment_date | appointment_time | status

appointments
  id | patient_phone | doctor_id | appointment_date | appointment_time | status | created_at
```

## Project Structure

```
voice-ai-doctor-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, lifespan
│   │   ├── config.py         # Environment settings
│   │   ├── database.py       # aiosqlite setup, init_db()
│   │   ├── models.py         # Pydantic models
│   │   ├── schemas.py        # API schemas
│   │   ├── api/
│   │   │   └── routes.py     # REST + WebSocket endpoints
│   │   ├── services/
│   │   │   ├── doctor_service.py
│   │   │   └── appointment_service.py
│   │   ├── tools/
│   │   │   └── appointment_tools.py  # 3 LLM tools + schemas
│   │   └── voice/
│   │       ├── agent.py      # System prompt
│   │       └── pipeline.py   # Pipecat pipeline factory
│   ├── seed_data.py          # DB seeder (6 doctors, 14-day slots)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── App.tsx            # Sidebar navigation shell
        ├── pages/
        │   ├── Overview.tsx   # Stats cards
        │   ├── VoiceAssistant.tsx  # Call UI + transcript
        │   ├── DoctorsPage.tsx
        │   └── AppointmentsPage.tsx
        ├── components/
        │   ├── CallInterface.tsx   # Phone-style call modal
        │   ├── AudioWaveform.tsx   # Animated bars
        │   ├── BookingConfirmation.tsx
        │   ├── DoctorsTable.tsx
        │   ├── AppointmentsTable.tsx
        │   └── StatsCard.tsx
        ├── hooks/
        │   ├── useVoiceCall.ts    # Call state + WS lifecycle
        │   └── useDashboardData.ts # Data + polling
        ├── services/
        │   ├── api.ts         # REST client
        │   └── websocket.ts   # Voice WebSocket + Web Audio
        └── types/index.ts
```

## Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm 9+

### Backend Setup

```bash
cd voice-ai-doctor-assistant/backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and fill in your API keys

# Seed the database (creates doctor_appointments.db)
python seed_data.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd voice-ai-doctor-assistant/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# → Runs on http://localhost:5173
```

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
GEMINI_API_KEY=your_google_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id
DATABASE_URL=./doctor_appointments.db
HOST=0.0.0.0
PORT=8000
```

### Getting API Keys

| Service | URL |
|---------|-----|
| Google Gemini | https://aistudio.google.com/app/apikey |
| ElevenLabs | https://elevenlabs.io/app/settings/api-keys |
| ElevenLabs Voice ID | https://elevenlabs.io/app/voice-lab (copy any voice ID) |

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/doctors` | List all doctors + slots |
| GET | `/api/appointments` | List all appointments |
| DELETE | `/api/appointments/{id}` | Cancel appointment |
| WS | `/ws/voice` | Voice pipeline connection |

## Testing Scenarios

### Test 1: Book an Appointment
1. Click **Voice Assistant** → **Start Call**
2. Say: *"I need to see a cardiologist"*
3. AI asks for your phone number → say: *"My number is 9876543210"*
4. AI reads it back → say: *"Yes, that's correct"*
5. AI presents available slots → say: *"I'll take the first one"*
6. AI confirms details → say: *"Yes, please book it"*
7. ✅ Appointment appears in the **Appointments** tab

### Test 2: Cancel an Appointment
1. Start a voice call
2. Say: *"I want to cancel my appointment, my number is 9876543210"*
3. AI finds and reads back your appointment details
4. Say: *"Yes, please cancel it"*
5. ✅ Appointment status updates to Cancelled in the dashboard

### Test 3: Unavailable Slot
1. Start a voice call
2. Request a doctor on a day they don't work
3. AI explains unavailability and offers alternatives

### Additional Edge Cases
- Invalid phone number → AI asks to repeat
- Unknown doctor → AI suggests available doctors
- Already-booked slot → AI offers next available slot
- Duplicate booking → AI informs of existing appointment

## Security Notes

- API keys are loaded from environment variables only — never hardcoded
- Phone numbers in the dashboard are masked (last 4 digits visible)
- Backend logs do not print full phone numbers
- CORS is restricted to localhost origins by default

## Known Limitations

1. **ElevenLabs STT in Pipecat 0.0.47**: The standalone `ElevenLabsSTTService` may not exist in this exact version. The pipeline falls back to transport-level audio handling. For full ElevenLabs STT, upgrade to `pipecat-ai>=0.0.60` where ElevenLabs STT is a first-class service.

2. **Pipecat WebSocket transport**: The pipeline uses `WebsocketServerTransport` with a per-connection `websocket` kwarg — the documented embedding pattern for ASGI apps. If your Pipecat version uses a different constructor, check the [Pipecat docs](https://github.com/pipecat-ai/pipecat).

3. **VAD**: Silero VAD is loaded conditionally. If the `silero` extra is not installed, the pipeline runs without VAD (all audio is processed, no end-of-speech detection).

4. **Audio format**: The frontend sends raw PCM 16-bit mono at 16kHz. Pipecat's WebSocket transport expects this format. Ensure your browser supports `AudioContext({ sampleRate: 16000 })`.
