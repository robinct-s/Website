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
        genericHover: "assets/ui/generic-hover.mp3",
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
        pageAbout: "assets/ui/page-about-load.mp3",
        pageInstallation: "assets/ui/page-installation-load.mp3",
        pagePhysical: "assets/ui/page-physical-load.mp3",
        pageLabel: "assets/ui/page-label-load.mp3",
        installationPanel: "assets/ui/installation-load.mp3",
        darkModeOn: "assets/ui/dark-mode-on.mp3",
        lightModeOn: "assets/ui/light-mode-on.mp3"
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
        genericHover: 0.13,
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
        pageAbout: 0.18,
        pageInstallation: 0.18,
        pagePhysical: 0.18,
        pageLabel: 0.18,
        installationPanel: 0.16,
        darkModeOn: 0.2,
        lightModeOn: 0.18
    };
    const IS_MOBILE = window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
    const PARTICLE_QUEUE_LIMIT = IS_MOBILE ? 0 : 12;
    const PARTICLE_QUEUE_GAP_MS = IS_SAFARI ? 90 : 55;
    const PARTICLE_AUDIO_MIN_GAP_MS = IS_SAFARI ? 120 : 75;
    const VISITOR_WHISPER_AUDIO_GAP_MS = IS_MOBILE ? 260 : 90;
    const HOME_PRELOAD_DELAY_MS = 200;
    const IN_PAGE_HOVER_GAP_MS = 95;
    const IN_PAGE_HOVER_RATE_MIN = 0.86;
    const IN_PAGE_HOVER_RATE_MAX = 1.18;
    const IN_PAGE_HOVER_VOL_JITTER = 0.24;
    const GENERIC_HOVER_GAP_MS = 80;
    const SEMITONE_RATIO = Math.pow(2, 1 / 12);
    const IN_WORKS_CLICK_RATE_MIN = 0.97;
    const IN_WORKS_CLICK_RATE_MAX = 1.04;
    const IN_WORKS_CLICK_VOL_JITTER = 0.12;
    const IN_WORKS_CLICK_TAIL_FADE_MS = 110;
    const INTRO_LOGO_SOUND_GAP_MS = 520;
    const INTRO_SOUND_LOCK_MS = 1400;
    const HOME_SOUND_MIN_GAP_MS = 1600;
    const SCROLL_SOUND_MIN_GAP_MS = 180;
    const MOBILE_POOL_SIZE = 2;

    let unlocked = false;
    let mutedForVideoFocus = false;
    let lastSoundPointer = {
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.5,
        at: 0
    };
    const baseSounds = {};
    const particleQueue = [];
    let particleQueueTimer = null;
    const PAGE_SOUND_BY_KEY = {
        home: "pageHome",
        works: "pageWorks",
        mixes: "pageWorks",
        live: "pageLive",
        "sound-design": "pageSoundDesign",
        installation: "pageInstallation",
        physicals: "pagePhysical",
        label: "pageLabel",
        about: "pageAbout",
        visitors: "pageAbout"
    };
    let lastInPageHoverAt = 0;
    let lastGenericHoverAt = 0;
    let lastInPageHoverRate = null;
    let lastIntroLogoSoundAt = 0;
    let lastHomeSoundAt = 0;
    let lastScrollSoundAt = 0;
    let lastParticleAudioQueuedAt = 0;
    let lastVisitorWhisperSoundAt = 0;
    let introSoundLockUntil = 0;
    let lastIntroTouchAt = 0;
    let lastTouchLikeAt = 0;
    let introReadyForGeneralSounds = !document.body.classList.contains("pre-intro");
    const SUPPORTS_POINTER = "PointerEvent" in window;
    const mobileSoundPool = {};
    const mobileSoundIndex = {};
    const primedSounds = new Set();
    const CRITICAL_SOUNDS = new Set([
        "logo",
        "logoRepulse",
        "menu",
        "navClick",
        "player",
        "playerPlay",
        "playerPause",
        "pageHome"
    ]);
    const PAGE_SOUND_TYPES = new Set(Object.values(PAGE_SOUND_BY_KEY));
    const MOBILE_POOLED_SOUNDS = new Set([
        "logo",
        "menu",
        "navClick",
        "player",
        "playerPlay",
        "playerPause"
    ]);

    Object.keys(UI_SOUND_SOURCES).forEach((key) => {
        const audio = new Audio();
        audio.preload = !IS_MOBILE || CRITICAL_SOUNDS.has(key) || PAGE_SOUND_TYPES.has(key) ? "auto" : "metadata";
        audio.src = UI_SOUND_SOURCES[key];
        audio.volume = UI_SOUND_VOLUME[key] ?? 0.2;
        baseSounds[key] = audio;

        if (IS_MOBILE && MOBILE_POOLED_SOUNDS.has(key)) {
            mobileSoundPool[key] = [];
            for (let i = 0; i < MOBILE_POOL_SIZE; i += 1) {
                const pooled = new Audio();
                pooled.preload = "auto";
                pooled.src = UI_SOUND_SOURCES[key];
                pooled.volume = UI_SOUND_VOLUME[key] ?? 0.2;
                mobileSoundPool[key].push(pooled);
            }
        }
    });

    function loadSound(soundType) {
        const audio = baseSounds[soundType];
        if (audio) audio.load();
        const pool = mobileSoundPool[soundType];
        if (pool) {
            pool.forEach((pooled) => pooled.load());
        }
    }

    function getCurrentPageSoundType() {
        const page = document.body && document.body.dataset ? document.body.dataset.page : "";
        return PAGE_SOUND_BY_KEY[page] || "pageHome";
    }

    function scheduleMobileWarmup() {
        if (!IS_MOBILE) return;
        const warmup = () => {
            PAGE_SOUND_TYPES.forEach(loadSound);
            ["streamLink", "inWorksPageClick", "installationPanel"].forEach(loadSound);
        };
        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(warmup, { timeout: 1800 });
        } else {
            window.setTimeout(warmup, 900);
        }
    }

    function primeAudio(audio) {
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
    }

    function unlockAudio() {
        if (unlocked) return;
        unlocked = true;
        // Some browsers need an interaction before short SFX can play reliably.
        const keysToPrime = IS_MOBILE
            ? new Set([...CRITICAL_SOUNDS, getCurrentPageSoundType()])
            : new Set(Object.keys(baseSounds));
        keysToPrime.forEach((key) => {
            const audio = baseSounds[key];
            if (audio) primeAudio(audio);
            primedSounds.add(key);
            if (IS_MOBILE) {
                const pool = mobileSoundPool[key];
                if (pool && pool[0]) primeAudio(pool[0]);
            }
        });
        scheduleMobileWarmup();
    }

    function preloadCriticalSoundFiles() {
        ["logo", "logoRepulse", "pageHome"].forEach((key) => {
            const audio = baseSounds[key];
            if (audio) {
                audio.load();
            }
            if (IS_MOBILE) {
                const pool = mobileSoundPool[key];
                if (pool && pool[0]) {
                    pool[0].load();
                }
            }
        });
    }

    function createSoundInstance(soundType) {
        const base = baseSounds[soundType];
        if (!base) return null;
        if (!IS_MOBILE) return base.cloneNode();
        const pool = mobileSoundPool[soundType];
        if (!pool || pool.length === 0) return base;
        const index = mobileSoundIndex[soundType] || 0;
        const sound = pool[index];
        mobileSoundIndex[soundType] = (index + 1) % pool.length;
        return sound;
    }

    function resetMobileSound(sound) {
        if (!IS_MOBILE) return;
        try {
            sound.pause();
            sound.currentTime = 0;
        } catch {
            // Ignore if we cannot reset the playback position.
        }
    }

    function getSoundType(target) {
        if (!target) return null;
        const visitorsSummary = target.closest(".visitors-panel summary");
        if (visitorsSummary) {
            const panel = visitorsSummary.closest(".visitors-panel");
            if (panel && panel.hasAttribute("open")) return null;
            return "inWorksPageClick";
        }
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

        const genericHoverNode = getGenericHoverNode(target);
        if (genericHoverNode) {
            return { node: genericHoverNode, soundType: "genericHover" };
        }

        const inPageNode = getInPageMenuNode(target);
        if (inPageNode) {
            return { node: inPageNode, soundType: "inPageHover" };
        }
        return null;
    }

    function getGenericHoverNode(target) {
        if (!document.body.classList.contains("dark-mode-desktop")) return null;
        return target.closest("nav a, .dark-mode-toggle, .player button, #home-logo-interact");
    }

    function maybePrimeSound(soundType, sound) {
        if (!unlocked) return;
        if (primedSounds.has(soundType)) return;
        primedSounds.add(soundType);
        if (sound) primeAudio(sound);
    }

    function rememberSoundPoint(event) {
        if (!event) return;
        const source = event.touches && event.touches[0] ? event.touches[0] : event;
        if (!Number.isFinite(source.clientX) || !Number.isFinite(source.clientY)) return;
        lastSoundPointer = {
            x: source.clientX,
            y: source.clientY,
            at: performance.now()
        };
    }

    function getSoundAuraPoint(options = {}) {
        if (Number.isFinite(options.x) && Number.isFinite(options.y)) {
            return { x: options.x, y: options.y };
        }
        const now = performance.now();
        if (lastSoundPointer && now - lastSoundPointer.at < 3500) {
            return { x: lastSoundPointer.x, y: lastSoundPointer.y };
        }
        return {
            x: window.innerWidth * 0.5,
            y: window.innerHeight * 0.5
        };
    }

    function dispatchSoundAura(soundType, options = {}) {
        if (IS_MOBILE) return;
        if (mutedForVideoFocus || options.skipAura) return;
        const point = getSoundAuraPoint(options);
        window.dispatchEvent(new CustomEvent("uisoundaura", {
            detail: {
                soundType,
                source: options.source || "ui",
                x: point.x,
                y: point.y,
                intensity: options.intensity,
                radius: options.radius,
                color: options.color,
                shape: options.shape,
                lineHeight: options.lineHeight
            }
        }));
    }

    function isPlayerSound(soundType) {
        return soundType === "player" || soundType === "playerPlay" || soundType === "playerPause";
    }

    function getPlayerAuraOptions() {
        const player = document.querySelector(".player");
        if (!player) return null;
        const rect = player.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return null;
        return {
            x: rect.left + rect.width * 0.5,
            y: rect.top + rect.height * 0.5,
            source: "player",
            intensity: 0.58,
            radius: Math.max(180, Math.min(360, rect.width * 0.74))
        };
    }

    function pulsePlayerLight() {
        const player = document.querySelector(".player");
        if (!player) return;
        player.classList.remove("is-light-pulsing");
        void player.offsetWidth;
        player.classList.add("is-light-pulsing");
        window.setTimeout(() => {
            player.classList.remove("is-light-pulsing");
        }, 980);
    }

    function playUiClick(soundType, options = {}) {
        if (mutedForVideoFocus) return;
        const clickSound = createSoundInstance(soundType);
        if (!clickSound) return;

        clickSound.volume = UI_SOUND_VOLUME[soundType] ?? 0.2;
        maybePrimeSound(soundType, clickSound);
        resetMobileSound(clickSound);
        if (isPlayerSound(soundType)) {
            pulsePlayerLight();
            const playerAuraOptions = getPlayerAuraOptions() || {};
            dispatchSoundAura(soundType, {
                ...options,
                ...playerAuraOptions
            });
        } else {
            dispatchSoundAura(soundType, options);
        }
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

    function playHomeSoundOnce(options = {}) {
        if (!introReadyForGeneralSounds) return;
        if (!options.ignoreLock && isIntroSoundLocked()) return;
        const now = performance.now();
        if (!options.force && now - lastHomeSoundAt < HOME_SOUND_MIN_GAP_MS) return;
        lastHomeSoundAt = now;
        playPageSound("home");
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
        const sound = createSoundInstance("inPageHover");
        if (!sound) return;
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
        maybePrimeSound("inPageHover", sound);
        resetMobileSound(sound);
        dispatchSoundAura("inPageHover", {
            source: "hover",
            intensity: 0.78,
            radius: 330
        });
        sound.play().catch(() => {
            // Ignore if file is missing or browser blocks.
        });
    }

    function playInWorksClickSound() {
        if (mutedForVideoFocus) return;
        const sound = createSoundInstance("inWorksPageClick");
        if (!sound) return;
        const baseVolume = UI_SOUND_VOLUME.inWorksPageClick ?? 0.18;
        const volumeScale = 1 + randomBetween(-IN_WORKS_CLICK_VOL_JITTER, IN_WORKS_CLICK_VOL_JITTER);
        sound.volume = Math.max(0, Math.min(1, baseVolume * volumeScale));
        sound.playbackRate = randomBetween(IN_WORKS_CLICK_RATE_MIN, IN_WORKS_CLICK_RATE_MAX);
        applyTailFade(sound, IN_WORKS_CLICK_TAIL_FADE_MS);
        maybePrimeSound("inWorksPageClick", sound);
        resetMobileSound(sound);
        dispatchSoundAura("inWorksPageClick", {
            source: "click",
            intensity: 0.76,
            radius: 270
        });
        sound.play().catch(() => {
            // Ignore if file is missing or browser blocks.
        });
    }

    function playPageSound(page) {
        const soundType = PAGE_SOUND_BY_KEY[page];
        if (!soundType) return;
        playUiClick(soundType, {
            source: "page",
            x: window.innerWidth * 0.5,
            y: window.innerHeight * 0.46,
            intensity: 1,
            radius: 460
        });
    }

    function playAboutBeacon(detail) {
        if (!unlocked || mutedForVideoFocus) return;
        const intensity = Math.max(0, Math.min(1, detail && detail.intensity != null ? detail.intensity : 0.5));
        const sound = createSoundInstance("aboutBeacon");
        if (!sound) return;
        sound.playbackRate = 0.76 + intensity * 0.4;
        sound.volume = (UI_SOUND_VOLUME.aboutBeacon ?? 0.17) * (0.42 + intensity * 0.55);
        maybePrimeSound("aboutBeacon", sound);
        resetMobileSound(sound);
        dispatchSoundAura("aboutBeacon", {
            source: "proximity",
            x: detail && detail.x,
            y: detail && detail.y,
            color: detail && detail.color,
            intensity: 0.5 + intensity * 0.35,
            radius: 260 + intensity * 120
        });
        sound.play().catch(() => {
            // Missing file or blocked autoplay should fail silently.
        });
    }

    function playVisitorWhisper(detail) {
        if (!unlocked || mutedForVideoFocus) return;
        const intensity = Math.max(0, Math.min(1, detail && detail.intensity != null ? detail.intensity : 0.7));
        dispatchSoundAura("visitorWhisper", {
            source: "particle",
            x: detail && detail.x,
            y: detail && detail.y,
            color: detail && detail.color,
            intensity: 0.45 + intensity * 0.28,
            radius: 210 + intensity * 80
        });
        const now = performance.now();
        if (now - lastVisitorWhisperSoundAt < VISITOR_WHISPER_AUDIO_GAP_MS) return;
        lastVisitorWhisperSoundAt = now;
        const sound = createSoundInstance("visitorWhisper");
        if (!sound) return;
        sound.playbackRate = 0.58 + intensity * 0.25 + randomBetween(-0.03, 0.03);
        sound.volume = (UI_SOUND_VOLUME.visitorWhisper ?? 0.14) * (0.45 + intensity * 0.42);
        applyTailFade(sound, 140);
        maybePrimeSound("visitorWhisper", sound);
        resetMobileSound(sound);
        sound.play().catch(() => {
            // Missing file or blocked autoplay should fail silently.
        });
    }

    function playVisitorFormationShift(detail) {
        if (!unlocked || mutedForVideoFocus) return;
        const active = !!(detail && detail.active);
        const soundType = active ? "visitorFormationIn" : "visitorFormationOut";
        const sound = createSoundInstance(soundType);
        if (!sound) return;
        sound.playbackRate = active ? 0.78 : 0.95;
        const baseVolume = active
            ? (UI_SOUND_VOLUME.visitorFormationIn ?? 0.16)
            : (UI_SOUND_VOLUME.visitorFormationOut ?? 0.16);
        sound.volume = baseVolume * (active ? 0.9 : 0.78);
        applyTailFade(sound, 180);
        maybePrimeSound(soundType, sound);
        resetMobileSound(sound);
        dispatchSoundAura(soundType, {
            source: "formation",
            x: window.innerWidth * 0.5,
            y: window.innerHeight * 0.58,
            intensity: active ? 0.9 : 0.65,
            radius: active ? 520 : 380
        });
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
        const particleSound = createSoundInstance("particle");
        if (particleSound) {
            const intensity = Math.max(0, Math.min(1, eventData.intensity ?? 0.5));
            const rate = 0.88 + intensity * 0.26;
            const volume = (UI_SOUND_VOLUME.particle ?? 0.12) * (0.65 + intensity * 0.55);
            particleSound.playbackRate = rate;
            particleSound.volume = volume;
            maybePrimeSound("particle", particleSound);
            resetMobileSound(particleSound);
            particleSound.play().catch(() => {
                // Missing file or blocked autoplay should fail silently.
            });
        }

        particleQueueTimer = window.setTimeout(flushParticleQueue, PARTICLE_QUEUE_GAP_MS);
    }

    function enqueueParticleSound(eventData) {
        if (IS_MOBILE) return;
        if (mutedForVideoFocus) return;
        if (!unlocked) return;
        const intensity = Math.max(0, Math.min(1, eventData && eventData.intensity != null ? eventData.intensity : 0.5));
        dispatchSoundAura("particle", {
            source: "particle",
            intensity: 0.42 + intensity * 0.34,
            radius: 190 + intensity * 120
        });
        const now = performance.now();
        if (now - lastParticleAudioQueuedAt < PARTICLE_AUDIO_MIN_GAP_MS) return;
        lastParticleAudioQueuedAt = now;
        if (particleQueue.length >= PARTICLE_QUEUE_LIMIT) return;
        particleQueue.push(eventData || {});
        if (particleQueueTimer === null) {
            flushParticleQueue();
        }
    }

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("wheel", unlockAudio, { once: true, passive: true });
    window.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
    window.addEventListener("DOMContentLoaded", preloadCriticalSoundFiles, { once: true });

    function handleUiClickEvent(event) {
        rememberSoundPoint(event);
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
        if (soundType.startsWith("player") && (!introReadyForGeneralSounds || isIntroSoundLocked())) return;
        if (!introReadyForGeneralSounds && soundType !== "logo") return;
        if (soundType !== "logo" && isIntroSoundLocked()) return;
        playUiClick(soundType);
    }

    document.addEventListener("click", (event) => {
        rememberSoundPoint(event);
        if (lastTouchLikeAt && performance.now() - lastTouchLikeAt < 700) return;
        unlockAudio();
        handleUiClickEvent(event);
    });

    if (SUPPORTS_POINTER) {
        document.addEventListener("pointerdown", (event) => {
            rememberSoundPoint(event);
            if (event.pointerType && event.pointerType !== "mouse") {
                lastTouchLikeAt = performance.now();
                unlockAudio();
                handleUiClickEvent(event);
            }
        }, { passive: true });
    } else {
        document.addEventListener("touchstart", (event) => {
            rememberSoundPoint(event);
            lastTouchLikeAt = performance.now();
            unlockAudio();
            handleUiClickEvent(event);
        }, { passive: true });
    }

    document.addEventListener("touchstart", (event) => {
        const target = event.target;
        if (!target || !target.closest) return;
        if (!target.closest("#intro-logo-trigger")) return;
        lastIntroTouchAt = performance.now();
        lastTouchLikeAt = lastIntroTouchAt;
        rememberSoundPoint(event);
        unlockAudio();
        lockIntroSounds();
        if (shouldSkipIntroLogoSound()) return;
        playUiClick("logo");
    }, { passive: true });

    document.addEventListener("pointerover", (event) => {
        if (event.pointerType && event.pointerType !== "mouse") return;
        rememberSoundPoint(event);
        const hoverTarget = getHoverSoundTarget(event.target);
        if (!hoverTarget) return;
        const hoverNode = hoverTarget.node;
        const related = event.relatedTarget;
        if (related && hoverNode.contains(related)) return;

        const now = performance.now();
        if (hoverTarget.soundType === "inPageHover") {
            if (now - lastInPageHoverAt < IN_PAGE_HOVER_GAP_MS) return;
            lastInPageHoverAt = now;
            playInPageHoverSound();
            return;
        }
        if (hoverTarget.soundType === "genericHover") {
            if (!introReadyForGeneralSounds || isIntroSoundLocked()) return;
            if (now - lastGenericHoverAt < GENERIC_HOVER_GAP_MS) return;
            lastGenericHoverAt = now;
        } else {
            if (now - lastInPageHoverAt < IN_PAGE_HOVER_GAP_MS) return;
            lastInPageHoverAt = now;
        }
        const skipAura = hoverTarget.soundType === "streamLinkHover" || hoverTarget.soundType === "genericHover";
        playUiClick(hoverTarget.soundType, {
            source: "hover",
            intensity: 0.78,
            radius: 330,
            skipAura
        });
    });

    window.addEventListener("particleinterference", (event) => {
        enqueueParticleSound(event && event.detail ? event.detail : {});
    });

    window.addEventListener("darkmodesound", (event) => {
        const detail = event && event.detail ? event.detail : {};
        const soundType = detail.enabled ? "darkModeOn" : "lightModeOn";
        unlockAudio();
        playUiClick(soundType, {
            source: "toggle",
            intensity: detail.enabled ? 0.9 : 0.58,
            radius: detail.enabled ? 420 : 300,
            color: detail.enabled ? "126, 174, 124" : "232, 244, 226"
        });
    });

    window.addEventListener("wheel", (event) => {
        if (!unlocked || mutedForVideoFocus) return;
        const now = performance.now();
        if (now - lastScrollSoundAt < SCROLL_SOUND_MIN_GAP_MS) return;
        lastScrollSoundAt = now;

        const sound = createSoundInstance("scrollWheel");
        if (!sound) return;
        const delta = Math.min(1, Math.abs(event.deltaY || 0) / 140);
        const scroller = document.getElementById("content");
        const rect = scroller ? scroller.getBoundingClientRect() : null;
        const scrollable = scroller ? Math.max(0, scroller.scrollHeight - scroller.clientHeight) : 0;
        const progress = scrollable > 0 ? scroller.scrollTop / scrollable : 0.5;
        const x = rect ? rect.right - 14 : window.innerWidth - 14;
        const y = rect ? rect.top + rect.height * (0.18 + progress * 0.64) : window.innerHeight * 0.5;
        const lineHeight = rect ? Math.min(rect.height * 0.86, window.innerHeight - 56) : window.innerHeight * 0.78;
        sound.playbackRate = 0.92 + delta * 0.24 + randomBetween(-0.03, 0.03);
        sound.volume = (UI_SOUND_VOLUME.scrollWheel ?? 0.11) * (0.72 + delta * 0.5);
        maybePrimeSound("scrollWheel", sound);
        resetMobileSound(sound);
        dispatchSoundAura("scrollWheel", {
            source: "scroll",
            shape: "scrollbar",
            x,
            y,
            intensity: 0.34 + delta * 0.3,
            radius: 180 + delta * 90,
            lineHeight
        });
        sound.play().catch(() => {
            // Ignore if file is missing or browser blocks.
        });
    }, { passive: true });

    window.addEventListener("pagechange", (event) => {
        if (!unlocked) return;
        const page = event && event.detail && event.detail.page;
        if (!page) return;
        // Home plays earlier from pagewillchange to feel more immediate.
        if (page === "home") {
            if (!introReadyForGeneralSounds || isIntroSoundLocked()) return;
            window.setTimeout(() => {
                playHomeSoundOnce();
            }, 220);
            return;
        }
        if (!introReadyForGeneralSounds || isIntroSoundLocked()) return;
        playPageSound(page);
    });

    window.addEventListener("pagewillchange", (event) => {
        if (!unlocked) return;
        const detail = event && event.detail ? event.detail : null;
        if (detail && detail.page) {
            const nextSound = PAGE_SOUND_BY_KEY[detail.page];
            if (nextSound) loadSound(nextSound);
        }
        if (!detail || detail.page !== "home") return;
        // Home gets a small head start so it lands before the visual reset finishes.
        window.setTimeout(() => {
            playHomeSoundOnce();
        }, HOME_PRELOAD_DELAY_MS);
    });

    window.addEventListener("introanimationcomplete", (event) => {
        if (!unlocked) return;
        const page = event && event.detail && event.detail.page;
        if (page !== "home") return;
        introReadyForGeneralSounds = true;
        lockIntroSounds();
        const delayMs = IS_MOBILE ? 0 : 120;
        window.setTimeout(() => {
            playHomeSoundOnce({ ignoreLock: true, force: IS_MOBILE });
        }, delayMs);
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
