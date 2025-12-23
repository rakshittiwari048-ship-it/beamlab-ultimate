/**
 * AIGenerationOverlay.tsx
 * 
 * Full-screen loading overlay shown during AI model generation.
 * Displays animated progress indicator with text feedback.
 */

import { Sparkles, Loader2 } from 'lucide-react';

interface AIGenerationOverlayProps {
  isVisible: boolean;
  message?: string;
}

export const AIGenerationOverlay = ({ isVisible, message = 'Generating structure...' }: AIGenerationOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-8 bg-gray-800/90 rounded-2xl border border-gray-700 shadow-2xl">
        {/* Animated Icon */}
        <div className="relative">
          <Sparkles className="w-16 h-16 text-blue-400 animate-pulse" />
          <Loader2 className="w-16 h-16 text-purple-400 absolute inset-0 animate-spin" style={{ animationDuration: '3s' }} />
        </div>

        {/* Message */}
        <div className="text-center">
          <p className="text-lg font-semibold text-white">{message}</p>
          <p className="text-sm text-gray-400 mt-1">Watch nodes appear in the canvas...</p>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
