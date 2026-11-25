import React from 'react';
import { Mic, MicOff, PhoneCall, PhoneOff, Sparkles } from 'lucide-react';
import type { TranscriptEntry } from '../types';
import { useVoiceCall } from '../hooks/useVoiceCall';
import CallInterface from '../components/CallInterface';

interface VoiceAssistantProps {
  onCallStatusChange?: (active: boolean) => void;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onCallStatusChange }) => {
  const { status, voiceState, transcript, callDuration, isMuted, bookingResult, startCall, endCall, toggleMute } =
    useVoiceCall();

  const isActive = status === 'connected' || status === 'connecting';
  const isIdle = status === 'idle' || status === 'ended';

  React.useEffect(() => {
    onCallStatusChange?.(isActive);
  }, [isActive, onCallStatusChange]);

  const recentTranscript = transcript.slice(-5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Voice Assistant</h1>
        <p className="text-slate-500 text-sm mt-1">AI-powered appointment booking via voice</p>
      </div>

      {/* Main call card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <div className="flex flex-col items-center gap-6">
          {/* Animated mic button */}
          <div className="relative">
            {isActive && (
              <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping" />
            )}
            <button
              onClick={isIdle ? startCall : endCall}
              disabled={status === 'ending'}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                isActive
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-200 hover:scale-105'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 hover:scale-105'
              } active:scale-95 disabled:opacity-50`}
            >
              {isActive ? (
                <PhoneOff size={36} className="text-white" />
              ) : (
                <Mic size={36} className="text-white" />
              )}
            </button>
          </div>

          {/* Status text */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-800">
              {status === 'idle' && 'Ready to assist'}
              {status === 'connecting' && 'Connecting...'}
              {status === 'connected' && 'Call in progress'}
              {status === 'ending' && 'Ending call...'}
              {status === 'ended' && 'Call ended'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isIdle
                ? 'Click the microphone to speak with our AI assistant'
                : 'AI assistant is handling your appointment request'}
            </p>
          </div>

          {/* Features hint */}
          {isIdle && (
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {['Book appointments', 'Check availability', 'Cancel bookings'].map((feature) => (
                <span key={feature} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                  <Sparkles size={11} />
                  {feature}
                </span>
              ))}
            </div>
          )}

          {/* Active call controls strip */}
          {isActive && (
            <div className="flex items-center gap-4">
              <button
                onClick={toggleMute}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isMuted
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <span className="text-sm text-slate-400">
                {voiceState === 'speaking' && '🔊 AI speaking...'}
                {voiceState === 'listening' && '🎤 Listening...'}
                {voiceState === 'processing' && '⏳ Processing...'}
                {voiceState === 'idle' && <PhoneCall size={14} className="inline text-green-500" />}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recent transcript */}
      {transcript.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 text-sm mb-3">Recent Conversation</h3>
          <div className="space-y-2">
            {recentTranscript.map((entry: TranscriptEntry) => (
              <div key={entry.id} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                  entry.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {entry.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-blue-500" />
          How to use
        </h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex gap-2"><span className="font-bold text-blue-500">1.</span> Click the microphone button to start</li>
          <li className="flex gap-2"><span className="font-bold text-blue-500">2.</span> Tell the AI your preferred doctor or speciality</li>
          <li className="flex gap-2"><span className="font-bold text-blue-500">3.</span> Provide your preferred date and time</li>
          <li className="flex gap-2"><span className="font-bold text-blue-500">4.</span> Share your phone number for confirmation</li>
          <li className="flex gap-2"><span className="font-bold text-blue-500">5.</span> AI confirms and books your appointment</li>
        </ol>
      </div>

      {/* Call overlay */}
      {isActive && (
        <CallInterface
          status={status}
          voiceState={voiceState}
          transcript={transcript}
          callDuration={callDuration}
          isMuted={isMuted}
          bookingResult={bookingResult}
          onEnd={endCall}
          onToggleMute={toggleMute}
        />
      )}
    </div>
  );
};

export default VoiceAssistant;
