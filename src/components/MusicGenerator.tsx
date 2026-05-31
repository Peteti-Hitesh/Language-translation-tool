/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ModelParams, NoteEvent, PreprocessedData } from '../types';
import { PitchRNN } from '../utils/rnn';
import { Sparkles, Sliders, PlayCircle, Info } from 'lucide-react';
import { getNoteName } from '../utils/midi';

interface MusicGeneratorProps {
  activeModel: PitchRNN | null;
  preprocessedData: PreprocessedData | null;
  modelParams: ModelParams;
  onModelParamsChange: (params: ModelParams) => void;
  onNotesGenerated: (notes: NoteEvent[]) => void;
}

export default function MusicGenerator({
  activeModel,
  preprocessedData,
  modelParams,
  onModelParamsChange,
  onNotesGenerated
}: MusicGeneratorProps) {
  const [generationLength, setGenerationLength] = useState<number>(32);
  const [temperature, setTemperature] = useState<number>(modelParams.temperature);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    setTemperature(modelParams.temperature);
  }, [modelParams.temperature]);

  const handleGenerate = () => {
    if (!activeModel || !preprocessedData) return;

    setIsGenerating(true);

    // Timeout allows DOM triggers to complete nicely
    setTimeout(() => {
      try {
        // Choose seed sequence
        // Default seed corresponds to the very first training input sequence
        const seedSeq = preprocessedData.inputSequences[0] || [0];
        
        // Generate index tokens using standard PitchRNN
        const generatedTokens = activeModel.generate(seedSeq, generationLength, temperature);
        
        // Sift the generated tokens back to Pitch values
        const pitches = generatedTokens.map((idx) => preprocessedData.idxToPitch[idx]);
        
        // Assemble NoteEvent sequence with standard increments
        const sequenceNotes: NoteEvent[] = pitches.map((pitch, stepIndex) => {
          // Increment start time by 0.5 beat (approx sixteenth or eighth notes)
          const start = stepIndex * 0.5;
          const duration = 0.45; // slight gap for pleasant keyboard staccato release feel
          return {
            id: `ai-note-${Date.now()}-${stepIndex}-${pitch}`,
            pitch,
            start: parseFloat(start.toFixed(2)),
            duration,
            velocity: 95 + Math.round(Math.random() * 15), // natural swing human velocity fluctuations
          };
        });

        onNotesGenerated(sequenceNotes);
      } catch (e) {
        console.error("AI Music Generation error:", e);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  const handleTempSliderChange = (val: number) => {
    setTemperature(val);
    onModelParamsChange({
      ...modelParams,
      temperature: val,
    });
  };

  // Human qualitative temperature description label
  const getTemperatureLabel = () => {
    if (temperature <= 0.2) return { text: "Strict / Repetitive", color: "text-zinc-400 bg-zinc-950/45 border-zinc-900" };
    if (temperature <= 0.5) return { text: "Structured / Cohesive", color: "text-blue-400 bg-blue-950/45 border-blue-900/40" };
    if (temperature <= 0.85) return { text: "Creative balance", color: "text-gold bg-gold/10 border-gold/25" };
    if (temperature <= 1.2) return { text: "Experimental / Jazzy", color: "text-amber-400 bg-amber-950/45 border-amber-900/40" };
    return { text: "Atonal / Chaos Mode", color: "text-red-400 bg-red-950/45 border-red-900/40" };
  };

  const tempLabel = getTemperatureLabel();

  return (
    <div className="bg-panel rounded-xl border border-panel-border shadow-2xl h-full flex flex-col overflow-hidden">
      {/* Title */}
      <div className="p-4 border-b border-panel-border bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gold/10 text-gold border border-gold/25">
            <Sparkles size={18} />
          </div>
          <div>
            <span className="font-serif font-semibold text-gold text-sm tracking-wide">4. AI Generation Room</span>
            <p className="text-[11px] text-text-s font-normal">Compose melodies using neural probability weights</p>
          </div>
        </div>
      </div>

      <div className="p-4 flex-grow space-y-4">
        {/* Sliders Container */}
        <div className="space-y-3.5">
          {/* Output Melody Length Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-text-p">Output Melody Length</label>
              <span className="font-mono text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/25">
                {generationLength} notes
              </span>
            </div>
            <input
              type="range"
              min={16}
              max={128}
              step={8}
              value={generationLength}
              onChange={(e) => setGenerationLength(parseInt(e.target.value))}
              className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-gold"
            />
          </div>

          {/* Temperature/Creativity Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-text-p flex items-center gap-1">
                Melody Seed Temperature (Entropy)
              </label>
              <span className="font-mono text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/25">
                T={temperature.toFixed(2)}
              </span>
            </div>
            
            <input
              type="range"
              min={0.1}
              max={1.6}
              step={0.05}
              value={temperature}
              onChange={(e) => handleTempSliderChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-gold"
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-s">Low Entropy (strict)</span>
              <span className={`text-[10px] px-2 py-0.5 border rounded-full font-medium ${tempLabel.color}`}>
                {tempLabel.text}
              </span>
              <span className="text-[10px] text-text-s">High Entropy (unstable)</span>
            </div>
          </div>
        </div>

        {/* Generate Primary CTA Button */}
        <button
          onClick={handleGenerate}
          disabled={!activeModel || isGenerating}
          className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs shadow-md transition duration-150 border cursor-pointer ${
            activeModel
              ? 'bg-gold hover:bg-gold/90 text-black border-gold shadow-gold/10 active:scale-98'
              : 'bg-black/30 border-panel-border text-text-s/70 cursor-not-allowed'
          }`}
        >
          <Sparkles size={14} className={`${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? "AI is solving synapses..." : "Generate AI Note Stream"}
        </button>

        {/* Informative panel based on model setup state */}
        {!activeModel ? (
          <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl flex gap-2 text-[11px] text-red-200 leading-normal">
            <Info size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span>
              Build and train your model weights first in Step 3 before attempting automatic note prediction sequences.
            </span>
          </div>
        ) : (
          <div className="p-3 bg-gold/5 border border-gold/20 rounded-xl flex gap-2 text-[11px] text-text-p leading-normal font-normal">
            <Info size={16} className="text-gold shrink-0 mt-0.5" />
            <span>
              <strong className="text-gold">Generative Process:</strong> Recurrent predictions feed back to the input vector sequence. Selecting balanced temperatures avoids repetitive micro-loops.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
