import React, { useEffect, useRef } from 'react';
import type { BookingResult, CallStatus, TranscriptEntry, VoiceState } from '../types';
import { Mic, MicOff, PhoneOff, Phone } from 'lucide-react';
import AudioWaveform from './AudioWaveform';
import BookingConfirmation from './BookingConfirmation';

interface CallInterfaceProps {
  status: CallStatus;
  voiceState: VoiceState;
  transcript: TranscriptEntry[];
  callDuration: number;
  isMuted: boolean;
  bookingResult: BookingResult | null;
  onEnd: () => void;
  onToggleMute: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getStatusText(status: CallStatus, voiceState: VoiceState): { text: string; color: string } {
  if (status === 'connecting') return { text: 'Connecting...', color: 'text-yellow-500' };
  if (status === 'ending') return { text: 'Ending call...', color: 'text-slate-400' };
  if (voiceState === 'speaking') return { text: 'AI is speaking', color: 'text-blue-500' };
  if (voiceState === 'listening') return { text: 'Listening...', color: 'text-green-500' };
  if (voiceState === 'processing') return { text: 'Processing...', color: 'text-purple-500' };
  return { text: 'Connected', color: 'text-green-500' };
}

const CallInterface: React.FC<CallInterfaceProps> = ({
  status,
  voiceState,
  transcript,
  callDuration,
  isMuted,
  bookingResult,
  onEnd,
  onToggleMute,
}) => {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const { text: statusText } = getStatusText(status, voiceState);

  // Extract phone from transcript
  const phoneMatch = transcript
    .find((t) => t.role === 'user' && /\d{10,}/.test(t.text))
    ?.text.match(/\d{10,}/)?.[0];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnecting ? 'bg-yellow-400 animate-pulse' : isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-sm font-medium opacity-90">{statusText}</span>
            </div>
            {isConnected && (
              <span className="font-mono text-sm bg-blue-700/50 px-3 py-1 rounded-full">
                {formatDuration(callDuration)}
              </span>
            )}
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 ring-4 ring-white/20">
              <Phone size={28} />
            </div>
            <h2 className="font-semibold text-lg">City Health Clinic</h2>
            <p className="text-blue-200 text-sm">Voice AI Assistant</p>
            {phoneMatch && (
              <p className="text-blue-100 text-xs mt-1 font-mono">Patient: {phoneMatch}</p>
            )}
          </div>
        </div>

        {/* Waveform / listening indicator */}
        <div className="px-6 py-4 border-b border-slate-100">
          {isConnecting ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span className="text-sm text-slate-500">Establishing connection...</span>
            </div>
          ) : voiceState === 'speaking' ? (
            <div className="flex flex-col items-center gap-1">
              <AudioWaveform active={true} />
              <span className="text-xs text-blue-500 font-medium">AI Speaking</span>
            </div>
          ) : voiceState === 'listening' ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-600 font-medium">Listening to you...</span>
            </div>
          ) : voiceState === 'processing' ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-purple-600">Processing...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <AudioWaveform active={false} />
              <span className="text-xs text-slate-400">Idle</span>
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="px-4 py-3 h-52 overflow-y-auto space-y-2">
          {transcript.length === 0 && (
            <p className="text-center text-sm text-slate-400 mt-8">
              {isConnecting ? 'Starting conversation...' : 'Conversation will appear here'}
            </p>
          )}
          {transcript.map((entry) => (
            <div
              key={entry.id}
              className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                  entry.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}
              >
                {entry.text}
              </div>
            </div>
          ))}
          {/* Booking confirmation */}
          {bookingResult && <BookingConfirmation booking={bookingResult} />}
          <div ref={transcriptEndRef} />
        </div>

        {/* Controls */}
        <div className="px-6 py-5 border-t border-slate-100 flex items-center justify-center gap-6">
          <button
            onClick={onToggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              isMuted
                ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-110'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            onClick={onEnd}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-200 transition-all duration-200 hover:scale-105 active:scale-95"
            title="End call"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallInterface;
