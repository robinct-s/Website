(function () {
    const DESKTOP_QUERY = "(min-width: 769px) and (hover: hover) and (pointer: fine)";
    const MAX_AURAS = 30;

    const toggle = document.getElementById("dark-mode-toggle");
    const auraField = document.getElementById("aura-field");
    const body = document.body;
    const toggleLabel = toggle ? toggle.querySelector(".dark-mode-toggle-label") : null;
    const desktopQuery = window.matchMedia ? window.matchMedia(DESKTOP_QUERY) : null;
    const persistentField = document.createElement("div");
    let enabled = false;
    let toneTimer = null;
    let persistentRaf = 0;
    let navLightRaf = 0;
    let navLightStartedAt = 0;
    const persistentLights = new Map();

    if (!toggle || !auraField || !body) return;
    persistentField.id = "persistent-light-field";
    auraField.appendChild(persistentField);

    function isDesktop() {
        return desktopQuery ? desktopQuery.matches : window.innerWidth > 768;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function syncModeState(options = {}) {
        const active = enabled && isDesktop();
        body.classList.toggle("dark-mode-desktop", active);
        if (toneTimer !== null) {
            clearTimeout(toneTimer);
            toneTimer = null;
        }
        if (active) {
            body.classList.remove("dark-mode-tones-ready");
            if (options.immediateTones) {
                body.classList.add("dark-mode-tones-ready");
            } else {
                toneTimer = window.setTimeout(() => {
                    body.classList.add("dark-mode-tones-ready");
                    toneTimer = null;
                }, 320);
            }
        } else {
            body.classList.remove("dark-mode-tones-ready");
        }
        toggle.classList.toggle("is-active", enabled);
        toggle.disabled = !isDesktop();
        toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
        toggle.setAttribute("aria-label", enabled ? "Switch to active sight" : "Switch to echo mapping");
        if (toggleLabel) {
            toggleLabel.textContent = enabled ? "echo mapping" : "active sight";
        } else {
            toggle.textContent = enabled ? "echo mapping" : "active sight";
        }
        if (active) {
            startPersistentLights();
            startNavLightFlow();
        } else {
            stopPersistentLights();
            stopNavLightFlow();
        }
    }

    function setMode(nextEnabled) {
        enabled = !!nextEnabled;
        syncModeState();
        window.dispatchEvent(new CustomEvent("darkmodesound", {
            detail: { enabled }
        }));
    }

    function colorForSound(soundType, source) {
        if (soundType === "pageLive") return "223, 197, 116";
        if (soundType === "scrollWheel") return "99, 168, 159";
        if (soundType === "darkModeOn") return "126, 174, 124";
        if (soundType === "lightModeOn") return "232, 244, 226";
        if (soundType === "logo" || soundType === "logoRepulse") return "232, 244, 226";
        if (source === "page") return "126, 174, 124";
        if (soundType && soundType.indexOf("visitor") !== -1) return "188, 226, 178";
        return "126, 174, 124";
    }

    function normalizeAuraColor(value, fallback = "126, 174, 124") {
        if (typeof value !== "string" || !value.trim()) return fallback;
        const raw = value.trim();
        const rgb = raw.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
        if (rgb) {
            return `${Math.round(Number(rgb[1]))}, ${Math.round(Number(rgb[2]))}, ${Math.round(Number(rgb[3]))}`;
        }
        const srgb = raw.match(/color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
        if (srgb) {
            return `${Math.round(Number(srgb[1]) * 255)}, ${Math.round(Number(srgb[2]) * 255)}, ${Math.round(Number(srgb[3]) * 255)}`;
        }
        if (/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(raw)) return raw;
        return fallback;
    }

    function getRectCenter(rect) {
        return {
            x: rect.left + rect.width * 0.5,
            y: rect.top + rect.height * 0.5
        };
    }

    function getVisitorLightConfigs() {
        if (body.dataset.page !== "visitors") return [];
        return Array.from(document.querySelectorAll(".visitor-orbit-node")).map((node, index) => {
            const dot = node.querySelector(".visitor-orbit-dot");
            const rect = dot ? dot.getBoundingClientRect() : node.getBoundingClientRect();
            if (!rect || rect.width < 2 || rect.height < 2) return null;
            const center = getRectCenter(rect);
            const color = normalizeAuraColor(dot ? getComputedStyle(dot).backgroundColor : "");
            return {
                key: `visitor-${index}`,
                className: "persistent-light visitor-light",
                x: center.x,
                y: center.y,
                width: 128,
                height: 128,
                color,
                opacity: 0.82
            };
        }).filter(Boolean);
    }

    function getHomeLogoLightConfig() {
        if (body.dataset.page !== "home") return null;
        const logo = document.querySelector(".brand-hero .logo");
        if (!logo) return null;
        const rect = logo.getBoundingClientRect();
        if (!rect || rect.width < 4 || rect.height < 4) return null;
        const center = getRectCenter(rect);
        const diameter = Math.max(460, rect.width * 2.08, rect.height * 3.8);
        return {
            key: "home-logo",
            className: "persistent-light home-logo-light",
            x: center.x,
            y: center.y,
            width: diameter,
            height: diameter,
            color: "232, 244, 226",
            opacity: 0.72
        };
    }

    function updatePersistentLights() {
        if (!enabled || !isDesktop()) {
            stopPersistentLights();
            return;
        }

        const configs = [];
        const logoConfig = getHomeLogoLightConfig();
        if (logoConfig) configs.push(logoConfig);
        configs.push(...getVisitorLightConfigs());

        const activeKeys = new Set();
        configs.forEach((config) => {
            activeKeys.add(config.key);
            let light = persistentLights.get(config.key);
            if (!light) {
                const el = document.createElement("span");
                light = {
                    currentOpacity: 0,
                    el,
                    removeWhenDim: false,
                    targetOpacity: config.opacity
                };
                persistentLights.set(config.key, light);
                persistentField.appendChild(el);
            }
            light.removeWhenDim = false;
            light.targetOpacity = config.opacity;
            light.el.className = config.className;
            light.el.style.setProperty("--persistent-x", `${config.x}px`);
            light.el.style.setProperty("--persistent-y", `${config.y}px`);
            light.el.style.setProperty("--persistent-width", `${config.width}px`);
            light.el.style.setProperty("--persistent-height", `${config.height}px`);
            light.el.style.setProperty("--persistent-color", config.color);
        });

        persistentLights.forEach((light, key) => {
            if (!activeKeys.has(key)) {
                light.targetOpacity = 0;
                light.removeWhenDim = true;
            }

            const diff = light.targetOpacity - light.currentOpacity;
            const speed = light.targetOpacity > light.currentOpacity ? 0.075 : 0.055;
            light.currentOpacity += diff * speed;
            if (Math.abs(diff) < 0.006) {
                light.currentOpacity = light.targetOpacity;
            }
            light.el.style.setProperty("--persistent-opacity", light.currentOpacity.toFixed(3));

            if (light.removeWhenDim && light.currentOpacity <= 0.012) {
                light.el.remove();
                persistentLights.delete(key);
            }
        });

        persistentRaf = requestAnimationFrame(updatePersistentLights);
    }

    function startPersistentLights() {
        if (persistentRaf) return;
        persistentRaf = requestAnimationFrame(updatePersistentLights);
    }

    function stopPersistentLights() {
        if (persistentRaf) {
            cancelAnimationFrame(persistentRaf);
            persistentRaf = 0;
        }
        persistentLights.clear();
        persistentField.replaceChildren();
    }

    function easeInOut(value) {
        const t = clamp(value, 0, 1);
        return t * t * (3 - 2 * t);
    }

    function updateNavLightFlow() {
        if (!enabled || !isDesktop()) {
            stopNavLightFlow();
            return;
        }

        const navList = document.getElementById("site-nav-list");
        if (!navList) {
            navLightRaf = requestAnimationFrame(updateNavLightFlow);
            return;
        }

        const rect = navList.getBoundingClientRect();
        const links = Array.from(navList.querySelectorAll("a"));
        const cycle = 8400;
        const phase = ((performance.now() - navLightStartedAt) % cycle) / cycle;
        const travel = clamp((phase - 0.12) / 0.76, 0, 1);
        const particlePercent = 104 - easeInOut(travel) * 108;
        const activeFade = phase < 0.12
            ? phase / 0.12
            : phase > 0.88
                ? (1 - phase) / 0.12
                : 1;
        const particleOpacity = clamp(activeFade, 0, 1);
        const particleX = rect.left + rect.width * (particlePercent / 100);
        const radius = Math.max(90, Math.min(150, rect.width * 0.22));

        navList.style.setProperty("--nav-particle-x", `${particlePercent.toFixed(2)}%`);
        navList.style.setProperty("--nav-particle-opacity", (particleOpacity * 0.74).toFixed(3));
        navList.style.setProperty("--nav-glow-opacity", (particleOpacity * 0.46).toFixed(3));

        links.forEach((link) => {
            const linkRect = link.getBoundingClientRect();
            const centerX = linkRect.left + linkRect.width * 0.5;
            const distance = Math.abs(centerX - particleX);
            const level = Math.pow(clamp(1 - distance / radius, 0, 1), 1.8) * particleOpacity;
            link.style.setProperty("--nav-link-light", level.toFixed(3));
            link.style.setProperty("--nav-link-r", Math.round(126 + 110 * level));
            link.style.setProperty("--nav-link-g", Math.round(174 + 72 * level));
            link.style.setProperty("--nav-link-b", Math.round(124 + 106 * level));
            link.style.setProperty("--nav-link-a", (0.3 + 0.66 * level).toFixed(3));
            link.style.setProperty("--nav-link-shadow", (0.42 * level).toFixed(3));
            link.style.setProperty("--nav-link-tight-glow", `${(7 * level).toFixed(2)}px`);
            link.style.setProperty("--nav-link-wide-glow", `${(24 * level).toFixed(2)}px`);
        });

        navLightRaf = requestAnimationFrame(updateNavLightFlow);
    }

    function startNavLightFlow() {
        if (navLightRaf) return;
        navLightStartedAt = performance.now();
        navLightRaf = requestAnimationFrame(updateNavLightFlow);
    }

    function stopNavLightFlow() {
        if (navLightRaf) {
            cancelAnimationFrame(navLightRaf);
            navLightRaf = 0;
        }
        const navList = document.getElementById("site-nav-list");
        if (!navList) return;
        navList.style.removeProperty("--nav-particle-x");
        navList.style.removeProperty("--nav-particle-opacity");
        navList.style.removeProperty("--nav-glow-opacity");
        navList.querySelectorAll("a").forEach((link) => {
            link.style.removeProperty("--nav-link-light");
            link.style.removeProperty("--nav-link-r");
            link.style.removeProperty("--nav-link-g");
            link.style.removeProperty("--nav-link-b");
            link.style.removeProperty("--nav-link-a");
            link.style.removeProperty("--nav-link-shadow");
            link.style.removeProperty("--nav-link-tight-glow");
            link.style.removeProperty("--nav-link-wide-glow");
        });
    }

    function createAura(detail = {}) {
        if (!enabled || !isDesktop()) return;

        const x = clamp(Number.isFinite(detail.x) ? detail.x : window.innerWidth * 0.5, -80, window.innerWidth + 80);
        const y = clamp(Number.isFinite(detail.y) ? detail.y : window.innerHeight * 0.5, -80, window.innerHeight + 80);
        const baseIntensity = Number.isFinite(detail.intensity) ? detail.intensity : 0.68;
        const baseRadius = Number.isFinite(detail.radius) ? detail.radius : 260;
        const isParticleAura = detail.source === "particle" || detail.soundType === "particle";
        const isVisitorHoverAura = detail.soundType === "visitorWhisper";
        const isScrollAura = detail.shape === "scrollbar" || detail.source === "scroll";
        const intensity = isParticleAura
            ? clamp(baseIntensity * (isVisitorHoverAura ? 1.05 : 0.42), isVisitorHoverAura ? 0.32 : 0.1, isVisitorHoverAura ? 0.86 : 0.34)
            : clamp(baseIntensity * 1.18, 0.22, 1);
        const radius = isParticleAura
            ? clamp(baseRadius * (isVisitorHoverAura ? 1.45 : 0.34), isVisitorHoverAura ? 210 : 42, isVisitorHoverAura ? 470 : 125)
            : clamp(baseRadius * 1.14, 140, 760);
        const duration = isParticleAura
            ? (isVisitorHoverAura ? 1900 : 950)
            : (detail.source === "page" || detail.source === "formation" ? 4450 : 3650);
        const color = normalizeAuraColor(detail.color, colorForSound(detail.soundType, detail.source));

        const soundAuras = Array.from(auraField.querySelectorAll(":scope > .sound-aura"));
        while (soundAuras.length >= MAX_AURAS) {
            const oldest = soundAuras.shift();
            if (oldest) oldest.remove();
        }

        const aura = document.createElement("span");
        aura.className = isScrollAura ? "sound-aura scroll-aura" : "sound-aura";
        aura.style.setProperty("--aura-x", `${x}px`);
        aura.style.setProperty("--aura-y", `${y}px`);
        aura.style.setProperty("--aura-radius", `${radius}px`);
        aura.style.setProperty("--aura-intensity", intensity.toFixed(2));
        aura.style.setProperty("--aura-tail", (intensity * 0.58).toFixed(2));
        aura.style.setProperty("--aura-duration", `${duration}ms`);
        aura.style.setProperty("--aura-color", color);
        if (Number.isFinite(detail.lineHeight)) {
            aura.style.setProperty("--aura-line-height", `${detail.lineHeight}px`);
        }
        auraField.appendChild(aura);
        aura.addEventListener("animationend", () => {
            aura.remove();
        }, { once: true });
    }

    toggle.addEventListener("click", () => {
        if (!isDesktop()) return;
        setMode(!enabled);
    });

    window.addEventListener("uisoundaura", (event) => {
        createAura(event && event.detail ? event.detail : {});
    });

    if (desktopQuery) {
        const handleDesktopChange = () => syncModeState({ immediateTones: true });
        if (desktopQuery.addEventListener) {
            desktopQuery.addEventListener("change", handleDesktopChange);
        } else if (desktopQuery.addListener) {
            desktopQuery.addListener(handleDesktopChange);
        }
    }

    enabled = false;
    syncModeState({ immediateTones: true });
})();
