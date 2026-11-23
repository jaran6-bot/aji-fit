// Speech Engine using Web Speech API (French Voice Coach)
class CoachVoice {
    constructor() {
        this.enabled = true;
        this.synth = window.speechSynthesis;
        this.voice = null;
        this.lastSpokenTime = 0;
        this.minInterval = 1200; // ms between voice alerts to avoid spam

        this.initVoice();
    }

    initVoice() {
        if (!this.synth) return;
        const setVoice = () => {
            const voices = this.synth.getVoices();
            // Try French voice
            this.voice = voices.find(v => v.lang.startsWith('fr') && !v.name.includes('Google') && !v.localService) 
                      || voices.find(v => v.lang.startsWith('fr')) 
                      || voices[0];
        };
        setVoice();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = setVoice;
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled && this.synth) {
            this.synth.cancel();
        }
    }

    speak(text, priority = false) {
        if (!this.enabled || !this.synth) return;

        const now = Date.now();
        if (!priority && now - this.lastSpokenTime < this.minInterval) {
            return;
        }

        if (priority) {
            this.synth.cancel();
        }

        const utter = new SpeechSynthesisUtterance(text);
        if (this.voice) utter.voice = this.voice;
        utter.rate = 1.15;
        utter.pitch = 1.05;
        utter.lang = 'fr-FR';

        this.lastSpokenTime = now;
        this.synth.speak(utter);
    }
}

window.coachVoice = new CoachVoice();
