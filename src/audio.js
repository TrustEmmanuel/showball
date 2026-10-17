export function createAudio() {
  let ctx = null;
  let muted = localStorage.getItem("showball-mute") === "1";

  function context() {
    if (muted) return null;
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function env(audio, duration, gain, freq, type = "sine", slideTo) {
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, audio.currentTime + duration);
    amp.gain.setValueAtTime(gain, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  }

  function noise(audio, duration, gain) {
    const length = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 240;
    const amp = audio.createGain();
    amp.gain.value = gain;
    source.connect(filter);
    filter.connect(amp);
    amp.connect(audio.destination);
    source.start();
  }

  return {
    get muted() {
      return muted;
    },
    unlock() {
      context();
    },
    toggle() {
      muted = !muted;
      localStorage.setItem("showball-mute", muted ? "1" : "0");
      if (!muted) context();
      return muted;
    },
    kick(perfect) {
      const audio = context();
      if (!audio) return;
      noise(audio, 0.07, perfect ? 0.35 : 0.22);
      env(audio, 0.12, 0.18, perfect ? 180 : 140, "sine", 70);
    },
    perfect() {
      const audio = context();
      if (!audio) return;
      env(audio, 0.08, 0.08, 880, "sine", 1320);
    },
    goal() {
      const audio = context();
      if (!audio) return;
      [523, 659, 784, 1046].forEach((freq, index) => {
        setTimeout(() => {
          const live = context();
          if (live) env(live, 0.18, 0.1, freq, "triangle");
        }, index * 70);
      });
    },
    miss() {
      const audio = context();
      if (!audio) return;
      env(audio, 0.28, 0.12, 196, "sine", 70);
    },
  };
}
