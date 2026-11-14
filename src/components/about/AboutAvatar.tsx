import { useEffect, useRef, useState } from 'react';

import { createPixelAvatar, type AvatarMood } from '../../lib/pixel-avatar';

interface Mood {
  key: AvatarMood;
  label: string;
}

interface Props {
  moods: Mood[];
  label: string;
  controlsLabel: string;
}

export default function AboutAvatar({ moods, label, controlsLabel }: Props) {
  const [mood, setMood] = useState<AvatarMood>('default');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return createPixelAvatar(canvas, mood);
  }, [mood]);

  const activeMood = moods.find((item) => item.key === mood);

  return (
    <div className="about-avatar">
      <div
        className="about-avatar-portrait"
        role="img"
        aria-label={activeMood ? `${label} · ${activeMood.label}` : label}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
      <div className="about-avatar-controls" role="group" aria-label={controlsLabel}>
        {moods.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={item.key === mood}
            onClick={() => setMood(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
