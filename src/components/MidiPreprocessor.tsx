/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NoteEvent, PreprocessedData } from '../types';
import { getNoteName } from '../utils/midi';
import { Layers, HelpCircle, ArrowRight } from 'lucide-react';

interface MidiPreprocessorProps {
  preprocessedData: PreprocessedData | null;
  sequenceLength: number;
  onSequenceLengthChange: (length: number) => void;
  rawNotesCount: number;
}

export default function MidiPreprocessor({
  preprocessedData,
  sequenceLength,
  onSequenceLengthChange,
  rawNotesCount
}: MidiPreprocessorProps) {
  if (!preprocessedData) {
    return (
      <div className="bg-panel rounded-xl border border-panel-border p-8 flex flex-col items-center justify-center text-center">
        <Layers size={36} className="text-gold/40 mb-3 animate-pulse" />
        <span className="font-serif font-semibold text-gold text-sm tracking-wide">Waiting for MIDI Data</span>
        <p className="text-xs text-text-s mt-1 max-w-xs">Select or record a MIDI melody sequence to initialize the preprocessing track stream.</p>
      </div>
    );
  }

  // Display only first few training sliding window frames to keep layout clean
  const previewSamples = preprocessedData.inputSequences.slice(0, 5);

  return (
    <div className="bg-panel rounded-xl border border-panel-border shadow-2xl h-full flex flex-col overflow-hidden">
      {/* Title */}
      <div className="p-4 border-b border-panel-border bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gold/10 text-gold border border-gold/25">
            <Layers size={18} />
          </div>
          <div>
            <span className="font-serif font-semibold text-gold text-sm tracking-wide">2. Data Preprocessing Pipeline</span>
            <p className="text-[11px] text-text-s font-normal">Translate musical files into mathematical tokens</p>
          </div>
        </div>
      </div>

      <div className="p-4 flex-grow overflow-y-auto space-y-4">
        {/* Sequence Length Control */}
        <div className="bg-gold/5 rounded-xl p-3 border border-gold/20 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-gold flex items-center gap-1.5">
              Sequence Length (Context Window)
              <div className="relative group cursor-help text-gold">
                <HelpCircle size={12} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black text-text-p border border-panel-border text-[10px] p-2 rounded shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-150 z-20 font-normal leading-normal">
                  How many consecutive notes the recurrent network reviews to predict the next note.
                </div>
              </div>
            </label>
            <span className="text-xs font-mono font-bold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/25">
              {sequenceLength} notes
            </span>
          </div>
          
          <input
            type="range"
            min={1}
            max={Math.min(12, Math.max(2, rawNotesCount - 2))}
            value={sequenceLength}
            onChange={(e) => onSequenceLengthChange(parseInt(e.target.value))}
            className="w-full accent-gold cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gold/80 font-medium">
            <span>More Creative (Short Context)</span>
            <span>More Coherent (Long Context)</span>
          </div>
        </div>

        {/* Vocabulary Metrics bar */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-3 border border-panel-border bg-black/20 rounded-xl">
            <span className="text-[10px] text-text-s font-mono block uppercase">Melody Vocab Size</span>
            <span className="text-lg font-bold text-gold leading-tight block mt-1">
              {preprocessedData.vocab.length}
            </span>
            <span className="text-[10px] text-text-s font-normal mt-0.5 block">Unique midi keys</span>
          </div>
          <div className="p-3 border border-panel-border bg-black/20 rounded-xl">
            <span className="text-[10px] text-text-s font-mono block uppercase">Generated Pairs</span>
            <span className="text-lg font-bold text-gold leading-tight block mt-1">
              {preprocessedData.inputSequences.length}
            </span>
            <span className="text-[10px] text-text-s font-normal mt-0.5 block">Total training samples</span>
          </div>
        </div>

        {/* Vocabulary Pitch grid mapping */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-text-s font-mono uppercase tracking-widest">Pitch Vocabulary Mapping:</span>
          <div className="flex flex-wrap gap-1 bg-black/20 p-2.5 rounded-lg border border-panel-border">
            {preprocessedData.vocab.map((pitch, idx) => (
              <div
                key={pitch}
                className="inline-flex flex-col items-center bg-[#1a1a1a] border border-panel-border hover:border-gold px-2 py-1 rounded transition duration-150 text-center"
              >
                <span className="text-[10px] text-gold font-bold font-mono">
                  {getNoteName(pitch)}
                </span>
                <span className="text-[9px] text-text-s font-normal font-mono border-t border-panel-border/40 mt-0.5 pt-0.5 w-full">
                  ID: {idx}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sliding Note Index Sequence */}
        <div className="space-y-2">
          <span className="text-[10px] text-text-s font-mono uppercase tracking-widest">
            Sliding Sequence Output Sample (X → Y):
          </span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {previewSamples.map((seq, sIdx) => {
              const targetIdx = preprocessedData.targetPitches[sIdx];
              const targetPitch = preprocessedData.idxToPitch[targetIdx];
              return (
                <div
                  key={sIdx}
                  className="flex items-center justify-between p-2 rounded-lg bg-black/15 border border-panel-border text-[11px] font-mono hover:bg-gold/5 hover:border-gold/30 transition duration-100"
                >
                  <div className="flex items-center gap-1 overflow-x-auto max-w-[70%]">
                    <span className="text-text-s text-[10px] mr-1">X={sIdx}:</span>
                    {seq.map((idx, nIdx) => (
                      <React.Fragment key={nIdx}>
                        {nIdx > 0 && <span className="text-white/20">,</span>}
                        <span className="bg-panel border border-panel-border text-gold px-1.5 py-0.5 rounded font-bold font-mono shadow-3xs">
                          {getNoteName(preprocessedData.idxToPitch[idx])}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-gold">
                    <ArrowRight size={12} className="text-text-s" />
                    <span className="text-text-s text-[10px]">predict:</span>
                    <span className="bg-gold border border-gold text-black px-2 py-0.5 rounded font-bold text-xs leading-none">
                      {getNoteName(targetPitch)}
                    </span>
                  </div>
                </div>
              );
            })}
            {preprocessedData.inputSequences.length > 5 && (
              <div className="text-[10px] text-text-s text-center italic py-1">
                ... + {preprocessedData.inputSequences.length - 5} remaining pairs structured for feeding the recurrent cell ...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
