/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { NoteEvent, MidiPreset } from '../types';
import { MIDI_PRESETS, getNoteName, parseMidiBuffer, isBlackKey } from '../utils/midi';
import { Music, Upload, Circle, Square, Check, Trash2, Keyboard, Plus } from 'lucide-react';

interface MidiCollectorProps {
  onMidiSelected: (notes: NoteEvent[], sourceName: string) => void;
  selectedNotes: NoteEvent[];
  sourceName: string;
}

export default function MidiCollector({ onMidiSelected, selectedNotes, sourceName }: MidiCollectorProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'keyboard' | 'upload'>('presets');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<NoteEvent[]>([]);
  const [recordingStart, setRecordingStart] = useState<number | null>(null);
  const [lastNoteStart, setLastNoteStart] = useState<number>(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Audio synthesis for live keyboard typing
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio context on user interactions
  const getAudioContext = (): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Sound generator for keyboard clicks
  const playLiveTone = (pitch: number) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const frequency = 440 * Math.pow(2, (pitch - 69) / 12);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      // Envelope
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio failure:", e);
    }
  };

  // Recording triggers
  const startRecording = () => {
    setRecordedNotes([]);
    setRecordingStart(Date.now());
    setLastNoteStart(0);
    setIsRecording(true);
    getAudioContext(); // awake audio context
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordedNotes.length > 0) {
      onMidiSelected(recordedNotes, "Live Piano Performance");
    }
  };

  const addRecordedNote = (pitch: number) => {
    playLiveTone(pitch);
    
    if (!isRecording || recordingStart === null) return;
    
    // Calculate timestamp relative to recording start in terms of beats (1 beat = 0.5 second roughly)
    const elapsedSeconds = (Date.now() - recordingStart) / 1000;
    const beatStart = parseFloat((elapsedSeconds * 2.0).toFixed(2)); // scale to nice increments
    
    const newNote: NoteEvent = {
      id: `live-${Date.now()}-${pitch}`,
      pitch,
      start: beatStart,
      duration: 0.5, // default step duration
      velocity: 100,
    };

    setRecordedNotes(prev => [...prev, newNote]);
  };

  // Keyboard layout range from MIDI 57 (A3) to 77 (F5)
  const pianoKeys = Array.from({ length: 21 }, (_, i) => 57 + i);

  // Keyboard listener mappings (row mapping to virtual pitch keys)
  const keyBindings: Record<string, number> = {
    'a': 60, // C4
    'w': 61, // C#4
    's': 62, // D4
    'e': 63, // D#4
    'd': 64, // E4
    'f': 65, // F4
    't': 66, // F#4
    'g': 67, // G4
    'y': 68, // G#4
    'h': 69, // A4
    'u': 70, // A#4
    'j': 71, // B4
    'k': 72, // C5
    'o': 73, // C#5
    'l': 74, // D5
    'p': 75, // D#5
    ';': 76,  // E5
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (activeTab !== 'keyboard') return;
      const pitch = keyBindings[e.key.toLowerCase()];
      if (pitch) {
        addRecordedNote(pitch);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, activeTab, recordingStart, recordedNotes]);

  // Handle standard MIDI drag-and-drop uploads
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processMidiFileBytes = async (file: File) => {
    setUploadError(null);
    try {
      const buffer = await file.arrayBuffer();
      const notes = parseMidiBuffer(buffer);
      onMidiSelected(notes, file.name);
    } catch (e: any) {
      setUploadError(e.message || "Failed to decode MIDI binary payload.");
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processMidiFileBytes(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processMidiFileBytes(e.target.files[0]);
    }
  };

  return (
    <div className="bg-panel rounded-xl border border-panel-border shadow-2xl h-full flex flex-col overflow-hidden">
      {/* Module Title */}
      <div className="p-4 border-b border-panel-border bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gold/10 text-gold border border-gold/25">
            <Music size={18} />
          </div>
          <div>
            <span className="font-serif font-semibold text-gold text-sm tracking-wide">1. MIDI Music Collector</span>
            <p className="text-[11px] text-text-s font-normal">Train your recurrent network on real notes</p>
          </div>
        </div>
        <div className="text-[11px] font-mono bg-gold/10 text-gold px-2.5 py-1 rounded-full border border-gold/20">
          Source: {sourceName}
        </div>
      </div>

      {/* Mode Selectors */}
      <div className="grid grid-cols-3 border-b border-panel-border bg-black/20 text-center text-xs">
        <button
          onClick={() => setActiveTab('presets')}
          className={`py-2.5 font-medium transition-colors cursor-pointer ${
            activeTab === 'presets'
              ? 'border-b-2 border-gold text-gold font-semibold bg-white/5'
              : 'text-text-s hover:text-text-p'
          }`}
        >
          Music Presets
        </button>
        <button
          onClick={() => setActiveTab('keyboard')}
          className={`py-2.5 font-medium transition-colors cursor-pointer ${
            activeTab === 'keyboard'
              ? 'border-b-2 border-gold text-gold font-semibold bg-white/5'
              : 'text-text-s hover:text-text-p'
          }`}
        >
          Piano Recorder
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`py-2.5 font-medium transition-colors cursor-pointer ${
            activeTab === 'upload'
              ? 'border-b-2 border-gold text-gold font-semibold bg-white/5'
              : 'text-text-s hover:text-text-p'
          }`}
        >
          Upload MIDI
        </button>
      </div>

      {/* Main Tab Panel */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between select-none">
        {activeTab === 'presets' && (
          <div className="space-y-2 flex-1">
            <div className="text-[11px] text-text-s mb-3">
              Choose an iconic classical melody or jazz scale model to train the AI:
            </div>
            {MIDI_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onMidiSelected(preset.notes, preset.name)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between cursor-pointer ${
                  sourceName === preset.name
                    ? 'border-gold bg-gold/5 text-gold shadow-sm shadow-gold-glow'
                    : 'border-panel-border bg-black/10 hover:border-gold/30 hover:bg-black/20'
                }`}
              >
                <div className="space-y-1">
                  <div className="font-semibold text-text-p">{preset.name}</div>
                  <div className="text-[11px] text-text-s flex items-center gap-1.5 font-normal">
                    <span>{preset.composer}</span>
                    <span className="text-white/10">•</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-panel-border text-[10px] text-text-p font-medium">{preset.genre}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-text-s bg-white/5 px-2 py-0.5 rounded-md border border-panel-border">
                    {preset.notes.length} notes
                  </span>
                  {sourceName === preset.name && (
                    <div className="p-1 rounded-full bg-gold text-black shadow-sm">
                      <Check size={12} className="stroke-[3]" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'keyboard' && (
          <div className="flex flex-col h-full flex-grow justify-between">
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-s animate-pulse">Record a custom note sequence:</span>
                <span className="text-[11px] font-mono text-text-s font-normal">Keybinds: A to L on computer key row</span>
              </div>
              
              <div className="flex items-center justify-between bg-black/30 border border-panel-border gap-1 p-2 rounded-lg">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 bg-red-950/60 text-red-400 border border-red-900/55 font-medium hover:bg-red-900/40 active:scale-95 duration-100 text-xs px-3 py-1.5 rounded-md shadow-xs cursor-pointer"
                  >
                    <Circle size={14} className="fill-current animate-pulse text-red-500" />
                    Record Notes
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 bg-gold text-black font-semibold hover:bg-gold/95 active:scale-95 duration-100 text-xs px-3 py-1.5 rounded-md cursor-pointer shadow-md shadow-gold/10"
                  >
                    <Square size={14} className="fill-current text-black" />
                    Finish & Save ({recordedNotes.length} Rec)
                  </button>
                )}
                
                <div className="text-[11px] font-mono text-text-s">
                  {recordedNotes.length > 0 ? (
                    <button
                      onClick={() => {
                        setRecordedNotes([]);
                        stopRecording();
                      }}
                      className="text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  ) : (
                    "Ready to record..."
                  )}
                </div>
              </div>
            </div>

            {/* Simulated interactive Piano roll */}
            <div className="flex justify-center flex-grow my-3 bg-black/45 rounded-xl p-3 border border-panel-border relative items-end h-32 overflow-x-auto">
              <div className="flex relative">
                {pianoKeys.map((key) => {
                  const isBlack = isBlackKey(key);
                  const isC = key % 12 === 0;
                  return (
                    <button
                      key={key}
                      onClick={() => addRecordedNote(key)}
                      className={`relative flex-shrink-0 select-none group focus:outline-none transition-transform duration-100 active:scale-95 cursor-pointer ${
                        isBlack
                          ? 'w-6 h-20 -mx-3 bg-[#0d0d0d] hover:bg-[#1a1a1a] text-white z-10 border border-t-0 border-[#050505] rounded-b-sm shadow-md'
                          : 'w-9 h-32 bg-[#1e1e1e] hover:bg-[#252525] text-text-p z-0 border border-[#141414] rounded-b-md shadow-sm'
                      }`}
                    >
                      {/* Note labels on white C notes */}
                      {!isBlack && (
                        <span className={`absolute bottom-1.5 w-full text-center font-mono text-[9px] pointer-events-none select-none font-medium leading-none ${isC ? 'text-gold font-semibold' : 'text-text-s'}`}>
                          {getNoteName(key)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="flex bg-black/10 p-2 rounded-xl border border-panel-border/30 flex-col justify-center">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                dragActive
                  ? 'border-gold bg-gold/5'
                  : 'border-panel-border bg-black/20 hover:bg-black/30'
              }`}
            >
              <input
                id="file-upload"
                type="file"
                accept=".mid,.midi"
                className="hidden"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" className="cursor-pointer w-full flex flex-col items-center justify-center">
                <div className="p-3 rounded-full bg-white/5 border border-panel-border text-gold shadow-xs mb-3">
                  <Upload size={22} className="text-gold" />
                </div>
                <p className="text-xs font-semibold text-text-p">Drag & drop your MIDI file here</p>
                <p className="text-[11px] text-text-s mt-1">Accepts standard .mid or .midi single-track files</p>
                <span className="mt-4 inline-flex items-center gap-1 bg-gold/10 border border-gold/30 text-gold px-3 py-1.5 rounded-lg text-[11px] font-medium shadow-xs hover:bg-gold/15">
                  <Plus size={12} /> Browse Local Drive
                </span>
              </label>
            </div>

            {uploadError && (
              <div className="mt-3 p-3 text-red-200 bg-red-950/40 text-[11px] font-normal rounded-lg border border-red-900/50">
                ⚠️ Error: {uploadError}
              </div>
            )}
          </div>
        )}

        {/* Selected Sequence visual list summary */}
        <div className="mt-4 pt-3 border-t border-panel-border flex flex-col gap-2">
          <span className="text-[10px] text-text-s font-mono uppercase tracking-widest">Preloaded Melody Buffer:</span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {selectedNotes.map((note, index) => (
              <div
                key={note.id || index}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#161616] hover:bg-gold/10 hover:text-gold transition duration-100 border border-panel-border text-[10px] text-text-p font-mono tracking-tight"
              >
                <span className="font-semibold text-gold">{getNoteName(note.pitch)}</span>
                <span className="text-white/10 text-[9px]">|</span>
                <span>t={note.start}b</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
