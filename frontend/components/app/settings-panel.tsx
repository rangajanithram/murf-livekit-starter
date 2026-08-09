import React from 'react';
import { Volume2, Scaling } from 'lucide-react';
import { cn } from '@/lib/shadcn/utils';

interface SettingsPanelProps {
  uiSize: 'normal' | 'large';
  setUiSize: (size: 'normal' | 'large') => void;
  volume: number;
  setVolume: (vol: number) => void;
}

export function SettingsPanel({ uiSize, setUiSize, volume, setVolume }: SettingsPanelProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 bg-white/90 backdrop-blur shadow-md border-2 border-[#002045]/20 rounded-xl p-3 max-w-[200px] animate-fade-in origin-bottom-right transition-all">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-[#002045] uppercase tracking-wide flex items-center gap-1">
          <Scaling className="w-3 h-3" /> UI Size
        </label>
        <div className="flex bg-[#002045]/5 rounded-lg p-1">
          <button
            onClick={() => setUiSize('normal')}
            className={cn(
              "flex-1 text-xs font-semibold py-1 rounded-md transition-colors",
              uiSize === 'normal' ? "bg-[#002045] text-white shadow" : "text-[#002045] hover:bg-[#002045]/10"
            )}
          >
            Normal
          </button>
          <button
            onClick={() => setUiSize('large')}
            className={cn(
              "flex-1 text-xs font-semibold py-1 rounded-md transition-colors",
              uiSize === 'large' ? "bg-[#002045] text-white shadow" : "text-[#002045] hover:bg-[#002045]/10"
            )}
          >
            Large
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-[#002045] uppercase tracking-wide flex items-center gap-1">
          <Volume2 className="w-3 h-3" /> Lexi Volume
        </label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full accent-[#002045]"
        />
        <div className="text-[10px] text-[#002045]/60 text-right font-mono">
          {Math.round(volume * 100)}%
        </div>
      </div>
    </div>
  );
}
