"""
app/voice/pipeline.py - Pipecat voice pipeline for the Doctor Appointment Assistant

Compatibility notes for pipecat-ai==0.0.47:
- WebsocketServerTransport: pipecat.transports.network.websocket_server
- ElevenLabsTTSService: pipecat.services.elevenlabs
- ElevenLabsSTTService: pipecat.services.elevenlabs (wraps Deepgram underneath in some builds;
  in 0.0.47 ElevenLabs STT may not be separate — we fall back to using Deepgram or the
  built-in WebSocket audio -> Whisper pathway. If ElevenLabsSTTService does not exist in
  0.0.47, we skip STT service and rely on the transport's built-in audio handling.)
- GoogleLLMService: pipecat.services.google
- SileroVADAnalyzer: pipecat.vad.silero
- LLMContext / aggregators: pipecat.processors.aggregators.llm_response
- Pipeline / PipelineTask / PipelineRunner: pipecat.pipeline.*
- Function registration: llm.register_function(name)(callback)
"""

import asyncio
import json
import logging
import traceback
from typing import Optional

import aiohttp

from app.config import settings
from app.voice.agent import SYSTEM_PROMPT
from app.tools.appointment_tools import TOOL_REGISTRY, APPOINTMENT_TOOLS

logger = logging.getLogger(__name__)


async def _dispatch_tool(function_name: str, arguments: dict) -> dict:
    """Route a function call to the matching tool."""
    handler = TOOL_REGISTRY.get(function_name)
    if handler is None:
        return {"error": f"Unknown tool: {function_name}"}
    try:
        result = await handler(**arguments)
        return result
    except Exception as exc:
        logger.error("Tool %s raised: %s", function_name, exc)
        return {"error": str(exc)}


async def create_voice_pipeline(websocket):
    """
    Build and run the full Pipecat voice pipeline for one WebSocket client.

    This function is awaited per-connection from the FastAPI WebSocket endpoint.
    """
    # Validate required API keys before starting
    missing = []
    if not settings.GEMINI_API_KEY:
        missing.append("GEMINI_API_KEY")
    if not settings.ELEVENLABS_API_KEY:
        missing.append("ELEVENLABS_API_KEY")
    if not settings.ELEVENLABS_VOICE_ID:
        missing.append("ELEVENLABS_VOICE_ID")
    if missing:
        raise EnvironmentError(
            f"Cannot start voice pipeline — missing API keys: {', '.join(missing)}. "
            "Set them in your .env file."
        )

    try:
        # Import Pipecat components (deferred so the app starts even if pipecat isn't installed)
        from pipecat.pipeline.pipeline import Pipeline
        from pipecat.pipeline.task import PipelineTask, PipelineParams
        from pipecat.pipeline.runner import PipelineRunner
        from pipecat.transports.network.websocket_server import (
            WebsocketServerTransport,
            WebsocketServerParams,
        )
        from pipecat.services.elevenlabs import ElevenLabsTTSService
        from pipecat.services.google import GoogleLLMService
        from pipecat.processors.aggregators.llm_response import (
            LLMUserContextAggregator,
            LLMAssistantContextAggregator,
        )
        from pipecat.frames.frames import LLMMessagesFrame

        # Try importing VAD — gracefully skip if not available
        vad_analyzer = None
        try:
            from pipecat.vad.silero import SileroVADAnalyzer
            vad_analyzer = SileroVADAnalyzer()
            logger.info("Silero VAD loaded successfully.")
        except ImportError:
            logger.warning("Silero VAD not available; proceeding without VAD.")

        # Try importing ElevenLabs STT — may not exist in 0.0.47
        stt_service = None
        try:
            from pipecat.services.elevenlabs import ElevenLabsSTTService
            stt_service = ElevenLabsSTTService(api_key=settings.ELEVENLABS_API_KEY)
            logger.info("ElevenLabsSTTService loaded.")
        except (ImportError, AttributeError):
            logger.warning(
                "ElevenLabsSTTService not found in pipecat 0.0.47; "
                "audio transcription relies on transport-level handling."
            )

    except ImportError as exc:
        raise ImportError(
            f"pipecat-ai is not installed or missing extras. "
            f"Run: pip install 'pipecat-ai[google,elevenlabs,silero]==0.0.47'\n"
            f"Original error: {exc}"
        ) from exc

    async with aiohttp.ClientSession() as session:
        # ── Transport ────────────────────────────────────────────────────────
        transport_params = WebsocketServerParams(
            audio_out_enabled=True,
            add_wav_header=True,
            vad_enabled=(vad_analyzer is not None),
            vad_analyzer=vad_analyzer,
            transcription_enabled=True,
        )
        transport = WebsocketServerTransport(
            websocket=websocket,
            params=transport_params,
        )

        # ── LLM ─────────────────────────────────────────────────────────────
        llm = GoogleLLMService(
            api_key=settings.GEMINI_API_KEY,
            model="gemini-1.5-flash-latest",
        )

        # Register all three appointment tools
        for tool_group in APPOINTMENT_TOOLS:
            for func_decl in tool_group.get("function_declarations", []):
                tool_name = func_decl["name"]

                # Build a closure so each handler captures the correct tool_name
                def _make_handler(name):
                    async def _handler(function_name, tool_call_id, arguments, llm_svc, context, result_callback):
                        logger.info("Tool call: %s(%s)", name, arguments)
                        result = await _dispatch_tool(name, arguments)
                        await result_callback(result)
                    return _handler

                llm.register_function(tool_name, _make_handler(tool_name))

        # ── TTS ─────────────────────────────────────────────────────────────
        tts = ElevenLabsTTSService(
            aiohttp_session=session,
            api_key=settings.ELEVENLABS_API_KEY,
            voice_id=settings.ELEVENLABS_VOICE_ID,
        )

        # ── Context / Aggregators ────────────────────────────────────────────
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ]

        user_aggregator = LLMUserContextAggregator(messages)
        assistant_aggregator = LLMAssistantContextAggregator(user_aggregator)

        # ── Build pipeline ───────────────────────────────────────────────────
        # Pipeline order:
        #   transport.input → [stt] → user_aggregator → llm → tts → assistant_aggregator → transport.output
        pipeline_stages = [transport.input()]
        if stt_service:
            pipeline_stages.append(stt_service)
        pipeline_stages += [
            user_aggregator,
            llm,
            tts,
            assistant_aggregator,
            transport.output(),
        ]

        pipeline = Pipeline(pipeline_stages)

        # ── Task & Runner ────────────────────────────────────────────────────
        task = PipelineTask(
            pipeline,
            params=PipelineParams(allow_interruptions=True),
        )
        runner = PipelineRunner()

        # Send initial greeting
        @transport.event_handler("on_client_connected")
        async def on_client_connected(transport_obj, client):
            logger.info("Voice client connected.")
            # Kick off the conversation with the system prompt context
            await task.queue_frames([
                LLMMessagesFrame(messages),
            ])

        @transport.event_handler("on_client_disconnected")
        async def on_client_disconnected(transport_obj, client):
            logger.info("Voice client disconnected.")
            await task.cancel()

        logger.info("Starting voice pipeline…")
        await runner.run(task)
