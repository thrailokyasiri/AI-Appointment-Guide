import React from 'react';

interface AudioWaveformProps {
  active: boolean;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ active }) => {
  const bars = 7;

  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full transition-all duration-300 ${
            active
              ? 'bg-blue-500 animate-wave'
              : 'bg-slate-300 h-2'
          }`}
          style={
            active
              ? {
                  animationDelay: `${i * 0.12}s`,
                  animationDuration: '1.2s',
                  height: '100%',
                }
              : {}
          }
        />
      ))}
    </div>
  );
};

export default AudioWaveform;
