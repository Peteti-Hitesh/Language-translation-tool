/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NoteEvent {
  id: string;
  pitch: number;      // MIDI pitch (0-127) e.g. 60 for Middle C
  start: number;      // Start time in beats or seconds
  duration: number;   // Duration in beats or seconds
  velocity: number;   // Velocity (0-127)
}

export interface MidiPreset {
  id: string;
  name: string;
  genre: 'Classical' | 'Jazz' | 'Blues' | 'Custom';
  composer: string;
  notes: NoteEvent[];
}

export interface ModelParams {
  learningRate: number;
  epochs: number;
  hiddenSize: number;
  sequenceLength: number;
  temperature: number;
}

export interface TrainingProgress {
  currentEpoch: number;
  totalEpochs: number;
  currentLoss: number;
  lossHistory: { epoch: number; loss: number }[];
  isTraining: boolean;
}

export interface PreprocessedData {
  vocab: number[];          // Unique midi pitches in dataset
  pitchToIdx: Record<number, number>;
  idxToPitch: Record<number, number>;
  inputSequences: number[][]; // X sequences containing vocabulary indices
  targetPitches: number[];    // Y outputs containing vocabulary indices
}

export interface SynthConfig {
  type: 'sine' | 'triangle' | 'square' | 'sawtooth';
  volume: number;           // 0 to 1
  attack: number;           // seconds
  decay: number;            // seconds
  sustain: number;          // 0 to 1
  release: number;          // seconds
  filterCutoff: number;     // Hz
}
