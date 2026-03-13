(function () {
    const ua = navigator.userAgent || "";
    const vendor = navigator.vendor || "";
    const IS_SAFARI = /Apple/i.test(vendor) &&
        /Safari/i.test(ua) &&
        !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS|SamsungBrowser/i.test(ua);
    const UI_SOUND_SOURCES = {
        menu: "assets/ui/menu-click.mp3",
        navClick: "assets/ui/nav-click.mp3",
        inPageHover: "assets/ui/in-page-hover.mp3",
        releaseCoverHover: "assets/ui/release-cover-hover.mp3",
        streamLinkHover: "assets/ui/stream-link-hover.mp3",
        inWorksPageClick: "assets/ui/in-works-page-click.mp3",
        streamLink: "assets/ui/stream-link-click.mp3",
        worksTab: "assets/ui/menu-click.mp3",
        scrollWheel: "assets/ui/scroll-wheel.mp3",
        logo: "assets/ui/logo-click.mp3",
        logoRepulse: "assets/ui/logo-repulse.mp3",
        player: "assets/ui/player-click.mp3",
        playerPlay: "assets/ui/player-play.mp3",
        playerPause: "assets/ui/player-pause.mp3",
        particle: "assets/ui/particle-interference.mp3",
        aboutBeacon: "assets/ui/about-beacon.mp3",
        visitorWhisper: "assets/ui/visitor-particle-hover.mp3",
        visitorFormationIn: "assets/ui/visitor-formation-in.mp3",
        visitorFormationOut: "assets/ui/visitor-formation-out.mp3",
        pageHome: "assets/ui/page-home-load.mp3",
        pageWorks: "assets/ui/page-works-load.mp3",
        pageLive: "assets/ui/page-live-load.mp3",
        pageSoundDesign: "assets/ui/page-sound-design-load.mp3",
        pageAbout: "assets/ui/page-about-load.mp3"
    };
    const UI_SOUND_VOLUME = {
        menu: 0.2,
        navClick: 0.2,
        inPageHover: 0.12,
        releaseCoverHover: 0.16,
        streamLinkHover: 0.17,
        inWorksPageClick: 0.18,
        streamLink: 0.2,
        worksTab: 0.18,
        scrollWheel: 0.11,
        logo: 0.24,
        logoRepulse: 0.2,
        player: 0.2,
        playerPlay: 0.2,
        playerPause: 0.2,
        particle: 0.12,
        aboutBeacon: 0.17,
        visitorWhisper: 0.2,
        visitorFormationIn: 0.16,
        visitorFormationOut: 0.16,
        pageHome: 0.18,
        pageWorks: 0.18,
        pageLive: 0.18,
        pageSoundDesign: 0.18,
        pageAbout: 0.18
    };
    const PARTICLE_QUEUE_LIMIT = 12;
    const PARTICLE_QUEUE_GAP_MS = IS_SAFARI ? 90 : 55;
    const HOME_PRELOAD_DELAY_MS = 200;
    const IN_PAGE_HOVER_GAP_MS = 95;
    const IN_PAGE_HOVER_RATE_MIN = 0.86;
    const IN_PAGE_HOVER_RATE_MAX = 1.18;
    const IN_PAGE_HOVER_VOL_JITTER = 0.24;
    const SEMITONE_RATIO = Math.pow(2, 1 / 12);
    const IN_WORKS_CLICK_RATE_MIN = 0.97;
    const IN_WORKS_CLICK_RATE_MAX = 1.04;
    const IN_WORKS_CLICK_VOL_JITTER = 0.12;
    const IN_WORKS_CLICK_TAIL_FADE_MS = 110;
    const INTRO_LOGO_SOUND_GAP_MS = 520;
    const INTRO_SOUND_LOCK_MS = 1400;

    let unlocked = false;
    let mutedForVideoFocus = false;
    const baseSounds = {};
    const particleQueue = [];
    let particleQueueTimer = null;
    const PAGE_SOUND_BY_KEY = {
        home: "pageHome",
        works: "pageWorks",
        mixes: "pageWorks",
        live: "pageLive",
        "sound-design": "pageSoundDesign",
        about: "pageAbout",
        visitors: "pageAbout"
    };
    let lastInPageHoverAt = 0;
    let lastInPageHoverRate = null;
    let lastIntroLogoSoundAt = 0;
    let introSoundLockUntil = 0;
    let lastIntroTouchAt = 0;
    let introReadyForGeneralSounds = !document.body.classList.contains("pre-intro");

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
            const prevVolume = audio.volume;
            const prevMuted = audio.muted;
            audio.muted = true;
            audio.volume = 0;
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
                audio.muted = prevMuted;
                audio.volume = prevVolume;
            }).catch(() => {
                // Missing file or blocked autoplay should fail silently.
                audio.muted = prevMuted;
                audio.volume = prevVolume;
            });
        });
    }

    function getSoundType(target) {
        if (!target) return null;
        if (target.closest("#intro-logo-trigger")) return "logo";
        if (target.closest("#play-pause")) {
            const playPauseBtn = document.getElementById("play-pause");
            const state = playPauseBtn && playPauseBtn.dataset ? playPauseBtn.dataset.state : "";
            return state === "playing" ? "playerPlay" : "playerPause";
        }
        if (target.closest(".player button")) return "player";
        if (target.closest("nav a")) return "menu";

        const customTypeNode = target.closest("[data-ui-sound]");
        if (customTypeNode) return customTypeNode.getAttribute("data-ui-sound");
        return null;
    }

    function getNavSoundType(target) {
        const navLink = target && target.closest ? target.closest("nav a[data-link]") : null;
        if (!navLink) return null;
        return "navClick";
    }

    function getInPageMenuNode(target) {
        if (!target || !target.closest) return null;
        return target.closest(".release-card summary, .sd-card summary, .live-item, .about-link, .mix-cover-link, .mix-title, .mix-open-link");
    }

    function getWorksMenuNode(target) {
        if (!target || !target.closest) return null;
        return target.closest(".release-card summary");
    }

    function getHoverSoundTarget(target) {
        if (!target || !target.closest) return null;

        const customHoverNode = target.closest("[data-ui-hover-sound]");
        if (customHoverNode) {
            const soundType = customHoverNode.getAttribute("data-ui-hover-sound");
            if (soundType) {
                return { node: customHoverNode, soundType };
            }
        }

        const inPageNode = getInPageMenuNode(target);
        if (inPageNode) {
            return { node: inPageNode, soundType: "inPageHover" };
        }
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

    function shouldSkipIntroLogoSound() {
        const now = performance.now();
        if (now - lastIntroLogoSoundAt < INTRO_LOGO_SOUND_GAP_MS) return true;
        lastIntroLogoSoundAt = now;
        return false;
    }

    function lockIntroSounds() {
        introSoundLockUntil = performance.now() + INTRO_SOUND_LOCK_MS;
    }

    function isIntroSoundLocked() {
        return performance.now() < introSoundLockUntil;
    }

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function applyTailFade(sound, fadeMs) {
        const startVolume = sound.volume;
        const beginFade = () => {
            const fadeStartAt = Math.max(0, sound.duration * 1000 - fadeMs);
            window.setTimeout(() => {
                const startedAt = performance.now();
                const step = () => {
                    const elapsed = performance.now() - startedAt;
                    const t = Math.max(0, Math.min(1, elapsed / fadeMs));
                    sound.volume = startVolume * (1 - t);
                    if (t < 1 && !sound.paused) {
                        requestAnimationFrame(step);
                    }
                };
                step();
            }, fadeStartAt);
        };

        if (Number.isFinite(sound.duration) && sound.duration > 0) {
            beginFade();
        } else {
            sound.addEventListener("loadedmetadata", beginFade, { once: true });
        }
    }

    function playInPageHoverSound() {
        if (mutedForVideoFocus) return;
        const base = baseSounds.inPageHover;
        if (!base) return;
        const sound = base.cloneNode();
        const baseVolume = UI_SOUND_VOLUME.inPageHover ?? 0.12;
        const volumeScale = 1 + randomBetween(-IN_PAGE_HOVER_VOL_JITTER, IN_PAGE_HOVER_VOL_JITTER);
        sound.volume = Math.max(0, Math.min(1, baseVolume * volumeScale));
        let rate = randomBetween(IN_PAGE_HOVER_RATE_MIN, IN_PAGE_HOVER_RATE_MAX);
        if (lastInPageHoverRate != null) {
            const ranges = [];
            const downMin = IN_PAGE_HOVER_RATE_MIN;
            const downMax = Math.min(IN_PAGE_HOVER_RATE_MAX, lastInPageHoverRate / SEMITONE_RATIO);
            if (downMax >= downMin) ranges.push([downMin, downMax]);

            const upMin = Math.max(IN_PAGE_HOVER_RATE_MIN, lastInPageHoverRate * SEMITONE_RATIO);
            const upMax = IN_PAGE_HOVER_RATE_MAX;
            if (upMax >= upMin) ranges.push([upMin, upMax]);

            if (ranges.length > 0) {
                const selected = ranges[Math.floor(Math.random() * ranges.length)];
                rate = randomBetween(selected[0], selected[1]);
            }
        }
        sound.playbackRate = rate;
        lastInPageHoverRate = rate;
        sound.play().catch(() => {
            // Ignore if file is missing or browser blocks.
        });
    }

    function playInWorksClickSound() {
        if (mutedForVideoFocus) return;
        const base = baseSounds.inWorksPageClick;
        if (!base) return;
        const sound = base.cloneNode();
        const baseVolume = UI_SOUND_VOLUME.inWorksPageClick ?? 0.18;
        const volumeScale = 1 + randomBetween(-IN_WORKS_CLICK_VOL_JITTER, IN_WORKS_CLICK_VOL_JITTER);
        sound.volume = Math.max(0, Math.min(1, baseVolume * volumeScale));
        sound.playbackRate = randomBetween(IN_WORKS_CLICK_RATE_MIN, IN_WORKS_CLICK_RATE_MAX);
        applyTailFade(sound, IN_WORKS_CLICK_TAIL_FADE_MS);
        sound.play().catch(() => {
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

    function playVisitorWhisper(detail) {
        if (!unlocked || mutedForVideoFocus) return;
        const intensity = Math.max(0, Math.min(1, detail && detail.intensity != null ? detail.intensity : 0.7));
        const base = baseSounds.visitorWhisper;
        if (!base) return;
        const sound = base.cloneNode();
        sound.playbackRate = 0.58 + intensity * 0.25 + randomBetween(-0.03, 0.03);
        sound.volume = (UI_SOUND_VOLUME.visitorWhisper ?? 0.14) * (0.45 + intensity * 0.42);
        applyTailFade(sound, 140);
        sound.play().catch(() => {
            // Missing file or blocked autoplay should fail silently.
        });
    }

    function playVisitorFormationShift(detail) {
        if (!unlocked || mutedForVideoFocus) return;
        const active = !!(detail && detail.active);
        const base = active ? baseSounds.visitorFormationIn : baseSounds.visitorFormationOut;
        if (!base) return;
        const sound = base.cloneNode();
        sound.playbackRate = active ? 0.78 : 0.95;
        const baseVolume = active
            ? (UI_SOUND_VOLUME.visitorFormationIn ?? 0.16)
            : (UI_SOUND_VOLUME.visitorFormationOut ?? 0.16);
        sound.volume = baseVolume * (active ? 0.9 : 0.78);
        applyTailFade(sound, 180);
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
    window.addEventListener("wheel", unlockAudio, { once: true, passive: true });
    window.addEventListener("touchstart", unlockAudio, { once: true, passive: true });

    document.addEventListener("click", (event) => {
        if (lastIntroTouchAt && performance.now() - lastIntroTouchAt < 700) return;
        const navSoundType = getNavSoundType(event.target);
        if (navSoundType) {
            if (!introReadyForGeneralSounds || isIntroSoundLocked()) return;
            playUiClick(navSoundType);
            return;
        }

        const worksNode = getWorksMenuNode(event.target);
        if (worksNode) {
            if (!introReadyForGeneralSounds || isIntroSoundLocked()) return;
            playInWorksClickSound();
            return;
        }

        const soundType = getSoundType(event.target);
        if (!soundType) return;
        if (soundType === "logo" && shouldSkipIntroLogoSound()) return;
        if (!introReadyForGeneralSounds && soundType !== "logo") return;
        if (soundType !== "logo" && isIntroSoundLocked()) return;
        playUiClick(soundType);
    });

    document.addEventListener("touchstart", (event) => {
        const target = event.target;
        if (!target || !target.closest) return;
        if (!target.closest("#intro-logo-trigger")) return;
        lastIntroTouchAt = performance.now();
        lockIntroSounds();
        if (shouldSkipIntroLogoSound()) return;
        playUiClick("logo");
    }, { passive: true });

    document.addEventListener("pointerover", (event) => {
        if (event.pointerType && event.pointerType !== "mouse") return;
        const hoverTarget = getHoverSoundTarget(event.target);
        if (!hoverTarget) return;
        const hoverNode = hoverTarget.node;
        const related = event.relatedTarget;
        if (related && hoverNode.contains(related)) return;

        const now = performance.now();
        if (now - lastInPageHoverAt < IN_PAGE_HOVER_GAP_MS) return;
        lastInPageHoverAt = now;
        if (hoverTarget.soundType === "inPageHover") {
            playInPageHoverSound();
            return;
        }
        playUiClick(hoverTarget.soundType);
    });

    window.addEventListener("particleinterference", (event) => {
        enqueueParticleSound(event && event.detail ? event.detail : {});
    });

    window.addEventListener("wheel", (event) => {
        if (!unlocked || mutedForVideoFocus) return;

        const base = baseSounds.scrollWheel;
        if (!base) return;
        const sound = base.cloneNode();
        const delta = Math.min(1, Math.abs(event.deltaY || 0) / 140);
        sound.playbackRate = 0.92 + delta * 0.24 + randomBetween(-0.03, 0.03);
        sound.volume = (UI_SOUND_VOLUME.scrollWheel ?? 0.11) * (0.72 + delta * 0.5);
        sound.play().catch(() => {
            // Ignore if file is missing or browser blocks.
        });
    }, { passive: true });

    window.addEventListener("pagechange", (event) => {
        if (!unlocked) return;
        const page = event && event.detail && event.detail.page;
        if (!page) return;
        // Home plays earlier from pagewillchange to feel more immediate.
        if (page === "home") return;
        if (!introReadyForGeneralSounds || isIntroSoundLocked()) return;
        playPageSound(page);
    });

    window.addEventListener("pagewillchange", (event) => {
        if (!unlocked) return;
        const detail = event && event.detail ? event.detail : null;
        if (!detail || detail.page !== "home") return;
        // Mobile already gets a timed home cue from animation flow; skip preload to avoid duplicate.
        if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) return;
        // app.js waits 1200ms before loading nav pages; 200ms delay lands ~1s earlier.
        window.setTimeout(() => {
            playPageSound("home");
        }, HOME_PRELOAD_DELAY_MS);
    });

    window.addEventListener("introanimationcomplete", (event) => {
        if (!unlocked) return;
        const page = event && event.detail && event.detail.page;
        if (page !== "home") return;
        introReadyForGeneralSounds = true;
        lockIntroSounds();
        playPageSound("home");
    });

    window.addEventListener("logorepulse", () => {
        if (!unlocked) return;
        if (!introReadyForGeneralSounds || isIntroSoundLocked()) return;
        playUiClick("logoRepulse");
    });

    window.addEventListener("workstabchange", () => {
        if (!unlocked) return;
        if (!introReadyForGeneralSounds || isIntroSoundLocked()) return;
        playUiClick("worksTab");
    });

    window.addEventListener("aboutbeaconproximity", (event) => {
        if (!introReadyForGeneralSounds || isIntroSoundLocked()) return;
        playAboutBeacon(event && event.detail ? event.detail : {});
    });

    window.addEventListener("visitorparticlehover", (event) => {
        if (!introReadyForGeneralSounds || isIntroSoundLocked()) return;
        playVisitorWhisper(event && event.detail ? event.detail : {});
    });

    window.addEventListener("visitorformationchange", (event) => {
        if (!introReadyForGeneralSounds || isIntroSoundLocked()) return;
        playVisitorFormationShift(event && event.detail ? event.detail : {});
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
