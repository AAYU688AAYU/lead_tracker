# Audio Assets

This directory contains audio files used by the realtime notification system.

## Files

- `lead-chime.mp3` — Notification chime played when:
  - A new lead is assigned to the consultant
  - A lead enters stall status (48+ hours inactive)

## Adding a Custom Chime

To add a custom audio file:

1. **Source:** Find or create a short notification sound (~300ms duration)
   - Recommended: royalty-free sounds from Freesound.org, ZapSplat, or Pixabay
   - Format: MP3 (for broad browser compatibility)
   - Bitrate: 128kbps or 192kbps (good quality, small file size)
   - Sample: Look for "notification beep", "alert chime", or "success tone"

2. **Place:** Save as `lead-chime.mp3` in this directory

3. **Testing:** 
   ```typescript
   import { audioPlayer } from '@/lib/audio'
   await audioPlayer.playChime()
   ```

## Fallback Behavior

If `lead-chime.mp3` is missing or fails to load, the system automatically falls back to a Web Audio API-generated tone:

```typescript
import { generateChimeUrl } from '@/lib/audio-config'

const chimeUrl = generateChimeUrl('standard') // light | standard | aggressive
```

This ensures audio chimes always work, even if the external file is unavailable.

## Disabling Audio

Users can disable audio in settings:
```typescript
import { audioPlayer } from '@/lib/audio'
audioPlayer.setEnabled(false)
```

Or toggle via the notification settings UI (planned for Phase 9).
