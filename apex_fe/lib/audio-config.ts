/**
 * Audio Configuration & Utilities
 *
 * Provides configuration for the audio system and utilities for generating
 * fallback audio when external files are unavailable.
 *
 * Rationale:
 *   - Centralized config makes it easy to adjust audio settings across the app
 *   - Web Audio API fallback ensures chimes play even if audio file is unavailable
 *   - Supports user preferences (stored in localStorage)
 */

export interface AudioConfig {
  // Playback settings
  enabled: boolean
  volume: number // 0-1

  // Chime settings
  chimeFrequency: 'light' | 'standard' | 'aggressive'
  chimeUrl: string // URL to external audio file

  // User preferences key
  storageKey: string
}

// Default configuration
export const defaultAudioConfig: AudioConfig = {
  enabled: true,
  volume: 0.5,
  chimeFrequency: 'standard',
  chimeUrl: '/audio/lead-chime.mp3',
  storageKey: 'app:audio-config',
}

/**
 * Load audio config from localStorage (user preferences)
 * Falls back to defaults if not found
 */
export function loadAudioConfig(): AudioConfig {
  try {
    if (typeof window === 'undefined') return defaultAudioConfig

    const stored = localStorage.getItem(defaultAudioConfig.storageKey)
    if (!stored) return defaultAudioConfig

    const parsed = JSON.parse(stored)
    return { ...defaultAudioConfig, ...parsed }
  } catch (err) {
    console.warn('[AudioConfig] Failed to load from localStorage:', err)
    return defaultAudioConfig
  }
}

/**
 * Save audio config to localStorage (user preferences)
 */
export function saveAudioConfig(config: Partial<AudioConfig>): void {
  try {
    if (typeof window === 'undefined') return

    const current = loadAudioConfig()
    const updated = { ...current, ...config }
    localStorage.setItem(defaultAudioConfig.storageKey, JSON.stringify(updated))
  } catch (err) {
    console.warn('[AudioConfig] Failed to save to localStorage:', err)
  }
}

/**
 * Generate a simple beep tone using Web Audio API (fallback when audio file unavailable)
 *
 * This is useful as a backup chime if the external audio file fails to load.
 * Returns a Blob that can be used as an audio source.
 */
export function generateChimeTone(
  frequency: 'light' | 'standard' | 'aggressive' = 'standard'
): Blob {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext

  if (!AudioContext) {
    throw new Error('Web Audio API not supported')
  }

  const audioContext = new AudioContext()
  const sampleRate = audioContext.sampleRate

  // Duration and frequency settings based on chime intensity
  const settings = {
    light: { duration: 0.2, baseFreq: 800, secondFreq: 600 },
    standard: { duration: 0.3, baseFreq: 1000, secondFreq: 800 },
    aggressive: { duration: 0.4, baseFreq: 1200, secondFreq: 1000 },
  }

  const { duration, baseFreq, secondFreq } = settings[frequency]
  const length = sampleRate * duration
  const buffer = audioContext.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  // Two-tone chime: base frequency then second frequency
  const halfLength = length / 2

  for (let i = 0; i < halfLength; i++) {
    data[i] = Math.sin((2 * Math.PI * baseFreq * i) / sampleRate) * 0.3
  }

  for (let i = halfLength; i < length; i++) {
    data[i] = Math.sin((2 * Math.PI * secondFreq * (i - halfLength)) / sampleRate) * 0.2
  }

  // Export buffer as WAV
  const wav = audioBufferToWav(buffer)
  return new Blob([wav], { type: 'audio/wav' })
}

/**
 * Convert AudioBuffer to WAV format (utility for generateChimeTone)
 */
function audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numberOfChannels = 1
  const sampleRate = audioBuffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16

  const bytesPerSample = bitDepth / 8
  const blockAlign = numberOfChannels * bytesPerSample

  let offset = 0
  let pos = 0

  const buffer = audioBuffer.getChannelData(0)
  const reducedData = downsampleBuffer(buffer, 44100)
  const dataLength = reducedData.length * bytesPerSample
  const bufferLength = 36 + dataLength
  const arrayBuffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(arrayBuffer)

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, bufferLength, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, format, true)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, 44100, true) // sample rate
  view.setUint32(28, 44100 * blockAlign, true) // avg. byte rate
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, dataLength, true)

  // Write audio samples
  let index = 44
  const volume = 0.8
  for (let i = 0; i < reducedData.length; i++) {
    view.setInt16(index, reducedData[i] * (0x7fff * volume), true)
    index += 2
  }

  return arrayBuffer
}

/**
 * Downsample buffer to target sample rate
 */
function downsampleBuffer(buffer: Float32Array, targetSampleRate: number): Int16Array {
  if (targetSampleRate === 44100) {
    return floatTo16BitPCM(buffer)
  }

  const ratio = buffer.length / targetSampleRate
  const newLength = Math.round(buffer.length / ratio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio)
    let accum = 0
    let count = 0

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i]
      count++
    }

    result[offsetResult] = accum / count
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }

  return floatTo16BitPCM(result)
}

/**
 * Convert 32-bit float to 16-bit PCM
 */
function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
  const pcm = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const pcmValue = Math.max(-1, Math.min(1, float32Array[i]))
    pcm[i] = pcmValue < 0 ? pcmValue * 0x8000 : pcmValue * 0x7fff
  }
  return pcm
}

/**
 * Create a blob URL for the generated chime
 */
export function generateChimeUrl(
  frequency: 'light' | 'standard' | 'aggressive' = 'standard'
): string {
  try {
    const blob = generateChimeTone(frequency)
    return URL.createObjectURL(blob)
  } catch (err) {
    console.warn('[AudioConfig] Failed to generate chime tone:', err)
    throw err
  }
}
