/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PreprocessedData, NoteEvent } from '../types';

/**
 * Mathematically complete Recurrent Neural Network (RNN) with single recurrent hidden layer 
 * designed for real-time sequence prediction and training directly in-browser.
 */
export class PitchRNN {
  // Vocabulary mapping
  public vocab: number[] = [];
  public pitchToIdx: Record<number, number> = {};
  public idxToPitch: Record<number, number> = {};
  public vocabSize: number = 0;
  public hiddenSize: number = 32;

  // Model weights
  public Wxh: number[][] = []; // Input to Hidden: [hiddenSize][vocabSize]
  public Whh: number[][] = []; // Hidden to Hidden: [hiddenSize][hiddenSize]
  public Why: number[][] = []; // Hidden to Output: [vocabSize][hiddenSize]
  public bh: number[] = [];    // Hidden Bias: [hiddenSize]
  public by: number[] = [];    // Output Bias: [vocabSize]

  // Adagrad running squared gradients cache for optimizer stability
  private mWxh: number[][] = [];
  private mWhh: number[][] = [];
  private mWhy: number[][] = [];
  private mbh: number[] = [];
  private mby: number[] = [];

  constructor(vocab: number[], hiddenSize: number = 32) {
    this.vocab = [...vocab].sort((a, b) => a - b);
    this.vocabSize = this.vocab.length;
    this.hiddenSize = hiddenSize;

    // Create dual-directional vocabulary maps
    this.vocab.forEach((pitch, i) => {
      this.pitchToIdx[pitch] = i;
      this.idxToPitch[i] = pitch;
    });

    this.initializeWeights();
  }

  /**
   * Initializes matrices with Xavier normal / uniform scaling
   */
  private initializeWeights(): void {
    const scaleIn = Math.sqrt(1 / this.vocabSize);
    const scaleRec = Math.sqrt(1 / this.hiddenSize);
    const scaleOut = Math.sqrt(1 / this.hiddenSize);

    // Initialize Weight Matrices with random Gaussian approximation distribution
    this.Wxh = Array.from({ length: this.hiddenSize }, () =>
      Array.from({ length: this.vocabSize }, () => (Math.random() * 2 - 1) * scaleIn)
    );

    this.Whh = Array.from({ length: this.hiddenSize }, () =>
      Array.from({ length: this.hiddenSize }, () => (Math.random() * 2 - 1) * scaleRec)
    );

    this.Why = Array.from({ length: this.vocabSize }, () =>
      Array.from({ length: this.hiddenSize }, () => (Math.random() * 2 - 1) * scaleOut)
    );

    this.bh = Array.from({ length: this.hiddenSize }, () => 0);
    this.by = Array.from({ length: this.vocabSize }, () => 0);

    // Initialize Adagrad memory caches to 0
    this.mWxh = Array.from({ length: this.hiddenSize }, () => Array(this.vocabSize).fill(1e-8));
    this.mWhh = Array.from({ length: this.hiddenSize }, () => Array(this.hiddenSize).fill(1e-8));
    this.mWhy = Array.from({ length: this.vocabSize }, () => Array(this.hiddenSize).fill(1e-8));
    this.mbh = Array(this.hiddenSize).fill(1e-8);
    this.mby = Array(this.vocabSize).fill(1e-8);
  }

  /**
   * Softmax normalizer function
   */
  private softmax(logits: number[]): number[] {
    const maxLogit = Math.max(...logits);
    const exps = logits.map((x) => Math.exp(x - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / (sumExps || 1));
  }

  /**
   * Performs forward propagation and returns predictions, intermediate hidden states, and inputs
   */
  public forward(inputs: number[]): {
    p: number[][]; // probabilities per sequence position
    h: number[][]; // hidden states (including initial t=-1)
    x: number[][]; // one-hot encoded inputs
  } {
    const seqLen = inputs.length;
    const h: number[][] = Array.from({ length: seqLen + 1 }, () => Array(this.hiddenSize).fill(0));
    const x: number[][] = Array.from({ length: seqLen }, () => Array(this.vocabSize).fill(0));
    const p: number[][] = [];

    // Loop through music sequence timestamps
    for (let t = 0; t < seqLen; t++) {
      const charIdx = inputs[t];
      x[t][charIdx] = 1; // standard one-hot encoding

      // Compute h[t] = tanh(Wxh * x[t] + Whh * h[t-1] + bh)
      const h_curr = Array(this.hiddenSize).fill(0);
      for (let i = 0; i < this.hiddenSize; i++) {
        let sum = this.bh[i];
        
        // Input multiply
        for (let j = 0; j < this.vocabSize; j++) {
          sum += this.Wxh[i][j] * x[t][j];
        }
        // Recurrent multiply
        for (let j = 0; j < this.hiddenSize; j++) {
          sum += this.Whh[i][j] * h[t][j]; // uses previous state
        }
        
        h_curr[i] = Math.tanh(sum);
      }
      h[t + 1] = h_curr;

      // Compute Output Logit & Softmax: y = Why * h[t] + by
      const y_curr = Array(this.vocabSize).fill(0);
      for (let i = 0; i < this.vocabSize; i++) {
        let sum = this.by[i];
        for (let j = 0; j < this.hiddenSize; j++) {
          sum += this.Why[i][j] * h_curr[j];
        }
        y_curr[i] = sum;
      }
      p.push(this.softmax(y_curr));
    }

    return { p, h, x };
  }

  /**
   * Performs Backpropagation-Through-Time (BPTT) for a single input/target training pair
   */
  public backward(
    inputs: number[],
    targets: number[],
    h_states: number[][],
    one_hot_inputs: number[][],
    probs: number[][]
  ): {
    dWxh: number[][];
    dWhh: number[][];
    dWhy: number[][];
    dbh: number[];
    dby: number[];
  } {
    const seqLen = inputs.length;
    
    // Initialize gradient variables
    const dWxh = Array.from({ length: this.hiddenSize }, () => Array(this.vocabSize).fill(0));
    const dWhh = Array.from({ length: this.hiddenSize }, () => Array(this.hiddenSize).fill(0));
    const dWhy = Array.from({ length: this.vocabSize }, () => Array(this.hiddenSize).fill(0));
    const dbh = Array(this.hiddenSize).fill(0);
    const dby = Array(this.vocabSize).fill(0);

    const dhnext = Array(this.hiddenSize).fill(0); // recurrent error buffer

    // Backprop backward through temporal dimensions
    for (let t = seqLen - 1; t >= 0; t--) {
      // 1. Output error (Cross Entropy gradient with Softmax): d_out = p_t - y_target_t
      const dy = [...probs[t]];
      const targetIdx = targets[t];
      dy[targetIdx] -= 1; // subtract target one-hot label

      // 2. Accumulate output projection gradients
      const h_curr = h_states[t + 1];
      for (let i = 0; i < this.vocabSize; i++) {
        dby[i] += dy[i];
        for (let j = 0; j < this.hiddenSize; j++) {
          dWhy[i][j] += dy[i] * h_curr[j];
        }
      }

      // 3. Backpropagate error to hidden state
      // dh = Why^T * dy + dhnext
      const dh = Array(this.hiddenSize).fill(0);
      for (let j = 0; j < this.hiddenSize; j++) {
        let sum = dhnext[j];
        for (let i = 0; i < this.vocabSize; i++) {
          sum += this.Why[i][j] * dy[i];
        }
        dh[j] = sum;
      }

      // 4. Backprop through Tanh activation function: dtanh = dh * (1 - h^2)
      const dtanh = Array(this.hiddenSize).fill(0);
      for (let j = 0; j < this.hiddenSize; j++) {
        dtanh[j] = dh[j] * (1 - h_curr[j] * h_curr[j]);
      }

      // 5. Accumulate input/recurrent weights & bias gradients
      const h_prev = h_states[t];
      for (let i = 0; i < this.hiddenSize; i++) {
        dbh[i] += dtanh[i];
        
        // Input connections weights
        for (let j = 0; j < this.vocabSize; j++) {
          dWxh[i][j] += dtanh[i] * one_hot_inputs[t][j];
        }
        // Recurrent connections weights
        for (let j = 0; j < this.hiddenSize; j++) {
          dWhh[i][j] += dtanh[i] * h_prev[j];
        }
      }

      // 6. Pass gradient backward to previous step: dhnext = Whh^T * dtanh
      for (let j = 0; j < this.hiddenSize; j++) {
        let sum = 0;
        for (let i = 0; i < this.hiddenSize; i++) {
          sum += this.Whh[i][j] * dtanh[i];
        }
        dhnext[j] = sum;
      }
    }

    return { dWxh, dWhh, dWhy, dbh, dby };
  }

  /**
   * Clips gradients in-place to avoid exploding gradients in recurrent structures
   */
  private clipGradients(grads: {
    dWxh: number[][];
    dWhh: number[][];
    dWhy: number[][];
    dbh: number[];
    dby: number[];
  }, maxNorm: number = 5.0): void {
    let sumSq = 0;
    
    // Sum squares of all weights
    const checkMatrices = [grads.dWxh, grads.dWhh, grads.dWhy];
    checkMatrices.forEach((mat) => {
      for (let i = 0; i < mat.length; i++) {
        for (let j = 0; j < mat[i].length; j++) {
          sumSq += mat[i][j] * mat[i][j];
        }
      }
    });

    const checkVectors = [grads.dbh, grads.dby];
    checkVectors.forEach((vec) => {
      for (let i = 0; i < vec.length; i++) {
        sumSq += vec[i] * vec[i];
      }
    });

    const norm = Math.sqrt(sumSq);
    if (norm > maxNorm) {
      const scale = maxNorm / norm;
      
      checkMatrices.forEach((mat) => {
        for (let i = 0; i < mat.length; i++) {
          for (let j = 0; j < mat[i].length; j++) {
            mat[i][j] *= scale;
          }
        }
      });

      checkVectors.forEach((vec) => {
        for (let i = 0; i < vec.length; i++) {
          vec[i] *= scale;
        }
      });
    }
  }

  /**
   * Runs one training epoch on multiple sequence samples using Adagrad
   */
  public trainEpoch(
    inputSequences: number[][],
    targetPitches: number[],
    lr: number = 0.1
  ): number {
    let totalLoss = 0;
    let counts = 0;

    for (let k = 0; k < inputSequences.length; k++) {
      const inputs = inputSequences[k];
      const target = targetPitches[k];
      
      // We set targets array for seq length, where we predict target at the final position
      // For character prediction standard: inputs = h_0 ... h_L, targets = h_1 ... h_L+1
      // Here, targets is a sequence: we'll create a sliding sequence prediction targets[t] = inputs[t+1]
      // To run standard BPTT sequence prediction:
      const seqTargets = [...inputs.slice(1), target];

      // 1. Forward Pass
      const { p, h, x } = this.forward(inputs);

      // Compute Cross-Entropy Loss for the sequence prediction
      let sampleLoss = 0;
      for (let t = 0; t < inputs.length; t++) {
        const p_t = p[t][seqTargets[t]];
        sampleLoss += -Math.log(Math.max(p_t, 1e-12));
      }
      totalLoss += sampleLoss / inputs.length;
      counts++;

      // 2. Backward Pass
      const grads = this.backward(inputs, seqTargets, h, x, p);

      // 3. Gradient Clip
      this.clipGradients(grads, 5.0);

      // 4. Update parameters using stable Adagrad optimizer
      this.applyGradients(grads, lr);
    }

    return totalLoss / (counts || 1);
  }

  /**
   * Updates weights based on computed gradients with Adagrad caching
   */
  private applyGradients(
    grads: {
      dWxh: number[][];
      dWhh: number[][];
      dWhy: number[][];
      dbh: number[];
      dby: number[];
    },
    lr: number
  ): void {
    const eps = 1e-8;

    // Why update:
    for (let i = 0; i < this.vocabSize; i++) {
      this.mby[i] += grads.dby[i] * grads.dby[i];
      this.by[i] -= (lr / Math.sqrt(this.mby[i] + eps)) * grads.dby[i];
      for (let j = 0; j < this.hiddenSize; j++) {
        this.mWhy[i][j] += grads.dWhy[i][j] * grads.dWhy[i][j];
        this.Why[i][j] -= (lr / Math.sqrt(this.mWhy[i][j] + eps)) * grads.dWhy[i][j];
      }
    }

    // Wxh & bh & Whh updates:
    for (let i = 0; i < this.hiddenSize; i++) {
      this.mbh[i] += grads.dbh[i] * grads.dbh[i];
      this.bh[i] -= (lr / Math.sqrt(this.mbh[i] + eps)) * grads.dbh[i];

      for (let j = 0; j < this.vocabSize; j++) {
        this.mWxh[i][j] += grads.dWxh[i][j] * grads.dWxh[i][j];
        this.Wxh[i][j] -= (lr / Math.sqrt(this.mWxh[i][j] + eps)) * grads.dWxh[i][j];
      }

      for (let j = 0; j < this.hiddenSize; j++) {
        this.mWhh[i][j] += grads.dWhh[i][j] * grads.dWhh[i][j];
        this.Whh[i][j] -= (lr / Math.sqrt(this.mWhh[i][j] + eps)) * grads.dWhh[i][j];
      }
    }
  }

  /**
   * Generates a sequence of pitch vocabulary indices starting from a seed list
   */
  public generate(seed: number[], length: number, temp: number = 0.8): number[] {
    const generated: number[] = [...seed];
    
    // We sample one step at a time, feeding back the window of context sequence
    for (let step = 0; step < length; step++) {
      // Crop to context window if needed, or feed the entire sequence
      const windowStart = Math.max(0, generated.length - 8);
      const window = generated.slice(windowStart);
      
      const { p } = this.forward(window);
      const nextProbs = p[p.length - 1]; // final step probabilities output

      const chosenIdx = this.sampleFromProbabilities(nextProbs, temp);
      generated.push(chosenIdx);
    }

    return generated;
  }

  /**
   * Samples a vocabulary index from probabilities scaled by temperature
   */
  private sampleFromProbabilities(probs: number[], temperature: number): number {
    if (temperature <= 0.05) {
      // Deterministic argmax
      let maxIdx = 0;
      let maxVal = probs[0];
      for (let i = 1; i < probs.length; i++) {
        if (probs[i] > maxVal) {
          maxVal = probs[i];
          maxIdx = i;
        }
      }
      return maxIdx;
    }

    // Scale logits by temperature: logit_scaled = log(prob + eps) / T
    const logits = probs.map((p) => Math.log(Math.max(p, 1e-12)) / temperature);
    const maxLogit = Math.max(...logits);
    const exps = logits.map((l) => Math.exp(l - maxLogit)); // stable subtraction
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const scaledProbs = exps.map((e) => e / (sumExps || 1));

    // Cumulative random selection
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < scaledProbs.length; i++) {
      cumulative += scaledProbs[i];
      if (r <= cumulative) {
        return i;
      }
    }
    
    return scaledProbs.length - 1;
  }
}

/**
 * Preprocesses a structured melody array of NoteEvents into sequence arrays for training
 */
export function preprocessMelody(notes: NoteEvent[], seqLen: number): PreprocessedData {
  if (notes.length === 0) {
    throw new Error("No notes provided in dataset.");
  }

  // Extrapolate distinct pitches
  const uniquePitches = Array.from(new Set(notes.map((n) => n.pitch)));
  const vocab = [...uniquePitches].sort((a, b) => a - b);

  const pitchToIdx: Record<number, number> = {};
  const idxToPitch: Record<number, number> = {};
  vocab.forEach((p, i) => {
    pitchToIdx[p] = i;
    idxToPitch[i] = p;
  });

  const tokenizedSong = notes.map((n) => pitchToIdx[n.pitch]);

  // Handle cases where the melody is too short for the context window
  const actualSeqLen = Math.min(seqLen, Math.max(1, tokenizedSong.length - 1));

  const inputSequences: number[][] = [];
  const targetPitches: number[] = [];

  for (let i = 0; i < tokenizedSong.length - actualSeqLen; i++) {
    inputSequences.push(tokenizedSong.slice(i, i + actualSeqLen));
    targetPitches.push(tokenizedSong[i + actualSeqLen]);
  }

  // Fallback if song is single-note or extremely short
  if (inputSequences.length === 0) {
    inputSequences.push([tokenizedSong[0]]);
    targetPitches.push(tokenizedSong[0]);
  }

  return {
    vocab,
    pitchToIdx,
    idxToPitch,
    inputSequences,
    targetPitches
  };
}
