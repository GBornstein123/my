# Singing App Prototype

A web-based prototype application that sings melodies using the Web Audio API.

## Features

- **Multiple Songs**: Choose from classic melodies:
  - Twinkle Twinkle Little Star
  - Happy Birthday
  - Mary Had a Little Lamb
  - Do-Re-Mi Scale

- **Customizable Voice**:
  - Adjustable tempo (60-240 BPM)
  - Multiple waveform types (Sine, Square, Sawtooth, Triangle)
  - Each waveform produces a different "voice" quality

- **Visual Feedback**:
  - Real-time note display showing which note is currently being sung
  - Animated pulsing effect during playback

- **Playback Controls**:
  - Play any song with a single click
  - Stop button to interrupt playback

## How to Use

1. **Open the App**: Simply open `index.html` in a modern web browser
2. **Select a Song**: Click any of the song buttons to start playback
3. **Adjust Settings**:
   - Move the tempo slider to change the speed
   - Select different waveforms to change the voice quality
4. **Stop**: Click the stop button to interrupt the current song

## Technical Details

### Technology Stack
- Pure HTML5, CSS3, and JavaScript (no dependencies)
- Web Audio API for sound synthesis
- Responsive design for mobile and desktop

### How It Works
The app uses the Web Audio API to generate musical notes by creating oscillators at specific frequencies. Each note is mapped to its corresponding frequency (e.g., A4 = 440 Hz), and songs are defined as sequences of notes with durations.

The audio includes:
- Attack/release envelopes for smooth note transitions
- Configurable waveforms for different timbres
- Tempo control for playback speed

## Browser Compatibility

Works in all modern browsers that support:
- Web Audio API
- ES6 JavaScript (classes, async/await)
- CSS Grid

Tested in:
- Chrome/Edge (recommended)
- Firefox
- Safari

## File Structure

```
.
├── index.html    # Main HTML structure
├── styles.css    # Styling and animations
├── app.js        # Web Audio API implementation
└── SINGING_APP.md # This file
```

## Future Enhancements

Potential features for future versions:
- Custom song composer
- Volume control
- More complex melodies
- Lyrics display
- Recording/export functionality
- Multiple instrument sounds
- Harmony/chord support

## License

MIT License - Free to use and modify
