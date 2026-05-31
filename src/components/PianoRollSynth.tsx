/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { NoteEvent, SynthConfig } from '../types';
import { getNoteName, isBlackKey, downloadMidiFile } from '../utils/midi';
import { Play, Pause, Square, Download, Settings, Volume2, Music, Check, Radio } from 'lucide-react';

interface PianoRollSynthProps {
  notes: NoteEvent[];
  sourceName: string;
}

export default function PianoRollSynth({ notes, sourceName }: PianoRollSynthProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [synthType, setSynthType] = useState<SynthConfig['type']>('triangle');
  const [adsr, setAdsr] = useState({
    attack: 0.05,
    decay: 0.15,
    sustain: 0.6,
    release: 0.3
  });
  
  // Recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  
  // References
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeOscillatorsRef = useRef<Record<string, { osc: OscillatorNode; gain: GainNode }>>({});
  const playSchedulerIntervalRef = useRef<number | null>(null);
  const currentBeatRef = useRef(0);
  const playheadAnimationRef = useRef<number | null>(null);
  
  // MediaRecorder references for recording audio output
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Initialize Web Audio context safely on user interaction
  const getAudioContext = (): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Convert beat timeline coordinates to seconds offset
  const beatToSeconds = (beatsCount: number) => beatsCount * (60 / bpm);

  // Synthesize and play a single midi pitch using ADSR volume shape
  const triggerSynthTone = (pitch: number, durationBeats: number, startTimeOffsetBeats: number = 0) => {
    try {
      const audioCtx = getAudioContext();
      
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      const frequency = 440 * Math.pow(2, (pitch - 69) / 12);
      osc.type = synthType;
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

      // Route through both standard destination (speaker) and recording destination stream if active
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (isRecordingAudio && streamDestinationRef.current) {
        gainNode.connect(streamDestinationRef.current);
      }

      // Timings in seconds
      const secStart = audioCtx.currentTime + beatToSeconds(startTimeOffsetBeats);
      const secDuration = beatToSeconds(durationBeats);
      const secRelease = secStart + secDuration;

      // ADSR Envelope trigger logic
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      
      // Attack
      gainNode.gain.linearRampToValueAtTime(0.25, secStart + adsr.attack);
      // Decay to Sustain level
      gainNode.gain.exponentialRampToValueAtTime(0.25 * adsr.sustain, secStart + adsr.attack + adsr.decay);
      
      // Release trigger
      gainNode.gain.setValueAtTime(0.25 * adsr.sustain, secRelease);
      gainNode.gain.exponentialRampToValueAtTime(1e-4, secRelease + adsr.release);

      // Schedule oscillation lifecycle
      osc.start(secStart);
      osc.stop(secRelease + adsr.release + 0.1);
    } catch (e) {
      console.warn("Synth player error:", e);
    }
  };

  // Layout Boundaries calculations for the Piano roll viewport grid
  const pitchValues = notes.map(n => n.pitch);
  const maxPitch = pitchValues.length > 0 ? Math.max(...pitchValues) + 2 : 76; // Default bounds
  const minPitch = pitchValues.length > 0 ? Math.min(...pitchValues) - 2 : 60;
  
  // Total ticks/beats of the sequence
  const maxBeats = notes.length > 0 ? Math.ceil(Math.max(...notes.map(n => n.start + n.duration))) : 16;
  const beatsHeader = Array.from({ length: maxBeats }, (_, i) => i);

  // Group piano roll keys top down (descending pitch)
  const rollKeys: number[] = [];
  for (let p = maxPitch; p >= minPitch; p--) {
    rollKeys.push(p);
  }

  // Playback scheduler ticker loop
  const handleTogglePlay = () => {
    if (isPlaying) {
      clearIntervalScheduler();
      stopAllSynthLines();
    } else {
      startPlaybackScheduler();
    }
  };

  const startPlaybackScheduler = () => {
    const audioCtx = getAudioContext();
    setIsPlaying(true);

    // Setup standard media stream audio recorder if specified
    if (isRecordingAudio) {
      try {
        const dest = audioCtx.createMediaStreamDestination();
        streamDestinationRef.current = dest;
        const mediaRec = new MediaRecorder(dest.stream);
        mediaRecorderRef.current = mediaRec;
        
        const chunks: Blob[] = [];
        mediaRec.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRec.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm; codecs=opus' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `AI-Synthesizer-${sourceName.replace(/\s+/g, '-')}.webm`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          setRecordedChunks([]);
        };
        mediaRec.start();
      } catch (err) {
        console.warn("Recording setup failed:", err);
      }
    }

    // Capture start stamp
    const beatLengthSeconds = 60 / bpm;
    const intervalMs = 50; // High rate ticks for precise scrolling playhead tracker
    let startTime = Date.now() - (currentBeatRef.current * beatLengthSeconds * 1000);

    // Filter notes that start in the future relative to current playhead
    const playedNotesId = new Set<string>();

    const tick = () => {
      const elapsedMs = Date.now() - startTime;
      const computedBeat = elapsedMs / (beatLengthSeconds * 1000);
      
      if (computedBeat >= maxBeats) {
        // Loop complete, halt scheduler or loop
        clearIntervalScheduler();
        stopAllSynthLines();
        currentBeatRef.current = 0;
        setCurrentBeat(0);
        return;
      }

      currentBeatRef.current = computedBeat;
      setCurrentBeat(computedBeat);

      // Trigger notes scheduled for this window
      notes.forEach((note) => {
        if (note.start >= computedBeat && note.start < computedBeat + 0.08) {
          if (!playedNotesId.has(note.id)) {
            playedNotesId.add(note.id);
            // Schedule the trigger
            const onsetBypass = note.start - computedBeat;
            triggerSynthTone(note.pitch, note.duration, onsetBypass);
          }
        }
      });
    };

    playSchedulerIntervalRef.current = window.setInterval(tick, intervalMs);
  };

  const clearIntervalScheduler = () => {
    if (playSchedulerIntervalRef.current) {
      clearInterval(playSchedulerIntervalRef.current);
      playSchedulerIntervalRef.current = null;
    }
    
    // Stop recorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsPlaying(false);
  };

  const handleStop = () => {
    clearIntervalScheduler();
    stopAllSynthLines();
    currentBeatRef.current = 0;
    setCurrentBeat(0);
  };

  const stopAllSynthLines = () => {
    // Soft stop oscillators
    activeOscillatorsRef.current = {};
  };

  useEffect(() => {
    return () => {
      clearIntervalScheduler();
    };
  }, []);

  // Handle standard MIDI binary download trigger
  const handleExportMIDI = () => {
    if (notes.length === 0) return;
    const filteredName = sourceName ? sourceName : "melodic-generation";
    downloadMidiFile(notes, `AI-Generated-${filteredName.replace(/\s+/g, '_')}.mid`);
  };

  return (
    <div className="bg-panel rounded-xl border border-panel-border shadow-2xl flex flex-col overflow-hidden h-full">
      {/* Tracker Toolbar */}
      <div className="p-4 border-b border-panel-border bg-black/40 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Playback Controls */}
        <div className="flex items-center gap-1 bg-black/30 border border-panel-border p-1.5 rounded-xl shadow-inner w-full md:w-auto justify-center">
          <button
            onClick={handleTogglePlay}
            className={`p-2.5 rounded-lg flex items-center justify-center transition cursor-pointer ${
              isPlaying
                ? 'bg-gold/10 text-gold hover:bg-gold/20'
                : 'bg-gold text-black hover:bg-gold/90 shadow-md shadow-gold/10'
            }`}
            title={isPlaying ? "Pause MIDI Player" : "Play MIDI Synthesizer"}
          >
            {isPlaying ? <Pause size={14} className="fill-current stroke-[3]" /> : <Play size={14} className="fill-current" />}
          </button>
          <button
            onClick={handleStop}
            className="p-2.5 text-text-s hover:text-text-p hover:bg-white/5 rounded-lg transition cursor-pointer"
            title="Stop MIDI Player"
          >
            <Square size={14} className="fill-current text-text-s/60 hover:text-text-p" />
          </button>
          
          <div className="h-6 w-px bg-panel-border mx-2" />

          {/* Records live performance audio toggler */}
          <button
            onClick={() => {
              if (isPlaying) {
                handleStop();
              }
              setIsRecordingAudio(!isRecordingAudio);
            }}
            className={`p-2.5 rounded-lg flex items-center gap-1.5 text-[11px] font-semibold transition cursor-pointer ${
              isRecordingAudio
                ? 'bg-red-950/60 text-red-400 hover:bg-red-900 border border-red-900/50 animate-pulse'
                : 'text-text-s hover:text-text-p hover:bg-white/5'
            }`}
            title="Record Synthesized Outputs"
          >
            <Radio size={14} className={isRecordingAudio ? 'text-red-500' : 'text-text-s'} />
            <span>{isRecordingAudio ? "Rec Active" : "WAV Stream Record"}</span>
          </button>
        </div>

        {/* BPM & Instrument Synthesis Selection controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* BPM Tempo slider */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 border border-panel-border rounded-xl shadow-md text-xs font-mono text-text-s">
            <span className="text-text-s">Tempo:</span>
            <input
              type="number"
              min={60}
              max={240}
              value={bpm}
              onChange={(e) => setBpm(Math.max(60, Math.min(240, parseInt(e.target.value) || 120)))}
              className="w-10 font-bold text-center bg-transparent text-gold border-none focus:outline-hidden focus:ring-0 p-0 outline-hidden"
            />
            <span className="text-text-s/80">BPM</span>
          </div>

          {/* Oscillator drop select */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 border border-panel-border rounded-xl shadow-md text-xs font-mono text-text-s">
            <Settings size={12} className="text-text-s" />
            <span className="text-text-s mr-1">Synth:</span>
            <select
              value={synthType}
              onChange={(e) => setSynthType(e.target.value as SynthConfig['type'])}
              className="bg-[#181818] font-bold border-none text-gold focus:outline-hidden text-xs p-0 cursor-pointer"
            >
              <option value="sine">Sine (Soft)</option>
              <option value="triangle">Triangle (Round)</option>
              <option value="square">Square (Chiptune)</option>
              <option value="sawtooth">Sawtooth (Lead)</option>
            </select>
          </div>

          {/* MIDI Export Action Button */}
          <button
            onClick={handleExportMIDI}
            disabled={notes.length === 0}
            className="flex items-center gap-1.5 bg-black border border-panel-border text-gold font-serif hover:bg-gold hover:text-black font-medium text-xs px-3 py-2 rounded-xl shadow-xs transition duration-150 cursor-pointer disabled:bg-black/35 disabled:border-panel-border disabled:text-text-s/60 disabled:cursor-not-allowed"
          >
            <Download size={13} />
            Download MIDI File
          </button>
        </div>
      </div>

      {/* ADSR Envelope Controls Panel */}
      <div className="px-4 py-2 border-b border-panel-border bg-[#0d0d0d] grid grid-cols-4 gap-4">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono font-medium text-text-s leading-none">
            <span>A (Attack)</span>
            <span className="text-gold">{adsr.attack.toFixed(2)}s</span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.5}
            step={0.01}
            value={adsr.attack}
            onChange={(e) => setAdsr(prev => ({ ...prev, attack: parseFloat(e.target.value) }))}
            className="w-full accent-gold h-1 cursor-pointer bg-[#1e1e1e] rounded"
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono font-medium text-text-s leading-none">
            <span>D (Decay)</span>
            <span className="text-gold">{adsr.decay.toFixed(2)}s</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1.0}
            step={0.01}
            value={adsr.decay}
            onChange={(e) => setAdsr(prev => ({ ...prev, decay: parseFloat(e.target.value) }))}
            className="w-full accent-gold h-1 cursor-pointer bg-[#1e1e1e] rounded"
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono font-medium text-text-s leading-none">
            <span>S (Sustain)</span>
            <span className="text-gold">{Math.round(adsr.sustain * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1.0}
            step={0.05}
            value={adsr.sustain}
            onChange={(e) => setAdsr(prev => ({ ...prev, sustain: parseFloat(e.target.value) }))}
            className="w-full accent-gold h-1 cursor-pointer bg-[#1e1e1e] rounded"
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono font-medium text-text-s leading-none">
            <span>R (Release)</span>
            <span className="text-gold">{adsr.release.toFixed(2)}s</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1.5}
            step={0.05}
            value={adsr.release}
            onChange={(e) => setAdsr(prev => ({ ...prev, release: parseFloat(e.target.value) }))}
            className="w-full accent-gold h-1 cursor-pointer bg-[#1e1e1e] rounded"
          />
        </div>
      </div>

      {/* Main Timeline DAW Piano Roll Track Container */}
      <div className="flex-1 flex overflow-hidden min-h-[340px] select-none">
        {/* Vertical Keyboard Sidebar Tracker */}
        <div className="w-16 border-r border-panel-border bg-[#0a0a0a] flex flex-col flex-shrink-0">
          <div className="h-8 border-b border-panel-border flex items-center justify-center font-mono text-[9px] uppercase tracking-widest text-text-s font-bold bg-[#0d0d0d]">
            Pitch
          </div>
          <div className="flex-1 overflow-y-auto pr-0 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            {rollKeys.map((key) => {
              const isBlack = isBlackKey(key);
              return (
                <button
                  key={key}
                  onClick={() => triggerSynthTone(key, 0.4)}
                  className={`w-full h-8 flex items-center justify-center border-b border-panel-border/30 cursor-pointer focus:outline-hidden transition active:bg-gold/15 ${
                    isBlack
                      ? 'bg-[#0e0e0e] text-white/50 hover:bg-[#1a1a1a]'
                      : 'bg-[#181818] text-gold hover:bg-[#202020]'
                  }`}
                >
                  <span className={`font-mono leading-none ${isBlack ? 'text-[9px] text-zinc-600' : 'text-[10px]'}`}>
                    {getNoteName(key)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable grid sequence tracks panel */}
        <div className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden relative bg-[#060606]">
          {/* Timeline Grid Header (Beats ticker) */}
          <div className="h-8 border-b border-panel-border flex flex-shrink-0 items-center relative bg-[#0a0a0a] z-10">
            {beatsHeader.map((beat) => (
              <div
                key={beat}
                className="h-full border-r border-[#151515] font-mono text-[10px] text-text-s flex items-end pb-1.5 pl-2 select-none shrink-0"
                style={{ width: '64px', minWidth: '64px' }}
              >
                <span>Bar {beat + 1}</span>
              </div>
            ))}

            {/* Vertical Moving Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gold z-30 pointer-events-none origin-center"
              style={{
                left: `${currentBeat * 64}px`,
                transition: isPlaying ? 'none' : 'left 0.1s ease-out'
              }}
            >
              <div className="w-1.5 h-3 -ml-[2px] bg-gold rounded-b-lg border border-gold" />
            </div>
          </div>

          {/* Grid Rows Viewport */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
            <div className="h-full relative select-none">
              {rollKeys.map((pitch, rIdx) => {
                const isBlack = isBlackKey(pitch);
                return (
                  <div
                    key={pitch}
                    className={`h-8 border-b border-[#101010] relative flex ${
                      isBlack ? 'bg-[#090909]' : 'bg-[#040404]'
                    }`}
                  >
                    {beatsHeader.map((beat) => (
                      <div
                        key={beat}
                        className="h-full border-r border-[#151515]/30 flex-shrink-0"
                        style={{ width: '64px' }}
                      />
                    ))}
                  </div>
                );
              })}

              {/* Absolute rendered generated Note Elements Overlay blocks */}
              {notes.map((note) => {
                const rowOffsetIdx = rollKeys.indexOf(note.pitch);
                if (rowOffsetIdx === -1) return null; // clips note triggers out of window

                const xCoord = note.start * 64;   // 64px width per beat
                const yCoord = rowOffsetIdx * 32; // 32px height of line
                const widthCoord = note.duration * 64;

                const isCurrentlyPlaying = isPlaying && (currentBeat >= note.start && currentBeat < note.start + note.duration);

                return (
                  <button
                    key={note.id}
                    onClick={() => triggerSynthTone(note.pitch, note.duration)}
                    className={`absolute h-[25px] mt-[3.5px] rounded-md transition-all duration-150 flex items-center justify-center font-mono text-[9px] shadow-xs px-2 cursor-pointer ${
                      isCurrentlyPlaying
                        ? 'bg-gold text-black border border-gold leading-none font-bold z-40 active:scale-95 scale-102 ring-2 ring-gold-glow'
                        : 'bg-gold/20 hover:bg-gold/30 text-gold hover:text-white border border-gold/45 hover:border-gold/60 font-semibold'
                    }`}
                    style={{
                      left: `${xCoord}px`,
                      width: `${widthCoord}px`,
                      top: `${yCoord}px`,
                    }}
                    title={`Pitch: ${getNoteName(note.pitch)} | Start: beat ${note.start}`}
                  >
                    <span className="truncate">{getNoteName(note.pitch)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
