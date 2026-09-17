/**
 * AudioPlayer — Singleton Audio Management
 *
 * Provides a single, deduplicated audio playback system for the entire app.
 * Key features:
 *
 *   1. Singleton pattern: only one Audio element per browser session
 *   2. Lazy-loaded: audio file preloaded on first playChime() call
 *   3. Debounced: prevents multiple chimes within 2 seconds (thundering herd protection)
 *   4. Browser mute handling: graceful degradation if browser blocks autoplay
 *   5. Error resilience: console warns but doesn't crash if audio fails
 *   6. Configurable: can be toggled on/off for user preferences
 *   7. Fallback: Web Audio API-generated tone if external file unavailable
 *
 * Design rationale:
 *   - Singleton prevents multiple Audio elements from competing for playback
 *   - Debouncing prevents jarring triple-chimes in multi-tab scenarios
 *   - Lazy-loading avoids loading audio unnecessarily (some users disable sound)
 *   - Graceful fallback ensures feature doesn't break the app if audio can't play
 *   - Web Audio fallback generates a tone client-side (no external file needed)
 *
 * Usage:
 *   import { audioPlayer } from '@/lib/audio'
 *
 *   // Play a chime (debounced)
 *   await audioPlayer.playChime()
 *
 *   // Toggle on/off
 *   audioPlayer.setEnabled(false)
 *   audioPlayer.setEnabled(true)
 */

import { generateChimeUrl } from './audio-config'

interface AudioPlayerConfig {
  audioUrl: string
  debounceMs: number
  enabled: boolean
}

class AudioPlayer {
  private static instance: AudioPlayer
  private audio: HTMLAudioElement | null = null
  private lastPlayTime = 0
  private config: AudioPlayerConfig

  private constructor(config: Partial<AudioPlayerConfig> = {}) {
    this.config = {
      audioUrl: '/audio/lead-chime.mp3',
      debounceMs: 2000, // Prevent chimes within 2 seconds
      enabled: true,
      ...config,
    }
  }

  /**
   * Get or create the singleton instance
   */
  static getInstance(config?: Partial<AudioPlayerConfig>): AudioPlayer {
    if (!AudioPlayer.instance) {
      AudioPlayer.instance = new AudioPlayer(config)
    }
    return AudioPlayer.instance
  }

  /**
   * Preload the audio file (called lazily on first playChime)
   * Falls back to Web Audio API-generated tone if file unavailable
   */
  private preload(): void {
    if (this.audio) return // Already loaded

    try {
      if (typeof window === 'undefined') return // Server-side safety

      this.audio = new Audio(this.config.audioUrl)
      this.audio.preload = 'auto'

      // Handle common audio errors gracefully
      this.audio.addEventListener('error', e => {
        console.warn('[AudioPlayer] Audio file load failed, attempting Web Audio API fallback:', e)
        this.audio = null // Clear failed audio
        this.tryWebAudioFallback()
      })
    } catch (err) {
      console.warn('[AudioPlayer] Failed to create Audio element:', err)
      this.tryWebAudioFallback()
    }
  }

  /**
   * Fallback: generate audio using Web Audio API
   */
  private tryWebAudioFallback(): void {
    try {
      const fallbackUrl = generateChimeUrl('standard')
      this.audio = new Audio(fallbackUrl)
      this.audio.preload = 'auto'
      console.info('[AudioPlayer] Web Audio API fallback ready')
    } catch (err) {
      console.warn('[AudioPlayer] Web Audio API fallback also failed:', err)
    }
  }

  /**
   * Play the chime sound with debouncing and error handling
   *
   * Returns true if chime was played, false if debounced or disabled
   */
  async playChime(): Promise<boolean> {
    if (!this.config.enabled) {
      return false
    }

    const now = Date.now()
    const timeSinceLastPlay = now - this.lastPlayTime

    // Debounce: skip if played recently
    if (timeSinceLastPlay < this.config.debounceMs) {
      return false
    }

    // Lazy-load on first use
    if (!this.audio) {
      this.preload()
    }

    if (!this.audio) {
      return false // Couldn't create audio element
    }

    try {
      // Reset playhead to start for immediate replay
      this.audio.currentTime = 0

      // Attempt to play
      const playPromise = this.audio.play()

      if (playPromise !== undefined) {
        // Modern browsers return a Promise
        await playPromise
      }

      this.lastPlayTime = now
      return true
    } catch (err: any) {
      // Common causes:
      // - NotAllowedError: browser blocked autoplay (user hasn't interacted)
      // - NotSupportedError: audio format not supported
      // - AbortError: playback was aborted

      if (err.name === 'NotAllowedError') {
        // This is expected if user hasn't interacted with the page
        console.debug('[AudioPlayer] Autoplay blocked by browser (expected if no user interaction)')
      } else {
        console.warn(`[AudioPlayer] Playback failed (${err.name}):`, err.message)
      }

      return false
    }
  }

  /**
   * Preload audio without playing (called for better UX on first interaction)
   */
  preloadAudio(): void {
    if (!this.audio) {
      this.preload()
    }
  }

  /**
   * Enable or disable audio playback
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
  }

  /**
   * Check if audio is currently enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioPlayerConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<AudioPlayerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Reset debounce timer (useful for testing)
   */
  resetDebounce(): void {
    this.lastPlayTime = 0
  }

  /**
   * Destroy the audio element (cleanup on app shutdown)
   */
  destroy(): void {
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
      this.audio = null
    }
  }
}

/**
 * Export singleton instance
 * This is the primary way to use the audio system
 */
export const audioPlayer = AudioPlayer.getInstance()

/**
 * Export class for testing
 */
export { AudioPlayer }
