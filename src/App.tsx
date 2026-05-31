/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NoteEvent, ModelParams, TrainingProgress, PreprocessedData } from './types';
import { MIDI_PRESETS } from './utils/midi';
import { preprocessMelody, PitchRNN } from './utils/rnn';
import MidiCollector from './components/MidiCollector';
import MidiPreprocessor from './components/MidiPreprocessor';
import ModelTrainer from './components/ModelTrainer';
import MusicGenerator from './components/MusicGenerator';
import PianoRollSynth from './components/PianoRollSynth';
import { Sparkles, Music2, Brain, FileMusic, HelpCircle, ArrowRight } from 'lucide-react';

export default function App() {
  // 1. Core States
  const [selectedNotes, setSelectedNotes] = useState<NoteEvent[]>(MIDI_PRESETS[0].notes);
  const [sourceName, setSourceName] = useState<string>(MIDI_PRESETS[0].name);
  const [sequenceLength, setSequenceLength] = useState<number>(4);
  const [preprocessedData, setPreprocessedData] = useState<PreprocessedData | null>(null);

  // 2. Training Hyperparameters
  const [modelParams, setModelParams] = useState<ModelParams>({
    learningRate: 0.12,
    epochs: 300,
    hiddenSize: 32,
    sequenceLength: 4,
    temperature: 0.75,
  });

  // 3. active RNN models & Progress tickers
  const [activeModel, setActiveModel] = useState<PitchRNN | null>(null);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress>({
    currentEpoch: 0,
    totalEpochs: 300,
    currentLoss: 0,
    lossHistory: [],
    isTraining: false,
  });

  // 4. Generated Sequencer states
  const [timelineNotes, setTimelineNotes] = useState<NoteEvent[]>(MIDI_PRESETS[0].notes);

  // Re-run preprocessing whenever loaded MIDI notes or sequence context window parameter shifts
  useEffect(() => {
    if (selectedNotes.length > 0) {
      try {
        const data = preprocessMelody(selectedNotes, sequenceLength);
        setPreprocessedData(data);
        
        // When preset/song changes, reset the active timeline sequencer showing the selected notes directly
        // That way, users can play the raw song immediately before training/running AI generations!
        setTimelineNotes(selectedNotes);
        
        // Clear active model to prevent vocabulary dimension cross-mismatches
        setActiveModel(null);
        setTrainingProgress({
          currentEpoch: 0,
          totalEpochs: modelParams.epochs,
          currentLoss: 0,
          lossHistory: [],
          isTraining: false,
        });
      } catch (err) {
        console.warn("Preprocessing failure on note count shifts:", err);
      }
    }
  }, [selectedNotes, sequenceLength]);

  const handleMidiSelection = (notes: NoteEvent[], source: string) => {
    setSelectedNotes(notes);
    setSourceName(source);
  };

  const handleNotesGenerated = (aiNotes: NoteEvent[]) => {
    setTimelineNotes(aiNotes);
  };

  const handleModelParamsChange = (newParams: ModelParams) => {
    setModelParams(newParams);
    if (newParams.sequenceLength !== sequenceLength) {
      setSequenceLength(newParams.sequenceLength);
    }
  };

  return (
    <div className="min-h-screen bg-sophisticated text-text-p font-sans selection:bg-gold/20 flex flex-col antialiased">
      {/* Visual Application Page Header */}
      <header className="bg-black/40 backdrop-blur-lg border-b border-panel-border py-3.5 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gold text-black rounded-xl shadow-md shadow-gold/10">
            <Brain size={20} className="fill-current" />
          </div>
          <div>
            <h1 className="text-base font-serif font-bold text-gold tracking-widest uppercase">AI Music Generator</h1>
            <p className="text-[10px] text-text-s font-mono mt-1 leading-none uppercase tracking-widest">
              Recurrent Neural Sequence Composer Station
            </p>
          </div>
        </div>

        {/* Informative system badges */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-gold/35 text-gold text-[11px] font-mono leading-none shadow-sm shadow-gold-glow">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-ping" />
            <span>Neural: SGD Adagrad Optimizer</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-panel-border text-text-p text-[11px] font-mono leading-none">
            <span>Audio: Web Audio API Synthesizer</span>
          </div>
        </div>
      </header>

      {/* Main Responsive Grid Panel Layout */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Core Educational Guide Banner */}
        <div className="bg-panel/40 backdrop-blur-md border border-panel-border rounded-2xl p-4 flex gap-3 text-text-p text-xs shadow-xl">
          <div className="p-2 rounded-xl bg-gold/10 text-gold border border-gold/20 hidden sm:block">
            <Sparkles size={16} />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif font-semibold text-gold text-sm tracking-wide flex items-center gap-1.5">Compose Music Using Recurrent Networks (LSTMs)</h2>
            <p className="text-text-s leading-normal font-normal">
              This client-side workspace lets you explore deep learning step-by-step:
              1. Choose a built-in classical MIDI preset or record custom piano notes,
              2. Inspect how the parser slices the stream into a pitch-index dataset,
              3. Compile and watch backpropagation-through-time adjust synaptic weights live,
              4. Apply entropy temperature scales to sample completely new sequences and synthesise the outputs.
            </p>
          </div>
        </div>

        {/* Bento Grid Top Container splits */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Section 1: MIDI Collection */}
          <div className="lg:col-span-4 h-full">
            <MidiCollector
              onMidiSelected={handleMidiSelection}
              selectedNotes={selectedNotes}
              sourceName={sourceName}
            />
          </div>

          {/* Section 2: Reprocessing */}
          <div className="lg:col-span-4 h-full">
            <MidiPreprocessor
              preprocessedData={preprocessedData}
              sequenceLength={sequenceLength}
              onSequenceLengthChange={setSequenceLength}
              rawNotesCount={selectedNotes.length}
            />
          </div>

          {/* Combining Train & Generate splits */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full justify-between">
            {/* Section 3: Training Station */}
            <div className="flex-1">
              <ModelTrainer
                preprocessedData={preprocessedData}
                modelParams={modelParams}
                onModelParamsChange={handleModelParamsChange}
                onModelTrained={setActiveModel}
                trainingProgress={trainingProgress}
                onTrainingProgressChange={setTrainingProgress}
                activeModel={activeModel}
              />
            </div>

            {/* Section 4: AI Composer */}
            <div>
              <MusicGenerator
                activeModel={activeModel}
                preprocessedData={preprocessedData}
                modelParams={modelParams}
                onModelParamsChange={handleModelParamsChange}
                onNotesGenerated={handleNotesGenerated}
              />
            </div>
          </div>
        </div>

        {/* Full-width Section 5: Real-time Synthesizer Timeline */}
        <div className="w-full">
          <PianoRollSynth
            notes={timelineNotes}
            sourceName={sourceName}
          />
        </div>
      </main>

      {/* Standard brand footer bar */}
      <footer className="bg-black/60 border-t border-panel-border py-4 text-center text-[10px] text-text-s font-mono tracking-widest uppercase shrink-0">
        AI Music Generator • Built in Cloud Environment • Standard MIDI Compliant (smf)
      </footer>
    </div>
  );
}
