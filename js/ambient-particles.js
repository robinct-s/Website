(function () {
    const host = document.getElementById("particles-js");
    if (!host) return;
    const ua = navigator.userAgent || "";
    const vendor = navigator.vendor || "";
    const IS_SAFARI = /Apple/i.test(vendor) &&
        /Safari/i.test(ua) &&
        !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS|SamsungBrowser/i.test(ua);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    host.appendChild(canvas);

    const pointer = { x: 0, y: 0, active: false };
    const brandHero = document.querySelector(".brand-hero");
    const brandLogo = document.querySelector(".brand-hero .logo");
    const particles = [];
    const particleCount = IS_SAFARI ? 58 : 90;
    const INTERFERENCE_MIN_INTERVAL_MS = IS_SAFARI ? 120 : 75;
    const BEACON_PROXIMITY_MIN_INTERVAL_MS = 120;
    const TARGET_FRAME_MS = IS_SAFARI ? 22 : 0;
    const SCROLL_INPUT_GAIN = 0.0135;
    const SCROLL_FORCE_MAX = 6.8;
    const PARTICLE_SCROLL_INFLUENCE = 1.45;
    const BEACON_SCROLL_INFLUENCE = 0.7;
    const BASE_BLACK = { r: 17, g: 17, b: 17 };
    const NATURAL_GREEN = { r: 126, g: 174, b: 124 };
    const WHITE = { r: 255, g: 255, b: 255 };
    const NATURAL_YELLOW = { r: 223, g: 197, b: 116 };
    let width = 0;
    let height = 0;
    let rafId = null;
    let currentPage = "home";
    let lastInterferenceAt = 0;
    let lastBeaconProximityAt = 0;
    let lastFrameAt = 0;
    let scrollForceY = 0;
    let pointerOverUi = false;
    let beacon = null;
    let tintFrame = 0;

    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    function clamp01(value) {
        return Math.max(0, Math.min(1, value));
    }

    function mixChannel(a, b, t) {
        return Math.round(a + (b - a) * t);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function isIntroLockedFormation() {
        return document.body.classList.contains("pre-intro") &&
            !document.body.classList.contains("intro-clicked");
    }

    function createParticle(index) {
        return {
            i: index,
            x: rand(0, width),
            y: rand(0, height),
            radius: rand(0.9, 3.2),
            alpha: rand(0.18, 0.48),
            vx: rand(-0.16, 0.16),
            vy: rand(-0.12, 0.2),
            drift: rand(0.0006, 0.0022),
            phase: rand(0, Math.PI * 2),
            jitterX: rand(-26, 26),
            jitterY: rand(-26, 26),
            homeAngle: (index / particleCount) * Math.PI * 2 + rand(-0.15, 0.15),
            homeRadius: rand(0.2, 1)
        };
    }

    function createBeacon() {
        return {
            x: width * 0.76,
            y: height * 0.46,
            vx: rand(-0.28, 0.28),
            vy: rand(-0.24, 0.24),
            phase: rand(0, Math.PI * 2),
            drift: rand(0.0011, 0.0021),
            radius: rand(9.4, 12.2),
            alpha: 0.84,
            nearMix: 0
        };
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        if (!pointer.active) {
            pointer.x = width * 0.5;
            pointer.y = height * 0.5;
        }
    }

    function seed() {
        particles.length = 0;
        for (let i = 0; i < particleCount; i += 1) {
            particles.push(createParticle(i));
        }
        beacon = createBeacon();
    }

    function getFormationTarget(p, time) {
        const cx = width * 0.5;
        const cy = height * 0.5;
        const n = p.i / particleCount;
        const sway = Math.sin(time * 0.00085 + p.phase) * 10;
        const breathe = Math.sin(time * 0.0011 + p.phase * 0.8) * 14;
        let tx = cx;
        let ty = cy;

        switch (currentPage) {
            case "works": {
                const spread = (n - 0.5) * width * 0.72;
                tx = cx + spread;
                ty = cy + spread * 0.22 + Math.sin(n * 20 + time * 0.0009) * 24;
                break;
            }
            case "live": {
                const ring = Math.min(width, height) * (0.2 + p.homeRadius * 0.23);
                const angle = p.homeAngle + time * 0.0002;
                tx = cx + Math.cos(angle) * ring;
                ty = cy + Math.sin(angle) * ring;
                break;
            }
            case "sound-design": {
                const xBand = (n - 0.5) * width * 0.82;
                tx = cx + xBand;
                ty = cy + Math.sin(n * Math.PI * 5 + time * 0.0012) * (height * 0.14);
                break;
            }
            case "about": {
                const ribbonPhase = n * Math.PI * 9 + time * 0.0012;
                const rightCenter = width * 0.72;
                const yBand = (n - 0.5) * height * 0.9;
                tx = rightCenter +
                    Math.sin(ribbonPhase) * (width * 0.07) +
                    Math.sin(ribbonPhase * 0.4) * (width * 0.05);
                ty = cy + yBand + Math.cos(ribbonPhase * 0.55) * 34;
                break;
            }
            case "home":
            default: {
                if (isIntroLockedFormation()) {
                    const ring = Math.min(width, height) * (0.045 + p.homeRadius * 0.06);
                    const angle = p.homeAngle + time * 0.00035;
                    tx = cx + Math.cos(angle) * ring;
                    ty = cy + Math.sin(angle) * ring;
                } else {
                    const cloud = Math.min(width, height) * (0.1 + p.homeRadius * 0.28);
                    tx = cx + Math.cos(p.homeAngle) * cloud;
                    ty = cy + Math.sin(p.homeAngle) * cloud * 0.72;
                }
                break;
            }
        }

        return {
            x: tx + p.jitterX * 0.24 + sway,
            y: ty + p.jitterY * 0.24 + breathe
        };
    }

    function updateAboutBeacon(time) {
        if (!beacon || currentPage !== "about") return;

        beacon.phase += beacon.drift;
        const cx = width * 0.77;
        const cy = height * 0.5;
        const orbitX = Math.cos(time * 0.00037 + beacon.phase) * (width * 0.12);
        const orbitY = Math.sin(time * 0.00051 + beacon.phase * 0.7) * (height * 0.26);
        const tx = cx + orbitX;
        const ty = cy + orbitY;
        const toTargetX = (tx - beacon.x) * 0.01;
        const toTargetY = (ty - beacon.y) * 0.01;

        const dx = beacon.x - pointer.x;
        const dy = beacon.y - pointer.y;
        const distance = Math.hypot(dx, dy) || 0.0001;
        const interactionRadius = 240;
        let reactX = 0;
        let reactY = 0;
        let nearMix = 0;

        if (distance < interactionRadius) {
            const falloff = 1 - distance / interactionRadius;
            const force = falloff * falloff * 2.8;
            reactX = (dx / distance) * force;
            reactY = (dy / distance) * force;
            nearMix = clamp01(falloff * falloff);
        }
        beacon.nearMix = nearMix;

        beacon.x += beacon.vx + Math.sin(beacon.phase) * 0.26 + toTargetX + reactX;
        beacon.y += beacon.vy + Math.cos(beacon.phase * 1.15) * 0.2 + toTargetY + reactY + scrollForceY * BEACON_SCROLL_INFLUENCE;

        if (beacon.x < -20) beacon.x = width + 20;
        if (beacon.x > width + 20) beacon.x = -20;
        if (beacon.y < -20) beacon.y = height + 20;
        if (beacon.y > height + 20) beacon.y = -20;

        if (
            pointer.active &&
            nearMix > 0.06 &&
            !pointerOverUi &&
            time - lastBeaconProximityAt > BEACON_PROXIMITY_MIN_INTERVAL_MS
        ) {
            window.dispatchEvent(new CustomEvent("aboutbeaconproximity", {
                detail: { intensity: nearMix }
            }));
            lastBeaconProximityAt = time;
        }
    }

    function drawAboutBeacon() {
        if (!beacon || currentPage !== "about") return;
        const near = clamp01(beacon.nearMix || 0);
        const glow = beacon.radius * (2.3 + near * 0.95);
        const coreRadius = beacon.radius * (1 + near * 0.12);
        const red = mixChannel(NATURAL_YELLOW.r, WHITE.r, near * 0.75);
        const green = mixChannel(NATURAL_YELLOW.g, WHITE.g, near * 0.75);
        const blue = mixChannel(NATURAL_YELLOW.b, WHITE.b, near * 0.75);

        ctx.globalAlpha = beacon.alpha * (0.34 + near * 0.34);
        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.beginPath();
        ctx.arc(beacon.x, beacon.y, glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = beacon.alpha * (1 + near * 0.18);
        ctx.beginPath();
        ctx.arc(beacon.x, beacon.y, coreRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    function updateBrandTint() {
        if (!brandHero || !brandLogo) return;

        let tintMix = 0;
        if (pointer.active) {
            const rect = brandLogo.getBoundingClientRect();
            const centerX = rect.left + rect.width * 0.5;
            const centerY = rect.top + rect.height * 0.5;
            const distance = Math.hypot(pointer.x - centerX, pointer.y - centerY);
            const reactionRadius = Math.max(220, Math.max(rect.width, rect.height) * 2.6);
            const falloff = clamp01(1 - distance / reactionRadius);
            tintMix = falloff * falloff;
        }

        const tintStrength = clamp01(tintMix * 0.85);
        const tintR = mixChannel(BASE_BLACK.r, NATURAL_GREEN.r, tintStrength);
        const tintG = mixChannel(BASE_BLACK.g, NATURAL_GREEN.g, tintStrength);
        const tintB = mixChannel(BASE_BLACK.b, NATURAL_GREEN.b, tintStrength);

        brandHero.style.setProperty("--brand-tint-r", `${tintR}`);
        brandHero.style.setProperty("--brand-tint-g", `${tintG}`);
        brandHero.style.setProperty("--brand-tint-b", `${tintB}`);
    }

    function animate(time) {
        if (TARGET_FRAME_MS > 0 && time - lastFrameAt < TARGET_FRAME_MS) {
            rafId = requestAnimationFrame(animate);
            return;
        }
        lastFrameAt = time;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
        let interferenceCount = 0;
        let maxInterferenceForce = 0;
        scrollForceY *= 0.88;
        const scrollDrift = scrollForceY;

        for (let i = 0; i < particles.length; i += 1) {
            const p = particles[i];
            p.phase += p.drift;

            const target = getFormationTarget(p, time);
            const toTargetX = (target.x - p.x) * 0.0065;
            const toTargetY = (target.y - p.y) * 0.0065;

            const pullX = (pointer.x - width * 0.5) * 0.00003;
            const pullY = (pointer.y - height * 0.5) * 0.00003;
            const dx = p.x - pointer.x;
            const dy = p.y - pointer.y;
            const distance = Math.hypot(dx, dy) || 0.0001;
            const interactionRadius = IS_SAFARI ? 148 : 170;
            let reactX = 0;
            let reactY = 0;
            let whitenByProximity = 0;

            if (distance < interactionRadius) {
                const falloff = 1 - distance / interactionRadius;
                const force = falloff * falloff * 0.8;
                reactX = (dx / distance) * force;
                reactY = (dy / distance) * force;
                whitenByProximity = clamp01(falloff * falloff * 1.4);
                if (pointer.active && force > 0.04) {
                    interferenceCount += 1;
                    if (force > maxInterferenceForce) {
                        maxInterferenceForce = force;
                    }
                }
            }

            p.x += p.vx + Math.sin(p.phase) * 0.12 + pullX + reactX + toTargetX;
            p.y += p.vy + Math.cos(p.phase * 1.25) * 0.08 + pullY + reactY + toTargetY +
                scrollDrift * (0.65 + p.homeRadius * 0.7) * PARTICLE_SCROLL_INFLUENCE;

            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            if (p.y < -10) p.y = height + 10;
            if (p.y > height + 10) p.y = -10;

            const gradientSeed = clamp01((Math.sin(p.i * 0.25 + p.phase * 0.8) + 1) * 0.5);
            const whiteMix = clamp01(gradientSeed * 0.5 + (pointer.active ? whitenByProximity : 0));
            const red = mixChannel(NATURAL_GREEN.r, WHITE.r, whiteMix);
            const green = mixChannel(NATURAL_GREEN.g, WHITE.g, whiteMix);
            const blue = mixChannel(NATURAL_GREEN.b, WHITE.b, whiteMix);

            const glowAlpha = Math.min(1, p.alpha * (IS_SAFARI ? 0.24 : 0.42));
            ctx.globalAlpha = glowAlpha;
            ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * (IS_SAFARI ? 1.65 : 2.1), 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        updateAboutBeacon(time);
        drawAboutBeacon();

        if (
            pointer.active &&
            !pointerOverUi &&
            interferenceCount > 0 &&
            time - lastInterferenceAt > INTERFERENCE_MIN_INTERVAL_MS
        ) {
            const intensity = Math.min(
                1,
                (interferenceCount / 16) * 0.65 + maxInterferenceForce * 0.8
            );
            window.dispatchEvent(new CustomEvent("particleinterference", {
                detail: {
                    intensity,
                    count: interferenceCount
                }
            }));
            lastInterferenceAt = time;
        }

        if (!IS_SAFARI) {
            const haze = ctx.createLinearGradient(0, 0, width, height);
            haze.addColorStop(0, "rgba(255, 255, 255, 0)");
            haze.addColorStop(0.45, "rgba(255, 255, 255, 0.08)");
            haze.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = haze;
            ctx.fillRect(0, 0, width, height);
        } else {
            ctx.globalAlpha = 0.16;
            ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
            ctx.fillRect(0, 0, width, height);
        }

        if (!IS_SAFARI || tintFrame % 2 === 0) {
            updateBrandTint();
        }
        tintFrame += 1;

        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(animate);
    }

    window.addEventListener("resize", () => {
        resize();
    });

    window.addEventListener("mousemove", (event) => {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.active = true;
        const target = event.target;
        pointerOverUi = !!(
            target &&
            target.closest &&
            target.closest("nav a, summary, .release-panel, .live-item, .about-link, .visitors-panel, button, input, textarea, .player, .mobile-menu-toggle, #intro-logo-trigger")
        );
    });

    window.addEventListener("mouseleave", () => {
        pointer.active = false;
        pointer.x = width * 0.5;
        pointer.y = height * 0.5;
        pointerOverUi = false;
    });

    window.addEventListener("touchmove", (event) => {
        if (!event.touches || event.touches.length === 0) return;
        pointer.x = event.touches[0].clientX;
        pointer.y = event.touches[0].clientY;
        pointer.active = true;
        pointerOverUi = true;
    }, { passive: true });

    window.addEventListener("wheel", (event) => {
        const delta = clamp(event.deltaY, -140, 140);
        scrollForceY = clamp(scrollForceY + delta * SCROLL_INPUT_GAIN, -SCROLL_FORCE_MAX, SCROLL_FORCE_MAX);
    }, { passive: true });

    window.addEventListener("pagechange", (event) => {
        const page = event && event.detail && event.detail.page;
        if (!page) return;
        currentPage = page;
    });

    resize();
    seed();
    currentPage = (document.body.dataset.page || "home");
    animate(performance.now());

    window.addEventListener("beforeunload", () => {
        if (rafId) cancelAnimationFrame(rafId);
    });
})();
