(function () {
    const UI_SOUND_SOURCES = {
        menu: "assets/ui/menu-click.mp3",
        logo: "assets/ui/logo-click.mp3",
        player: "assets/ui/player-click.mp3",
        particle: "assets/ui/particle-interference.mp3",
        aboutBeacon: "assets/ui/about-beacon.mp3",
        pageHome: "assets/ui/page-home-load.mp3",
        pageWorks: "assets/ui/page-works-load.mp3",
        pageLive: "assets/ui/page-live-load.mp3",
        pageSoundDesign: "assets/ui/page-sound-design-load.mp3",
        pageAbout: "assets/ui/page-about-load.mp3"
    };
    const UI_SOUND_VOLUME = {
        menu: 0.2,
        logo: 0.24,
        player: 0.2,
        particle: 0.12,
        aboutBeacon: 0.17,
        pageHome: 0.18,
        pageWorks: 0.18,
        pageLive: 0.18,
        pageSoundDesign: 0.18,
        pageAbout: 0.18
    };
    const PARTICLE_QUEUE_LIMIT = 12;
    const PARTICLE_QUEUE_GAP_MS = 55;
    const HOME_PRELOAD_DELAY_MS = 200;

    let unlocked = false;
    let mutedForVideoFocus = false;
    const baseSounds = {};
    const particleQueue = [];
    let particleQueueTimer = null;
    const PAGE_SOUND_BY_KEY = {
        home: "pageHome",
        works: "pageWorks",
        live: "pageLive",
        "sound-design": "pageSoundDesign",
        about: "pageAbout"
    };

    Object.keys(UI_SOUND_SOURCES).forEach((key) => {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = UI_SOUND_SOURCES[key];
        audio.volume = UI_SOUND_VOLUME[key] ?? 0.2;
        baseSounds[key] = audio;
    });

    function unlockAudio() {
        if (unlocked) return;
        unlocked = true;
        // Some browsers need an interaction before short SFX can play reliably.
        Object.values(baseSounds).forEach((audio) => {
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
            }).catch(() => {
                // Missing file or blocked autoplay should fail silently.
            });
        });
    }

    function getSoundType(target) {
        if (!target) return null;
        if (target.closest("#intro-logo-trigger")) return "logo";
        if (target.closest(".player button")) return "player";
        if (target.closest("nav a")) return "menu";

        const customTypeNode = target.closest("[data-ui-sound]");
        if (customTypeNode) return customTypeNode.getAttribute("data-ui-sound");
        return null;
    }

    function playUiClick(soundType) {
        if (mutedForVideoFocus) return;
        const base = baseSounds[soundType];
        if (!base) return;

        const clickSound = base.cloneNode();
        clickSound.volume = UI_SOUND_VOLUME[soundType] ?? 0.2;
        clickSound.play().catch(() => {
            // Ignore if file is missing or browser blocks.
        });
    }

    function playPageSound(page) {
        const soundType = PAGE_SOUND_BY_KEY[page];
        if (!soundType) return;
        playUiClick(soundType);
    }

    function playAboutBeacon(detail) {
        if (!unlocked || mutedForVideoFocus) return;
        const intensity = Math.max(0, Math.min(1, detail && detail.intensity != null ? detail.intensity : 0.5));
        const base = baseSounds.aboutBeacon;
        if (!base) return;
        const sound = base.cloneNode();
        sound.playbackRate = 0.76 + intensity * 0.4;
        sound.volume = (UI_SOUND_VOLUME.aboutBeacon ?? 0.17) * (0.42 + intensity * 0.55);
        sound.play().catch(() => {
            // Missing file or blocked autoplay should fail silently.
        });
    }

    function flushParticleQueue() {
        if (particleQueue.length === 0) {
            particleQueueTimer = null;
            return;
        }

        const eventData = particleQueue.shift();
        const base = baseSounds.particle;
        if (base) {
            const particleSound = base.cloneNode();
            const intensity = Math.max(0, Math.min(1, eventData.intensity ?? 0.5));
            const rate = 0.88 + intensity * 0.26;
            const volume = (UI_SOUND_VOLUME.particle ?? 0.12) * (0.65 + intensity * 0.55);
            particleSound.playbackRate = rate;
            particleSound.volume = volume;
            particleSound.play().catch(() => {
                // Missing file or blocked autoplay should fail silently.
            });
        }

        particleQueueTimer = window.setTimeout(flushParticleQueue, PARTICLE_QUEUE_GAP_MS);
    }

    function enqueueParticleSound(eventData) {
        if (mutedForVideoFocus) return;
        if (!unlocked) return;
        if (particleQueue.length >= PARTICLE_QUEUE_LIMIT) return;
        particleQueue.push(eventData || {});
        if (particleQueueTimer === null) {
            flushParticleQueue();
        }
    }

    window.addEventListener("pointerdown", unlockAudio, { once: true });

    document.addEventListener("click", (event) => {
        const soundType = getSoundType(event.target);
        if (!soundType) return;
        playUiClick(soundType);
    });

    window.addEventListener("particleinterference", (event) => {
        enqueueParticleSound(event && event.detail ? event.detail : {});
    });

    window.addEventListener("pagechange", (event) => {
        if (!unlocked) return;
        const page = event && event.detail && event.detail.page;
        if (!page) return;
        // Home plays earlier from pagewillchange to feel more immediate.
        if (page === "home") return;
        playPageSound(page);
    });

    window.addEventListener("pagewillchange", (event) => {
        if (!unlocked) return;
        const detail = event && event.detail ? event.detail : null;
        if (!detail || detail.page !== "home") return;
        // app.js waits 1200ms before loading nav pages; 200ms delay lands ~1s earlier.
        window.setTimeout(() => {
            playPageSound("home");
        }, HOME_PRELOAD_DELAY_MS);
    });

    window.addEventListener("introanimationcomplete", (event) => {
        if (!unlocked) return;
        const page = event && event.detail && event.detail.page;
        if (page !== "home") return;
        playPageSound("home");
    });

    window.addEventListener("aboutbeaconproximity", (event) => {
        playAboutBeacon(event && event.detail ? event.detail : {});
    });

    window.addEventListener("sdvideomodechange", (event) => {
        mutedForVideoFocus = !!(event && event.detail && event.detail.active);
        if (!mutedForVideoFocus) return;
        particleQueue.length = 0;
        if (particleQueueTimer !== null) {
            clearTimeout(particleQueueTimer);
            particleQueueTimer = null;
        }
    });
})();
