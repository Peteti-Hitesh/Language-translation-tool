/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ModelParams, TrainingProgress, PreprocessedData } from '../types';
import { PitchRNN } from '../utils/rnn';
import { Cpu, Play, Pause, RotateCcw, Sliders, TrendingDown, Eye } from 'lucide-react';

interface ModelTrainerProps {
  preprocessedData: PreprocessedData | null;
  modelParams: ModelParams;
  onModelParamsChange: (params: ModelParams) => void;
  onModelTrained: (model: PitchRNN) => void;
  trainingProgress: TrainingProgress;
  onTrainingProgressChange: (progress: TrainingProgress) => void;
  activeModel: PitchRNN | null;
}

export default function ModelTrainer({
  preprocessedData,
  modelParams,
  onModelParamsChange,
  onModelTrained,
  trainingProgress,
  onTrainingProgressChange,
  activeModel
}: ModelTrainerProps) {
  const [learningRate, setLearningRate] = useState(modelParams.learningRate);
  const [hiddenSize, setHiddenSize] = useState(modelParams.hiddenSize);
  const [epochs, setEpochs] = useState(modelParams.epochs);
  const [selectedWeightMatrix, setSelectedWeightMatrix] = useState<'Wxh' | 'Whh' | 'Why'>('Wxh');

  const animationRef = useRef<number | null>(null);
  const rnnInstanceRef = useRef<PitchRNN | null>(null);

  // Sync state variables to props when parent parameters change due to presets
  useEffect(() => {
    setLearningRate(modelParams.learningRate);
    setHiddenSize(modelParams.hiddenSize);
    setEpochs(modelParams.epochs);
  }, [modelParams]);

  // Handle building/rebuilding a fresh RNN
  const handleBuildModel = () => {
    if (!preprocessedData) return;

    // Instantiate PitchRNN class
    const rnn = new PitchRNN(preprocessedData.vocab, hiddenSize);
    rnnInstanceRef.current = rnn;
    
    onModelTrained(rnn);

    // Reset progress track
    onTrainingProgressChange({
      currentEpoch: 0,
      totalEpochs: epochs,
      currentLoss: 0,
      lossHistory: [],
      isTraining: false,
    });
  };

  // Re-build standard model automatically if vocab changes
  useEffect(() => {
    if (preprocessedData && !rnnInstanceRef.current) {
      handleBuildModel();
    } else if (preprocessedData && rnnInstanceRef.current) {
      // If the vocabulary matches the underlying model's vocab, reuse, otherwise rebuild
      const currentVocabStr = JSON.stringify(rnnInstanceRef.current.vocab);
      const dataVocabStr = JSON.stringify(preprocessedData.vocab);
      if (currentVocabStr !== dataVocabStr) {
        handleBuildModel();
      }
    }
  }, [preprocessedData]);

  // Main synchronous model trainer step runner
  const runTrainingStep = () => {
    if (!rnnInstanceRef.current || !preprocessedData) return;
    
    const rnn = rnnInstanceRef.current;
    let progress = { ...trainingProgress };

    if (progress.currentEpoch >= epochs) {
      progress.isTraining = false;
      onTrainingProgressChange(progress);
      return;
    }

    // Train heavily in batches of 10 epochs per render step to keep animation fast but responsive
    const speedMultiplier = 10;
    let lastLoss = 0;
    let initialLossAccum = 0;
    
    for (let i = 0; i < speedMultiplier; i++) {
      if (progress.currentEpoch >= epochs) break;
      
      const loss = rnn.trainEpoch(
        preprocessedData.inputSequences,
        preprocessedData.targetPitches,
        learningRate
      );

      progress.currentEpoch += 1;
      lastLoss = parseFloat(loss.toFixed(4));
      initialLossAccum = loss;

      progress.lossHistory.push({
        epoch: progress.currentEpoch,
        loss: lastLoss,
      });
    }

    progress.currentLoss = lastLoss;
    onTrainingProgressChange(progress);
    onModelTrained(rnn); // update stored weights reference

    if (progress.isTraining) {
      animationRef.current = requestAnimationFrame(runTrainingStep);
    }
  };

  const handleStartTraining = () => {
    if (!rnnInstanceRef.current) {
      handleBuildModel();
    }
    
    onTrainingProgressChange({
      ...trainingProgress,
      isTraining: true,
      totalEpochs: epochs,
    });
  };

  const handlePauseTraining = () => {
    onTrainingProgressChange({
      ...trainingProgress,
      isTraining: false,
    });
  };

  const handleResetTraining = () => {
    handleBuildModel();
  };

  // Hook to control requestAnimationFrame based on the isTraining state
  useEffect(() => {
    if (trainingProgress.isTraining) {
      animationRef.current = requestAnimationFrame(runTrainingStep);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [trainingProgress.isTraining, trainingProgress.currentEpoch, epochs, learningRate]);

  // Sync hyperparameter shifts
  const applyParameters = () => {
    onModelParamsChange({
      ...modelParams,
      learningRate,
      hiddenSize,
      epochs,
    });
  };

  // Build SVG Polyline coordinates for the Loss Graph
  const getSvgPathCoordinates = (): string => {
    const history = trainingProgress.lossHistory;
    if (history.length === 0) return '';

    const width = 360;
    const height = 90;
    const padding = 6;
    
    const maxLoss = Math.max(...history.map((h) => h.loss), 1.0);
    const minLoss = 0; // standard lower bound
    const totalSamples = history.length;

    const points = history.map((item, idx) => {
      const x = padding + (idx / (totalSamples - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - ((item.loss - minLoss) / (maxLoss - minLoss || 1)) * (height - 2 * padding);
      return `${x},${y}`;
    });

    return points.join(' ');
  };

  // Render a visual weights magnitude table
  const renderWeightHeatmap = () => {
    const rnn = activeModel || rnnInstanceRef.current;
    if (!rnn) return null;

    let matrix: number[][] = [];
    if (selectedWeightMatrix === 'Wxh') matrix = rnn.Wxh;
    else if (selectedWeightMatrix === 'Whh') matrix = rnn.Whh;
    else if (selectedWeightMatrix === 'Why') matrix = rnn.Why;

    if (matrix.length === 0) return null;

    // Display max 8x12 weights grid to keep UI incredibly tidy
    const displayRows = matrix.slice(0, 8);
    const displayColsCount = Math.min(matrix[0]?.length || 0, 16);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-s font-mono uppercase tracking-widest">
            Weight Synapse Matrix Heatmap:
          </span>
          <div className="flex bg-black/30 p-0.5 rounded-md text-[9px] font-mono border border-panel-border">
            {(['Wxh', 'Whh', 'Why'] as const).map((mat) => (
              <button
                key={mat}
                onClick={() => setSelectedWeightMatrix(mat)}
                className={`px-1.5 py-0.5 rounded-sm font-semibold transition-all cursor-pointer ${
                  selectedWeightMatrix === mat
                    ? 'bg-gold text-black shadow-xs'
                    : 'text-text-s hover:text-text-p'
                }`}
              >
                {mat}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-black/45 p-2.5 rounded-xl border border-panel-border overflow-x-auto select-none">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${displayColsCount}, minmax(0, 1fr))` }}>
            {displayRows.map((row, rIdx) => {
              const columns = row.slice(0, displayColsCount);
              return columns.map((weight, cIdx) => {
                // Normalize weight to a color index. Tanh bounds typically have weights around -1 to +1
                const intensity = Math.min(100, Math.max(0, Math.round((weight + 1) * 50)));
                const colorString = weight >= 0
                  ? `rgba(212, 175, 55, ${weight})`     // Positive weight: Gold/brass glow
                  : `rgba(220, 38, 38, ${Math.abs(weight)})`; // Negative weight: Red glow
                  
                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    title={`Synapse [${rIdx}][${cIdx}]: ${weight.toFixed(5)}`}
                    className="w-full h-3 rounded-2xs border border-[#0a0a0a] transition-colors duration-150"
                    style={{ backgroundColor: colorString }}
                  />
                );
              });
            })}
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-text-s mt-2 pt-2 border-t border-panel-border/50 leading-none">
            <span>Negative Inhibitory (Red)</span>
            <span>Unconnected (black)</span>
            <span>Positive Excitatory (Gold)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-panel rounded-xl border border-panel-border shadow-2xl h-full flex flex-col overflow-hidden">
      {/* Title */}
      <div className="p-4 border-b border-panel-border bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gold/10 text-gold border border-gold/25">
            <Cpu size={18} />
          </div>
          <div>
            <span className="font-serif font-semibold text-gold text-sm tracking-wide">3. Neural Network Trainer</span>
            <p className="text-[11px] text-text-s font-normal">Train a Recurrent Cell in real-time</p>
          </div>
        </div>
      </div>

      <div className="p-4 flex-grow overflow-y-auto space-y-4">
        {/* Parameters Controls */}
        <div className="bg-gold/5 rounded-xl p-3.5 border border-gold/20 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gold tracking-wide uppercase leading-none">
            <Sliders size={12} />
            Structural Hyperparameters
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-text-s block">Learning Rate</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="0.5"
                value={learningRate}
                disabled={trainingProgress.isTraining}
                onChange={(e) => {
                  setLearningRate(parseFloat(e.target.value) || 0.05);
                  applyParameters();
                }}
                className="w-full text-xs font-mono font-bold bg-[#1a1a1a] text-text-p border border-panel-border rounded px-2 py-1 focus:border-gold outline-hidden disabled:bg-black/45 disabled:text-text-s"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-text-s block">Hidden Size</label>
              <select
                value={hiddenSize}
                disabled={trainingProgress.isTraining}
                onChange={(e) => {
                  setHiddenSize(parseInt(e.target.value));
                  applyParameters();
                }}
                className="w-full text-xs font-mono font-bold bg-[#1a1a1a] text-text-p border border-panel-border rounded px-1.5 py-1 focus:border-gold outline-hidden disabled:bg-black/45 disabled:text-text-s cursor-pointer"
              >
                <option value="16">16 (fast)</option>
                <option value="32">32 (medium)</option>
                <option value="48">48 (detailed)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-text-s block">Training Epochs</label>
              <input
                type="number"
                min="10"
                max="2000"
                step="10"
                value={epochs}
                disabled={trainingProgress.isTraining}
                onChange={(e) => {
                  setEpochs(parseInt(e.target.value) || 200);
                  applyParameters();
                }}
                className="w-full text-xs font-mono font-bold bg-[#1a1a1a] text-text-p border border-panel-border rounded px-2 py-1 focus:border-gold outline-hidden disabled:bg-black/45 disabled:text-text-s"
              />
            </div>
          </div>
        </div>

        {/* Playback Controls & Status bar */}
        <div className="flex items-center gap-2">
          {trainingProgress.isTraining ? (
            <button
              onClick={handlePauseTraining}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs py-2 px-4 rounded-xl shadow-xs transition duration-150 cursor-pointer"
            >
              <Pause size={14} className="fill-current text-white" />
              Pause Training
            </button>
          ) : (
            <button
              onClick={handleStartTraining}
              className="flex-1 flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-black font-semibold text-xs py-2 px-4 rounded-xl shadow-md shadow-gold/10 transition duration-150 cursor-pointer disabled:bg-gold/40 disabled:cursor-not-allowed"
              disabled={!preprocessedData}
            >
              <Play size={14} className="fill-current text-black" />
              Start Training
            </button>
          )}

          <button
            onClick={handleResetTraining}
            className="p-2 border border-panel-border text-text-s hover:text-text-p hover:bg-white/5 rounded-xl transition duration-150 cursor-pointer"
            title="Reset Model Weights"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Stats and Real-time ticker */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-white/5 rounded-lg border border-panel-border">
            <span className="text-[9px] text-text-s font-mono block">EPOCH</span>
            <span className="font-bold text-gold font-mono mt-0.5 block leading-none">
              {trainingProgress.currentEpoch} / {epochs}
            </span>
          </div>
          <div className="p-2 bg-white/5 rounded-lg border border-panel-border">
            <span className="text-[9px] text-text-s font-mono block">CROSS ENTROPY</span>
            <span className="font-bold text-gold font-mono mt-0.5 block leading-none">
              {trainingProgress.currentLoss || "0.0000"}
            </span>
          </div>
          <div className="p-2 bg-white/5 rounded-lg border border-panel-border">
            <span className="text-[9px] text-text-s font-mono block">CPU STATE</span>
            <span className={`font-semibold mt-0.5 block leading-none ${trainingProgress.isTraining ? 'text-gold font-bold animate-pulse' : 'text-text-s'}`}>
              ● {trainingProgress.isTraining ? 'TRAINING' : 'IDLE'}
            </span>
          </div>
        </div>

        {/* Dynamic Loss Line Chart */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-text-s font-mono uppercase tracking-widest">
            <span className="flex items-center gap-1">
              <TrendingDown size={11} className="text-text-s" />
              Loss Convergence History:
            </span>
          </div>
          
          <div className="bg-black/30 border border-panel-border rounded-xl p-2.5 h-24 relative flex flex-col justify-end">
            {trainingProgress.lossHistory.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-text-s font-mono italic">
                Loss plot initializes upon training commencement...
              </div>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 360 90" preserveAspectRatio="none">
                {/* Horizontal Guide lines */}
                <line x1="0" y1="10" x2="360" y2="10" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="3" />
                <line x1="0" y1="45" x2="360" y2="45" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="3" />
                <line x1="0" y1="80" x2="360" y2="80" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="3" />

                {/* Plot Path */}
                <polyline
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="2.0"
                  points={getSvgPathCoordinates()}
                />
              </svg>
            )}
          </div>
        </div>

        {/* Display weight matrices maps */}
        {renderWeightHeatmap()}
      </div>
    </div>
  );
}
