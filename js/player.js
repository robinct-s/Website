// ========================
// SPA / Persistent Music Player
// ========================

const playlist = [
    "music/Limit_Demo.mp3",
    "music/Reboot.mp3",
    "music/Sora_Blue.mp3"
];

const trackNames = [
    "Limit_Demo",
    "Reboot",
    "Sora_Blue"
];

const player = document.getElementById("music-player");
const trackTitle = document.getElementById("track-title");
const playPauseBtn = document.getElementById("play-pause");
const nextBtn = document.getElementById("next-track");
const prevBtn = document.getElementById("prev-track");
const volumeSlider = document.getElementById("volume-slider");
const introLogoTrigger = document.getElementById("intro-logo-trigger");

const AUDIO_FADE_IN_MS = 1800;
const INTRO_CLICK_ANIM_MS = 1050;
const INTRO_SWAP_DELAY_MS = 1410;

let currentTrack = 0;
let isPlaying = false;
let introStarted = false;
let fadeVolumeFrame = null;

function cancelVolumeFade() {
    if (fadeVolumeFrame !== null) {
        cancelAnimationFrame(fadeVolumeFrame);
        fadeVolumeFrame = null;
    }
}

function playWithFadeIn(durationMs = AUDIO_FADE_IN_MS) {
    const targetVolume = Math.max(0, Math.min(1, parseFloat(volumeSlider.value)));
    cancelVolumeFade();

    player.volume = 0;
    player.play();

    const startTime = performance.now();
    const step = (now) => {
        const progress = Math.min((now - startTime) / durationMs, 1);
        player.volume = targetVolume * progress;

        if (progress < 1 && !player.paused) {
            fadeVolumeFrame = requestAnimationFrame(step);
        } else {
            player.volume = targetVolume;
            fadeVolumeFrame = null;
        }
    };

    fadeVolumeFrame = requestAnimationFrame(step);
}

function startIntro() {
    if (introStarted) return;
    introStarted = true;
    document.body.classList.add("intro-clicked");
    window.setTimeout(() => {
        document.body.classList.add("intro-transition");
    }, INTRO_CLICK_ANIM_MS);
    window.setTimeout(() => {
        document.body.classList.remove("pre-intro");
        document.body.classList.remove("intro-clicked");
        document.body.classList.remove("intro-transition");
        document.body.classList.add("intro-started");
        window.dispatchEvent(new CustomEvent("introanimationcomplete", {
            detail: { page: "home" }
        }));
    }, INTRO_SWAP_DELAY_MS);
}

// ---------- Load Track ----------
function loadTrack(index) {
    currentTrack = index;

    if (!playlist[currentTrack]) {
        trackTitle.textContent = "Track not found";
        player.src = "";
        return;
    }

    player.src = playlist[currentTrack];
    trackTitle.textContent = trackNames[currentTrack] || "Unknown Track";
    player.load();

    if (isPlaying) playWithFadeIn();
}

// ---------- Play / Pause ----------
playPauseBtn.addEventListener("click", () => {
    if (!player.src) loadTrack(currentTrack);
    if (!player.src) return;

    if (player.paused) {
        playWithFadeIn();
        isPlaying = true;
        playPauseBtn.textContent = "\u23F8";
    } else {
        cancelVolumeFade();
        player.pause();
        isPlaying = false;
        playPauseBtn.textContent = "\u25B6";
    }
});

if (introLogoTrigger) {
    introLogoTrigger.addEventListener("click", () => {
        startIntro();
        if (!player.src) loadTrack(currentTrack);
        if (!player.src) return;
        if (player.paused) {
            playWithFadeIn();
        }
        isPlaying = true;
        playPauseBtn.textContent = "\u23F8";
    });
}

// ---------- Next / Previous ----------
nextBtn.addEventListener("click", () => {
    isPlaying = true;
    currentTrack = (currentTrack + 1) % playlist.length;
    loadTrack(currentTrack);
    playPauseBtn.textContent = "\u23F8";
});

prevBtn.addEventListener("click", () => {
    isPlaying = true;
    currentTrack = (currentTrack - 1 + playlist.length) % playlist.length;
    loadTrack(currentTrack);
    playPauseBtn.textContent = "\u23F8";
});

// ---------- Track Ended ----------
player.addEventListener("ended", () => {
    nextBtn.click();
});

// ---------- Volume Control ----------
volumeSlider.addEventListener("input", () => {
    cancelVolumeFade();
    player.volume = volumeSlider.value;
});

// ---------- Error Handling ----------
player.addEventListener("error", () => {
    console.warn("Failed to load track:", player.src);
    trackTitle.textContent = "Failed to load track";
});

// ---------- Initial Load ----------
window.addEventListener("load", () => {
    loadTrack(currentTrack);

    const savedVolume = localStorage.getItem("player-volume");
    if (savedVolume) {
        player.volume = parseFloat(savedVolume);
        volumeSlider.value = player.volume;
    }

    introStarted = document.body.classList.contains("intro-started");
});

// ---------- Save Volume ----------
volumeSlider.addEventListener("change", () => {
    localStorage.setItem("player-volume", player.volume);
});
