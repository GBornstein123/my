// Singing App - Web Audio API Implementation

class SingingApp {
    constructor() {
        this.audioContext = null;
        this.currentTimeout = null;
        this.isPlaying = false;
        this.tempo = 120; // BPM
        this.waveform = 'sine';

        // Note frequencies (in Hz) - Middle octave
        this.notes = {
            'C4': 261.63,
            'D4': 293.66,
            'E4': 329.63,
            'F4': 349.23,
            'G4': 392.00,
            'A4': 440.00,
            'B4': 493.88,
            'C5': 523.25,
            'D5': 587.33,
            'E5': 659.25,
            'F5': 698.46,
            'G5': 783.99,
            'A5': 880.00,
            'REST': 0
        };

        // Song definitions: [note, duration in beats]
        this.songs = {
            twinkle: [
                ['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1],
                ['A4', 1], ['A4', 1], ['G4', 2],
                ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1],
                ['D4', 1], ['D4', 1], ['C4', 2]
            ],
            happy: [
                ['C4', 0.75], ['C4', 0.25], ['D4', 1], ['C4', 1],
                ['F4', 1], ['E4', 2],
                ['C4', 0.75], ['C4', 0.25], ['D4', 1], ['C4', 1],
                ['G4', 1], ['F4', 2]
            ],
            mary: [
                ['E4', 1], ['D4', 1], ['C4', 1], ['D4', 1],
                ['E4', 1], ['E4', 1], ['E4', 2],
                ['D4', 1], ['D4', 1], ['D4', 2],
                ['E4', 1], ['G4', 1], ['G4', 2]
            ],
            scale: [
                ['C4', 1], ['D4', 1], ['E4', 1], ['F4', 1],
                ['G4', 1], ['A4', 1], ['B4', 1], ['C5', 2],
                ['C5', 1], ['B4', 1], ['A4', 1], ['G4', 1],
                ['F4', 1], ['E4', 1], ['D4', 1], ['C4', 2]
            ]
        };

        this.init();
    }

    init() {
        // Initialize audio context on user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Song buttons
        document.querySelectorAll('.song-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const songName = e.target.dataset.song;
                this.playSong(songName);
            });
        });

        // Stop button
        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stop();
        });

        // Tempo slider
        const tempoSlider = document.getElementById('tempo');
        const tempoValue = document.getElementById('tempoValue');
        tempoSlider.addEventListener('input', (e) => {
            this.tempo = e.target.value;
            tempoValue.textContent = this.tempo;
        });

        // Waveform selector
        document.getElementById('waveform').addEventListener('change', (e) => {
            this.waveform = e.target.value;
        });
    }

    playNote(frequency, duration, startTime = 0) {
        if (!this.audioContext || frequency === 0) {
            return;
        }

        // Create oscillator
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Set waveform type
        oscillator.type = this.waveform;
        oscillator.frequency.value = frequency;

        // Envelope for smooth sound (ADSR-like)
        const now = this.audioContext.currentTime + startTime;
        const attackTime = 0.05;
        const releaseTime = 0.1;

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + attackTime);
        gainNode.gain.linearRampToValueAtTime(0.2, now + duration - releaseTime);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

        // Start and stop oscillator
        oscillator.start(now);
        oscillator.stop(now + duration);

        return oscillator;
    }

    async playSong(songName) {
        if (!this.songs[songName]) {
            console.error('Song not found:', songName);
            return;
        }

        // Stop any currently playing song
        this.stop();
        this.isPlaying = true;

        const song = this.songs[songName];
        const noteDisplay = document.getElementById('noteDisplay');
        const noteText = noteDisplay.querySelector('.note-text');

        // Calculate beat duration in seconds
        const beatDuration = 60 / this.tempo;

        let currentTime = 0;

        for (let i = 0; i < song.length && this.isPlaying; i++) {
            const [noteName, beats] = song[i];
            const frequency = this.notes[noteName];
            const duration = beats * beatDuration;

            // Update visual display
            noteDisplay.classList.add('playing');
            noteText.textContent = noteName === 'REST' ? '𝄽' : noteName;

            // Play the note
            if (frequency > 0) {
                this.playNote(frequency, duration);
            }

            // Wait for the note duration
            await this.sleep(duration * 1000);
        }

        // Reset display when song ends
        noteDisplay.classList.remove('playing');
        noteText.textContent = '-';
        this.isPlaying = false;
    }

    stop() {
        this.isPlaying = false;

        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        // Reset display
        const noteDisplay = document.getElementById('noteDisplay');
        const noteText = noteDisplay.querySelector('.note-text');
        noteDisplay.classList.remove('playing');
        noteText.textContent = '-';
    }

    sleep(ms) {
        return new Promise(resolve => {
            this.currentTimeout = setTimeout(resolve, ms);
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SingingApp();
});
