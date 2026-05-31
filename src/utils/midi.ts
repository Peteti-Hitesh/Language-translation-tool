/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NoteEvent, MidiPreset } from '../types';

// Convert MIDI notes to readable Note names (C4, F#5, etc.)
export function getNoteName(pitch: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteValue = pitch % 12;
  const octave = Math.floor(pitch / 12) - 1;
  return `${noteNames[noteValue]}${octave}`;
}

// Convert note index to color (white or black keyboard keys)
export function isBlackKey(pitch: number): boolean {
  const blackKeys = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A# relative to C
  return blackKeys.includes(pitch % 12);
}

// Create premium classical, jazz, and blues melody presets
export const MIDI_PRESETS: MidiPreset[] = [
  {
    id: 'bach-minuet',
    name: "Minuet in G Major",
    composer: "Johann Sebastian Bach",
    genre: "Classical",
    notes: [
      // Major theme in G
      { id: 'b1', pitch: 74, start: 0.0, duration: 1.0, velocity: 100 }, // D5
      { id: 'b2', pitch: 67, start: 1.0, duration: 0.5, velocity: 90 },  // G4
      { id: 'b3', pitch: 69, start: 1.5, duration: 0.5, velocity: 90 },  // A4
      { id: 'b4', pitch: 71, start: 2.0, duration: 0.5, velocity: 90 },  // B4
      { id: 'b5', pitch: 72, start: 2.5, duration: 0.5, velocity: 95 },  // C5
      { id: 'b6', pitch: 74, start: 3.0, duration: 1.0, velocity: 100 }, // D5
      { id: 'b7', pitch: 67, start: 4.0, duration: 1.0, velocity: 85 },  // G4
      { id: 'b8', pitch: 67, start: 5.0, duration: 1.0, velocity: 80 },  // G4
      
      { id: 'b9', pitch: 76, start: 6.0, duration: 1.0, velocity: 100 }, // E5
      { id: 'b10', pitch: 72, start: 7.0, duration: 0.5, velocity: 90 }, // C5
      { id: 'b11', pitch: 74, start: 7.5, duration: 0.5, velocity: 90 }, // D5
      { id: 'b12', pitch: 76, start: 8.0, duration: 0.5, velocity: 90 }, // E5
      { id: 'b13', pitch: 78, start: 8.5, duration: 0.5, velocity: 95 }, // F#5
      { id: 'b14', pitch: 79, start: 9.0, duration: 1.0, velocity: 105 },// G5
      { id: 'b15', pitch: 67, start: 10.0, duration: 1.0, velocity: 85 }, // G4
      { id: 'b16', pitch: 67, start: 11.0, duration: 1.0, velocity: 80 }, // G4

      { id: 'b17', pitch: 72, start: 12.0, duration: 1.0, velocity: 95 }, // C5
      { id: 'b18', pitch: 74, start: 13.0, duration: 0.5, velocity: 90 }, // D5
      { id: 'b19', pitch: 72, start: 13.5, duration: 0.5, velocity: 90 }, // C5
      { id: 'b20', pitch: 71, start: 14.0, duration: 0.5, velocity: 90 }, // B4
      { id: 'b21', pitch: 69, start: 14.5, duration: 0.5, velocity: 85 }, // A4
      { id: 'b22', pitch: 67, start: 15.0, duration: 1.0, velocity: 95 }, // G4
      { id: 'b23', pitch: 69, start: 16.0, duration: 0.5, velocity: 90 }, // A4
      { id: 'b24', pitch: 71, start: 16.5, duration: 0.5, velocity: 90 }, // B4
      { id: 'b25', pitch: 67, start: 17.0, duration: 1.0, velocity: 95 }, // G4

      { id: 'b26', pitch: 69, start: 18.0, duration: 2.0, velocity: 100 },// A4
      { id: 'b27', pitch: 74, start: 20.0, duration: 1.0, velocity: 90 }, // D5
      { id: 'b28', pitch: 71, start: 21.0, duration: 1.0, velocity: 90 }, // B4
      { id: 'b29', pitch: 69, start: 22.0, duration: 2.0, velocity: 95 }, // A4
    ]
  },
  {
    id: 'beethoven-ode',
    name: "Ode to Joy (An die Freude)",
    composer: "Ludwig van Beethoven",
    genre: "Classical",
    notes: [
      { id: 'e1', pitch: 69, start: 0.0, duration: 1.0, velocity: 100 }, // A4 (transposed to make it sing nicely)
      { id: 'e2', pitch: 69, start: 1.0, duration: 1.0, velocity: 100 }, // A4
      { id: 'e3', pitch: 70, start: 2.0, duration: 1.0, velocity: 100 }, // Bb4
      { id: 'e4', pitch: 72, start: 3.0, duration: 1.0, velocity: 100 }, // C5
      { id: 'e5', pitch: 72, start: 4.0, duration: 1.0, velocity: 100 }, // C5
      { id: 'e6', pitch: 70, start: 5.0, duration: 1.0, velocity: 100 }, // Bb4
      { id: 'e7', pitch: 69, start: 6.0, duration: 1.0, velocity: 100 }, // A4
      { id: 'e8', pitch: 67, start: 7.0, duration: 1.0, velocity: 100 }, // G4
      { id: 'e9', pitch: 65, start: 8.0, duration: 1.0, velocity: 100 }, // F4
      { id: 'e10', pitch: 65, start: 9.0, duration: 1.0, velocity: 100 }, // F4
      { id: 'e11', pitch: 67, start: 10.0, duration: 1.0, velocity: 100 }, // G4
      { id: 'e12', pitch: 69, start: 11.0, duration: 1.0, velocity: 100 }, // A4
      { id: 'e13', pitch: 69, start: 12.0, duration: 1.5, velocity: 100 }, // A4
      { id: 'e14', pitch: 67, start: 13.5, duration: 0.5, velocity: 90 },  // G4
      { id: 'e15', pitch: 67, start: 14.0, duration: 2.0, velocity: 100 }, // G4

      { id: 'e16', pitch: 69, start: 16.0, duration: 1.0, velocity: 100 }, // A4
      { id: 'e17', pitch: 69, start: 17.0, duration: 1.0, velocity: 100 }, // A4
      { id: 'e18', pitch: 70, start: 18.0, duration: 1.0, velocity: 100 }, // Bb4
      { id: 'e19', pitch: 72, start: 19.0, duration: 1.0, velocity: 100 }, // C5
      { id: 'e20', pitch: 72, start: 20.0, duration: 1.0, velocity: 100 }, // C5
      { id: 'e21', pitch: 70, start: 21.0, duration: 1.0, velocity: 100 }, // Bb4
      { id: 'e22', pitch: 69, start: 22.0, duration: 1.0, velocity: 100 }, // A4
      { id: 'e23', pitch: 67, start: 23.0, duration: 1.0, velocity: 100 }, // G4
      { id: 'e24', pitch: 65, start: 24.0, duration: 1.0, velocity: 100 }, // F4
      { id: 'e25', pitch: 65, start: 25.0, duration: 1.0, velocity: 100 }, // F4
      { id: 'e26', pitch: 67, start: 26.0, duration: 1.0, velocity: 100 }, // G4
      { id: 'e27', pitch: 69, start: 27.0, duration: 1.0, velocity: 100 }, // A4
      { id: 'e28', pitch: 67, start: 28.0, duration: 1.5, velocity: 100 }, // G4
      { id: 'e29', pitch: 65, start: 29.5, duration: 0.5, velocity: 90 },  // F4
      { id: 'e30', pitch: 65, start: 30.0, duration: 2.0, velocity: 100 }, // F4
    ]
  },
  {
    id: 'cool-jazz',
    name: "Kind of Blue Riff",
    composer: "Miles Davis Style",
    genre: "Jazz",
    notes: [
      { id: 'j1', pitch: 58, start: 0.0, duration: 1.5, velocity: 85 },  // Bb3
      { id: 'j2', pitch: 62, start: 1.5, duration: 0.5, velocity: 95 },  // D4
      { id: 'j3', pitch: 65, start: 2.0, duration: 1.0, velocity: 100 }, // F4
      { id: 'j4', pitch: 67, start: 3.0, duration: 1.0, velocity: 90 },  // G4
      { id: 'j5', pitch: 69, start: 4.0, duration: 2.0, velocity: 100 }, // A4 (dorian mode feel)

      { id: 'j6', pitch: 67, start: 6.0, duration: 1.5, velocity: 80 },  // G4
      { id: 'j7', pitch: 65, start: 7.5, duration: 0.5, velocity: 85 },  // F4
      { id: 'j8', pitch: 62, start: 8.0, duration: 1.0, velocity: 90 },  // D4
      { id: 'j9', pitch: 60, start: 9.0, duration: 1.0, velocity: 80 },  // C4
      { id: 'j10', pitch: 58, start: 10.0, duration: 3.0, velocity: 70 }, // Bb3

      { id: 'j11', pitch: 62, start: 14.0, duration: 1.0, velocity: 90 }, // D4
      { id: 'j12', pitch: 65, start: 15.0, duration: 0.5, velocity: 95 }, // F4
      { id: 'j13', pitch: 67, start: 15.5, duration: 0.5, velocity: 90 }, // G4
      { id: 'j14', pitch: 70, start: 16.0, duration: 2.0, velocity: 105 },// Bb4
      { id: 'j15', pitch: 69, start: 18.0, duration: 1.0, velocity: 95 }, // A4
      { id: 'j16', pitch: 67, start: 19.1, duration: 2.9, velocity: 80 }, // G4
    ]
  },
  {
    id: 'blues-shuffle',
    name: "12-Bar Blues Walking Riff",
    composer: "Traditional Blues",
    genre: "Blues",
    notes: [
      { id: 'bl1', pitch: 48, start: 0.0, duration: 0.75, velocity: 95 }, // C3 (swing style walking bass)
      { id: 'bl2', pitch: 52, start: 0.75, duration: 0.75, velocity: 85 },// E3
      { id: 'bl3', pitch: 55, start: 1.5, duration: 0.75, velocity: 95 },  // G3
      { id: 'bl4', pitch: 57, start: 2.25, duration: 0.75, velocity: 90 }, // A3
      { id: 'bl5', pitch: 58, start: 3.0, duration: 0.75, velocity: 100 },// Bb3 (flat 7th)
      { id: 'bl6', pitch: 57, start: 3.75, duration: 0.75, velocity: 85 }, // A3
      { id: 'bl7', pitch: 55, start: 4.5, duration: 0.75, velocity: 95 },  // G3
      { id: 'bl8', pitch: 52, start: 5.25, duration: 0.75, velocity: 80 }, // E3

      // Shift to IV chord (F3)
      { id: 'bl9', pitch: 53, start: 6.0, duration: 0.75, velocity: 95 },  // F3
      { id: 'bl10', pitch: 57, start: 6.75, duration: 0.75, velocity: 85 },// A3
      { id: 'bl11', pitch: 60, start: 7.5, duration: 0.75, velocity: 95 }, // C4
      { id: 'bl12', pitch: 62, start: 8.25, duration: 0.75, velocity: 90 },// D4
      { id: 'bl13', pitch: 63, start: 9.0, duration: 0.75, velocity: 100 },// Eb4 (flat 7th of IV)
      { id: 'bl14', pitch: 62, start: 9.75, duration: 0.75, velocity: 85 },// D4
      { id: 'bl15', pitch: 60, start: 10.5, duration: 0.75, velocity: 90 },// C4
      { id: 'bl16', pitch: 57, start: 11.25, duration: 0.75, velocity: 80 },// A3

      // Move back to I
      { id: 'bl17', pitch: 48, start: 12.0, duration: 0.75, velocity: 95 },// C3
      { id: 'bl18', pitch: 52, start: 12.75, duration: 0.75, velocity: 85 },// E3
      { id: 'bl19', pitch: 55, start: 13.5, duration: 0.75, velocity: 95 },// G3
      { id: 'bl20', pitch: 57, start: 14.25, duration: 0.75, velocity: 80 },// A3

      // Move to V
      { id: 'bl21', pitch: 55, start: 15.0, duration: 1.5, velocity: 105 },// G3
      { id: 'bl22', pitch: 53, start: 16.5, duration: 1.5, velocity: 95 }, // F3
      { id: 'bl23', pitch: 48, start: 18.0, duration: 3.0, velocity: 110 },// C3
    ]
  }
];

/**
 * Variable-Length Quantity (VLQ) encoding for MIDI relative ticks
 */
function encodeVLQ(value: number): number[] {
  const bytes: number[] = [];
  let buffer = value;
  bytes.push(buffer & 0x7f);
  while (buffer > 127) {
    buffer = buffer >> 7;
    bytes.push((buffer & 0x7f) | 0x80);
  }
  return bytes.reverse();
}

/**
 * Encodes a MIDI note event stream into a fully compliant Type 0 Standard MIDI File (.mid)
 * Format is: Header Chunk (MThd) + Track Chunk (MTrk)
 */
export function generateMidiFile(notes: NoteEvent[]): Uint8Array {
  const ticksPerBeat = 96; // Resolution

  // 1. Break notes into Note On and Note Off actions
  interface Action {
    tick: number;
    type: 'on' | 'off';
    pitch: number;
    velocity: number;
  }

  const actions: Action[] = [];
  notes.forEach((note) => {
    const startTick = Math.round(note.start * ticksPerBeat);
    const durationTicks = Math.round(note.duration * ticksPerBeat);
    const endTick = startTick + durationTicks;

    actions.push({
      tick: startTick,
      type: 'on',
      pitch: note.pitch,
      velocity: note.velocity,
    });

    actions.push({
      tick: endTick,
      type: 'off',
      pitch: note.pitch,
      velocity: 0,
    });
  });

  // 2. Sort actions chronologically. If ticks are equal, release notes (off) before taking next triggers (on)
  actions.sort((a, b) => {
    if (a.tick === b.tick) {
      return a.type === 'off' ? -1 : 1;
    }
    return a.tick - b.tick;
  });

  // 3. Assemble Track Data
  const trackBytes: number[] = [];
  
  // Set tempo (Default 120 beats per minute -> 500,000 microseconds per quarter note)
  // 3 bytes binary: 0x07 0xA1 0x20
  trackBytes.push(0x00); // delta time 0
  trackBytes.push(0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20); // Set Tempo Meta-event

  // Set time signature (Optional, e.g. 4/4)
  trackBytes.push(0x00); // delta time 0
  trackBytes.push(0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  let lastTick = 0;

  actions.forEach((act) => {
    const delta = act.tick - lastTick;
    lastTick = act.tick;

    // Encode delta tick
    const vlqDelta = encodeVLQ(delta);
    trackBytes.push(...vlqDelta);

    // Event message (Channel 0)
    if (act.type === 'on') {
      trackBytes.push(0x90, act.pitch, act.velocity);
    } else {
      trackBytes.push(0x80, act.pitch, 0); // Note release
    }
  });

  // End of track event: Delta (0) + FF 2F 00
  trackBytes.push(0x00, 0xFF, 0x2F, 0x00);

  // 4. Assemble standard MIDI Header
  const headerBytes = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Header length (6 bytes)
    0x00, 0x00,             // Format 0 (single track)
    0x00, 0x01,             // Track count (1)
    0x00, ticksPerBeat      // Ticks per quarter note (96)
  ];

  // 5. Assemble Track Header
  const trackLength = trackBytes.length;
  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    (trackLength >> 24) & 0xff,
    (trackLength >> 16) & 0xff,
    (trackLength >> 8) & 0xff,
    trackLength & 0xff
  ];

  // 6. Concatenate All Bytes
  const totalMidiBytes = new Uint8Array(headerBytes.length + trackHeader.length + trackBytes.length);
  totalMidiBytes.set(headerBytes, 0);
  totalMidiBytes.set(trackHeader, headerBytes.length);
  totalMidiBytes.set(trackBytes, headerBytes.length + trackHeader.length);

  return totalMidiBytes;
}

/**
 * Triggers a download of the midi stream as a client-side file
 */
export function downloadMidiFile(notes: NoteEvent[], filename: string): void {
  const binaryData = generateMidiFile(notes);
  const blob = new Blob([binaryData], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Custom parser to import simple Midi arrays from user uploaded buffers or simulated drag-and-drops.
 * Parses a subset of standard MIDI bytes into standard structured NoteEvents.
 */
export function parseMidiBuffer(buffer: ArrayBuffer): NoteEvent[] {
  const bytes = new Uint8Array(buffer);
  const notes: NoteEvent[] = [];
  
  // Verify standard MThd magic text
  if (bytes[0] !== 0x4d || bytes[1] !== 0x54 || bytes[2] !== 0x68 || bytes[3] !== 0x64) {
    throw new Error("Invalid file content: Missing standard MIDI header identifier.");
  }

  const format = (bytes[8] << 8) | bytes[9];
  if (format > 1) {
    throw new Error("Only MIDI format 0 and 1 are supported.");
  }

  const ticksPerBeat = (bytes[12] << 8) | bytes[13];
  
  // Search for track chunk "MTrk"
  let offset = 14;
  while (offset < bytes.length - 8) {
    if (bytes[offset] === 0x4d && bytes[offset+1] === 0x54 && bytes[offset+2] === 0x72 && bytes[offset+3] === 0x6b) {
      break;
    }
    offset++;
  }

  if (offset >= bytes.length - 8) {
    throw new Error("No track structure found inside the MIDI container.");
  }

  // Length of track
  const trackLength = (bytes[offset+4] << 24) | (bytes[offset+5] << 16) | (bytes[offset+6] << 8) | bytes[offset+7];
  let ptr = offset + 8;
  const endPtr = ptr + trackLength;

  let currentTick = 0;
  
  interface PendingNote {
    pitch: number;
    startTick: number;
    velocity: number;
  }
  
  const activeNotes: Record<number, PendingNote> = {};
  let lastStatus = 0;

  // Read VLQ byte sequence
  function readVLQ(): number {
    let value = 0;
    while (ptr < bytes.length) {
      const b = bytes[ptr++];
      value = (value << 7) | (b & 0x7f);
      if (!(b & 0x80)) {
        break;
      }
    }
    return value;
  }

  let noteIdCounter = 1;

  while (ptr < endPtr && ptr < bytes.length) {
    const deltaTime = readVLQ();
    currentTick += deltaTime;

    let status = bytes[ptr++];
    
    // Running status byte fallback
    if (status < 0x80) {
      status = lastStatus;
      ptr--; // Re-process as data
    } else {
      lastStatus = status;
    }

    const mainNibble = status & 0xf0;
    const channel = status & 0x0f;

    if (mainNibble === 0x90) { // Note On
      const pitch = bytes[ptr++];
      const velocity = bytes[ptr++];
      
      if (velocity > 0) {
        // Save note on tick
        activeNotes[pitch] = {
          pitch,
          startTick: currentTick,
          velocity
        };
      } else {
        // Velocity of 0 means note off
        const pending = activeNotes[pitch];
        if (pending) {
          const duration = (currentTick - pending.startTick) / ticksPerBeat;
          const start = pending.startTick / ticksPerBeat;
          notes.push({
            id: `imported-${noteIdCounter++}`,
            pitch: pending.pitch,
            start: parseFloat(start.toFixed(3)),
            duration: parseFloat((duration > 0 ? duration : 0.25).toFixed(3)),
            velocity: pending.velocity
          });
          delete activeNotes[pitch];
        }
      }
    } else if (mainNibble === 0x80) { // Note Off
      const pitch = bytes[ptr++];
      const velocity = bytes[ptr++];
      const pending = activeNotes[pitch];
      if (pending) {
        const duration = (currentTick - pending.startTick) / ticksPerBeat;
        const start = pending.startTick / ticksPerBeat;
        notes.push({
          id: `imported-${noteIdCounter++}`,
          pitch: pending.pitch,
          start: parseFloat(start.toFixed(3)),
          duration: parseFloat((duration > 0 ? duration : 0.25).toFixed(3)),
          velocity: pending.velocity
        });
        delete activeNotes[pitch];
      }
    } else if (mainNibble === 0xA0 || mainNibble === 0xB0 || mainNibble === 0xE0) {
      ptr += 2; // Skip 2-byte messages
    } else if (mainNibble === 0xC0 || mainNibble === 0xD0) {
      ptr += 1; // Skip 1-byte messages
    } else if (status === 0xFF) { // Meta event
      const type = bytes[ptr++];
      const length = readVLQ();
      ptr += length; // Skip meta-event details
    } else if (status === 0xF0 || status === 0xF7) { // Sysex
      const length = readVLQ();
      ptr += length;
    }
  }

  // Flush remaining active notes
  Object.values(activeNotes).forEach((pending) => {
    const duration = (currentTick - pending.startTick) / ticksPerBeat;
    const start = pending.startTick / ticksPerBeat;
    notes.push({
      id: `imported-${noteIdCounter++}`,
      pitch: pending.pitch,
      start: parseFloat(start.toFixed(3)),
      duration: parseFloat((duration > 0 ? duration : 0.25).toFixed(3)),
      velocity: pending.velocity
    });
  });

  if (notes.length === 0) {
    throw new Error("No MIDI Note-On events were detected on Channel 1.");
  }

  // Sort notes sequentially by start time to make model prep simple
  return notes.sort((a, b) => a.start - b.start);
}
