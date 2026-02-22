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

let currentTrack = 0;
let isPlaying = false;

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

    if (isPlaying) player.play();
}

// ---------- Play / Pause ----------
playPauseBtn.addEventListener("click", () => {
    if (!player.src) return;

    if (player.paused) {
        player.play();
        isPlaying = true;
        playPauseBtn.textContent = "⏸";
    } else {
        player.pause();
        isPlaying = false;
        playPauseBtn.textContent = "▶";
    }
});

// ---------- Next / Previous ----------
nextBtn.addEventListener("click", () => {
    currentTrack = (currentTrack + 1) % playlist.length;
    loadTrack(currentTrack);
    player.play();
    isPlaying = true;
    playPauseBtn.textContent = "⏸";
});

prevBtn.addEventListener("click", () => {
    currentTrack = (currentTrack - 1 + playlist.length) % playlist.length;
    loadTrack(currentTrack);
    player.play();
    isPlaying = true;
    playPauseBtn.textContent = "⏸";
});

// ---------- Track Ended ----------
player.addEventListener("ended", () => {
    nextBtn.click();
});

// ---------- Volume Control ----------
volumeSlider.addEventListener("input", () => {
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

    // Load last volume if saved
    const savedVolume = localStorage.getItem("player-volume");
    if (savedVolume) {
        player.volume = parseFloat(savedVolume);
        volumeSlider.value = player.volume;
    }
});

// ---------- Save Volume ----------
volumeSlider.addEventListener("change", () => {
    localStorage.setItem("player-volume", player.volume);
});