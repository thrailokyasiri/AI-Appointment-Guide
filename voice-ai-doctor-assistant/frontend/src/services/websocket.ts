import type { BookingResult, TranscriptEntry, VoiceState } from '../types';

type EventMap = {
  transcript: TranscriptEntry;
  booking_confirmed: BookingResult;
  status_change: string;
  voice_state: VoiceState;
  error: string;
  connected: undefined;
  disconnected: undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener<T> = (data: T) => void;

type ListenersMap = {
  [K in keyof EventMap]?: Array<Listener<EventMap[K]>>;
};

class VoiceWebSocketService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private audioQueue: Float32Array[] = [];
  private isPlayingAudio = false;
  private listeners: ListenersMap = {};
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private isMuted = false;
  private sourceNode: AudioBufferSourceNode | null = null;

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    if (!this.listeners[event]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.listeners as any)[event] = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((this.listeners as any)[event] as Array<Listener<EventMap[K]>>).push(listener);
  }

  off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    const arr = this.listeners[event] as Array<Listener<EventMap[K]>> | undefined;
    if (arr) {
      (this.listeners[event] as Array<Listener<EventMap[K]>>) = arr.filter((l) => l !== listener);
    }
  }

  private emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const arr = this.listeners[event] as Array<Listener<EventMap[K]>> | undefined;
    arr?.forEach((l) => l(data));
  }

  async connect(): Promise<void> {
    this.shouldReconnect = true;
    this.emit('status_change', 'connecting');

    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 });

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      this.ws = new WebSocket('ws://localhost:8000/ws/voice');
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.emit('connected', undefined);
        this.emit('status_change', 'connected');
        this.startMicCapture();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = () => {
        this.emit('error', 'WebSocket connection error');
      };

      this.ws.onclose = () => {
        this.emit('disconnected', undefined);
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.emit('error', err instanceof Error ? err.message : 'Connection failed');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  private handleMessage(event: MessageEvent): void {
    if (typeof event.data === 'string') {
      try {
        const msg = JSON.parse(event.data) as {
          type: string;
          text?: string;
          role?: 'user' | 'assistant';
          id?: string;
          state?: VoiceState;
          booking?: BookingResult;
        };

        if (msg.type === 'transcript' && msg.text) {
          const entry: TranscriptEntry = {
            id: msg.id ?? crypto.randomUUID(),
            role: msg.role ?? 'assistant',
            text: msg.text,
            timestamp: new Date(),
          };
          this.emit('transcript', entry);
        } else if (msg.type === 'voice_state' && msg.state) {
          this.emit('voice_state', msg.state);
        } else if (msg.type === 'booking_confirmed' && msg.booking) {
          this.emit('booking_confirmed', msg.booking);
        }
      } catch {
        // non-JSON text ignored
      }
    } else if (event.data instanceof ArrayBuffer) {
      this.enqueueAudio(event.data);
      this.emit('voice_state', 'speaking');
    }
  }

  private enqueueAudio(buffer: ArrayBuffer): void {
    const int16 = new Int16Array(buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }
    this.audioQueue.push(float32);
    if (!this.isPlayingAudio) {
      this.playNextChunk();
    }
  }

  private playNextChunk(): void {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      return;
    }
    this.isPlayingAudio = true;
    const chunk = this.audioQueue.shift()!;
    const audioBuffer = this.audioContext.createBuffer(1, chunk.length, 16000);
    // The Float32Array from getChannelData is compatible; cast to suppress strict lib variance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audioBuffer.copyToChannel(chunk as any, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    this.sourceNode = source;
    source.onended = () => { this.playNextChunk(); };
    source.start();
  }

  private startMicCapture(): void {
    if (!this.audioContext || !this.mediaStream) return;

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (event) => {
      if (this.ws?.readyState !== WebSocket.OPEN || this.isMuted) return;
      const float32 = event.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
      }
      this.ws.send(int16.buffer);
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
  }

  setMuted(muted: boolean): void { this.isMuted = muted; }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.scriptProcessor?.disconnect();
    this.scriptProcessor = null;
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
    this.sourceNode?.stop();
    this.sourceNode = null;
    this.audioQueue = [];
    this.isPlayingAudio = false;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.audioContext?.close().catch(() => {});
    this.audioContext = null;
  }

  private scheduleReconnect(): void {
    this.cleanup();
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) { void this.connect(); }
    }, 3000);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const voiceWS = new VoiceWebSocketService();
