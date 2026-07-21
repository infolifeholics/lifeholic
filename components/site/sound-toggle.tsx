'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

export function SoundToggle() {
  const [playing, setPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const windVolumeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<any>(null);

  // Initialize Web Audio nodes
  const initAudio = () => {
    if (audioCtxRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    // 1. Wind Generator (Filtered Noise + LFO Modulation)
    const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const outputData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      outputData[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to shape the noise into "wind" sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.0;
    filter.frequency.value = 350;

    // LFO to slowly modulate wind frequency (simulating gentle wind gusts)
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08; // very slow cycle
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 150; // swing frequency by 150Hz

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    // Wind Gain controls overall volume
    const windVolume = ctx.createGain();
    windVolume.gain.value = 0.05; // soft wind volume
    windVolumeRef.current = windVolume;

    whiteNoise.connect(filter);
    filter.connect(windVolume);
    windVolume.connect(ctx.destination);

    // Start wind generators
    lfo.start();
    whiteNoise.start();

    // 2. Schedule occasional peaceful singing bowl/chime strikes
    const strikeBowl = () => {
      if (ctx.state === 'suspended') return;

      const now = ctx.currentTime;
      // tuned to a peaceful C/D scale harmonic (144Hz)
      const baseFreq = 144; 
      const frequencies = [baseFreq, baseFreq * 2.02, baseFreq * 3.05, baseFreq * 4.09];
      const gains = [0.08, 0.04, 0.02, 0.01];

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Slow bell strike envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(gains[idx], now + 0.08); // attack
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 12); // long decay

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 12.5);
      });
    };

    // Stike once immediately and every 18 seconds
    strikeBowl();
    intervalRef.current = setInterval(strikeBowl, 18000);
  };

  const handleToggle = () => {
    if (!audioCtxRef.current) {
      initAudio();
    }

    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => setPlaying(true));
    } else if (ctx.state === 'running') {
      ctx.suspend().then(() => setPlaying(false));
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleToggle}
      className="fixed bottom-6 right-6 z-[999] flex h-11 w-11 items-center justify-center rounded-full glass border border-white/10 text-foreground shadow-glow backdrop-blur-md transition-all"
      aria-label={playing ? 'Mute ambient sound' : 'Unmute ambient sound'}
    >
      {playing ? (
        <Volume2 className="h-5 w-5 text-gold animate-pulse" />
      ) : (
        <VolumeX className="h-5 w-5 text-muted-foreground" />
      )}
    </motion.button>
  );
}

export default SoundToggle;
