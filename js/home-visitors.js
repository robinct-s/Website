(function () {
    const USERNAME_KEY = "stasis-visitor-username";
    const LOCAL_FEED_KEY = "stasis-visitor-feed-v1";
    const MAX_NAME_LEN = 24;
    const MAX_MESSAGE_LEN = 220;
    const MAX_ITEMS = 120;
    // Visitors-page particle feed. Set to false to restore list rendering.
    const ENABLE_ORBITAL_VISITOR_FEED = true;
    const MAX_ORBIT_PARTICLES = 14;
    const FORMATION_SWITCH_MS = 20000;
    const FORMATION_BLEND_MS = 3800;
    const ORBIT_REGION_PAD_RATIO = 0.035;
    const DANCE_CENTER_Y_RATIO = 0.56;
    const FREE_SCATTER_MS = 5200;
    const ORBIT_AVOID_PADDING = 26;
    const ORBIT_AVOID_FORCE = 0.034;
    const ORBIT_TARGET_RETRIES = 16;
    const ua = navigator.userAgent || "";
    const vendor = navigator.vendor || "";
    const IS_SAFARI = /Apple/i.test(vendor) &&
        /Safari/i.test(ua) &&
        !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS|SamsungBrowser/i.test(ua);
    const ORBIT_TARGET_FRAME_MS = IS_SAFARI ? 33 : 0;
    const ORBIT_MAX_PARTICLES = IS_SAFARI ? 10 : MAX_ORBIT_PARTICLES;

    const orbitColorByKey = new Map();
    let orbitNodes = [];
    let orbitRafId = 0;
    let lastHoverSoundAt = 0;
    let danceMode = false;
    let lastFormationSwitchAt = 0;
    let formationBlendStartAt = 0;
    let freeScatterUntil = 0;
    let lastOrbitFrameAt = 0;

    function clampText(value, maxLen) {
        return (value || "").trim().replace(/\s+/g, " ").slice(0, maxLen);
    }

    function getApiEndpoint() {
        const cfg = window.VISITORS_CONFIG || {};
        return typeof cfg.endpoint === "string" ? cfg.endpoint.trim() : "";
    }

    function getSupabaseConfig() {
        const cfg = window.VISITORS_CONFIG || {};
        const supabaseUrl = typeof cfg.supabaseUrl === "string" ? cfg.supabaseUrl.trim() : "";
        const publishableKey = typeof cfg.publishableKey === "string" ? cfg.publishableKey.trim() : "";
        if (!supabaseUrl || !publishableKey) return null;
        const table = typeof cfg.table === "string" && cfg.table.trim() ? cfg.table.trim() : "visitors";
        return { supabaseUrl, publishableKey, table };
    }

    function readLocalFeed() {
        try {
            const raw = localStorage.getItem(LOCAL_FEED_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }

    function writeLocalFeed(items) {
        try {
            localStorage.setItem(LOCAL_FEED_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
        } catch (_) {
            // ignore quota / storage errors
        }
    }

    function normalizeEntry(raw) {
        if (!raw || typeof raw !== "object") return null;
        const username = clampText(raw.username || raw.name, MAX_NAME_LEN);
        const message = clampText(raw.message || raw.comment, MAX_MESSAGE_LEN);
        const createdAt =
            (typeof raw.createdAt === "string" && raw.createdAt) ||
            (typeof raw.created_at === "string" && raw.created_at) ||
            new Date().toISOString();
        if (!username || !message) return null;
        return { username, message, createdAt };
    }

    async function fetchRemoteFeed(endpoint) {
        const res = await fetch(endpoint, { method: "GET", credentials: "omit" });
        if (!res.ok) throw new Error("Failed to load visitors");
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
        return arr.map(normalizeEntry).filter(Boolean).slice(0, MAX_ITEMS);
    }

    async function postRemoteEntry(endpoint, entry) {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "omit",
            body: JSON.stringify(entry)
        });
        if (!res.ok) throw new Error("Failed to post comment");
    }

    async function fetchSupabaseFeed(config) {
        const url = `${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.table)}?select=username,message,created_at&order=created_at.desc&limit=${MAX_ITEMS}`;
        const headers = {
            apikey: config.publishableKey,
            Authorization: `Bearer ${config.publishableKey}`
        };
        const res = await fetch(url, { method: "GET", headers, credentials: "omit" });
        if (!res.ok) throw new Error("Failed to load visitors");
        const data = await res.json();
        return (Array.isArray(data) ? data : []).map(normalizeEntry).filter(Boolean);
    }

    async function postSupabaseEntry(config, entry) {
        const url = `${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.table)}`;
        const payload = [{
            username: entry.username,
            message: entry.message,
            created_at: entry.createdAt
        }];
        const headers = {
            apikey: config.publishableKey,
            Authorization: `Bearer ${config.publishableKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
        };
        const res = await fetch(url, {
            method: "POST",
            headers,
            credentials: "omit",
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to post comment");
    }

    function formatTimestamp(value) {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        const day = `${d.getDate()}`.padStart(2, "0");
        const month = `${d.getMonth() + 1}`.padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function setNote(noteEl, text) {
        if (!noteEl) return;
        noteEl.textContent = text || "";
    }

    function makeEntryKey(entry) {
        return `${entry.username || ""}|${entry.message || ""}|${entry.createdAt || ""}`;
    }

    function randomParticleColor() {
        const hue = Math.floor(Math.random() * 360);
        const sat = 68 + Math.floor(Math.random() * 20);
        const light = 58 + Math.floor(Math.random() * 18);
        return `hsl(${hue} ${sat}% ${light}%)`;
    }

    function getOrbitColor(entry) {
        const key = makeEntryKey(entry);
        if (!orbitColorByKey.has(key)) {
            orbitColorByKey.set(key, randomParticleColor());
        }
        return orbitColorByKey.get(key);
    }

    function buildOrbitAvoidZones() {
        const selectors = [".visitors-header"];
        if (window.innerWidth > 768) selectors.push(".visitors-panel");
        const pad = window.innerWidth <= 768 ? ORBIT_AVOID_PADDING + 10 : ORBIT_AVOID_PADDING;
        const zones = [];
        selectors.forEach((selector) => {
            const el = document.querySelector(selector);
            if (!el) return;
            const rect = el.getBoundingClientRect();
            if (!rect || rect.width < 2 || rect.height < 2) return;
            zones.push({
                left: rect.left - pad,
                right: rect.right + pad,
                top: rect.top - pad,
                bottom: rect.bottom + pad,
                reach: pad + 26
            });
        });
        return zones;
    }

    function getOrbitBounds(viewportW, viewportH) {
        const regionPadX = viewportW * ORBIT_REGION_PAD_RATIO;
        const regionPadY = viewportH * ORBIT_REGION_PAD_RATIO;
        let minY = regionPadY;
        const maxY = viewportH - regionPadY;

        if (window.innerWidth <= 768) {
            const header = document.querySelector(".visitors-header");
            if (header) {
                const rect = header.getBoundingClientRect();
                if (rect && rect.height > 0) {
                    const pad = ORBIT_AVOID_PADDING + 12;
                    minY = Math.max(minY, rect.bottom + pad);
                }
            }
        }

        return {
            minX: regionPadX,
            maxX: viewportW - regionPadX,
            minY: Math.min(minY, maxY - 12),
            maxY
        };
    }

    function isPointInAvoidZones(x, y, zones) {
        return zones.some((zone) => x >= zone.left && x <= zone.right && y >= zone.top && y <= zone.bottom);
    }

    function pickSafeOrbitPoint(minX, maxX, minY, maxY, zones, fallbackX, fallbackY) {
        const innerMinX = minX + 16;
        const innerMaxX = maxX - 16;
        const innerMinY = minY + 16;
        const innerMaxY = maxY - 16;
        for (let i = 0; i < ORBIT_TARGET_RETRIES; i++) {
            const x = innerMinX + Math.random() * Math.max(1, innerMaxX - innerMinX);
            const y = innerMinY + Math.random() * Math.max(1, innerMaxY - innerMinY);
            if (!isPointInAvoidZones(x, y, zones)) {
                return { x, y };
            }
        }
        let x = Math.max(innerMinX, Math.min(innerMaxX, fallbackX));
        let y = Math.max(innerMinY, Math.min(innerMaxY, fallbackY));
        if (!isPointInAvoidZones(x, y, zones)) {
            return { x, y };
        }
        for (let i = 0; i < 8; i++) {
            x = innerMinX + Math.random() * Math.max(1, innerMaxX - innerMinX);
            y = innerMinY + Math.random() * Math.max(1, innerMaxY - innerMinY);
            if (!isPointInAvoidZones(x, y, zones)) {
                return { x, y };
            }
        }
        return { x, y };
    }

    function resolveOrbitCenterPoint(minX, maxX, minY, maxY, zones, baseX, baseY) {
        const x = Math.max(minX + 16, Math.min(maxX - 16, baseX));
        const y = Math.max(minY + 16, Math.min(maxY - 16, baseY));
        if (!isPointInAvoidZones(x, y, zones)) {
            return { x, y };
        }
        return pickSafeOrbitPoint(minX, maxX, minY, maxY, zones, x, y);
    }

    function applyZoneRepulsion(node, zones, force) {
        zones.forEach((zone) => {
            const nearestX = Math.max(zone.left, Math.min(zone.right, node.x));
            const nearestY = Math.max(zone.top, Math.min(zone.bottom, node.y));
            let dx = node.x - nearestX;
            let dy = node.y - nearestY;
            let dist = Math.hypot(dx, dy);
            if (dist >= zone.reach) return;
            if (dist < 0.0001) {
                const centerX = (zone.left + zone.right) * 0.5;
                const centerY = (zone.top + zone.bottom) * 0.5;
                dx = node.x - centerX;
                dy = node.y - centerY;
                dist = Math.hypot(dx, dy);
                if (dist < 0.0001) {
                    dx = (Math.random() * 2) - 1;
                    dy = (Math.random() * 2) - 1;
                    dist = Math.hypot(dx, dy) || 1;
                }
            }
            const strength = ((zone.reach - dist) / zone.reach) * force;
            node.vx += (dx / dist) * strength;
            node.vy += (dy / dist) * strength;
        });
    }

    function stopOrbitAnimation() {
        if (orbitRafId) {
            cancelAnimationFrame(orbitRafId);
            orbitRafId = 0;
        }
    }

    function startOrbitAnimation(feedEl) {
        stopOrbitAnimation();
        if (!feedEl || orbitNodes.length === 0) return;
        danceMode = false;
        lastFormationSwitchAt = performance.now();
        formationBlendStartAt = lastFormationSwitchAt - FORMATION_BLEND_MS;
        lastOrbitFrameAt = 0;

        const tick = (timestamp) => {
            if (ORBIT_TARGET_FRAME_MS > 0 && timestamp - lastOrbitFrameAt < ORBIT_TARGET_FRAME_MS) {
                orbitRafId = requestAnimationFrame(tick);
                return;
            }
            lastOrbitFrameAt = timestamp;
            if (!document.body || document.body.dataset.page !== "visitors" || !document.body.contains(feedEl)) {
                stopOrbitAnimation();
                return;
            }
            const now = performance.now();
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            const bounds = getOrbitBounds(viewportW, viewportH);
            const minX = bounds.minX;
            const maxX = bounds.maxX;
            const minY = bounds.minY;
            const maxY = bounds.maxY;
            const avoidZones = buildOrbitAvoidZones();
            const viewportCenterX = viewportW * 0.5;
            const viewportCenterY = viewportH * DANCE_CENTER_Y_RATIO;
            const safeCenter = resolveOrbitCenterPoint(
                minX,
                maxX,
                minY,
                maxY,
                avoidZones,
                viewportCenterX,
                viewportCenterY
            );
            const centerX = safeCenter.x;
            const centerY = safeCenter.y;

            if (now - lastFormationSwitchAt >= FORMATION_SWITCH_MS) {
                const nextDanceMode = !danceMode;
                danceMode = nextDanceMode;
                lastFormationSwitchAt = now;
                formationBlendStartAt = now;
                window.dispatchEvent(new CustomEvent("visitorformationchange", {
                    detail: { active: danceMode }
                }));

                if (!nextDanceMode) {
                    const count = Math.max(1, orbitNodes.length);
                    freeScatterUntil = now + FREE_SCATTER_MS;
                    orbitNodes.forEach((node, idx) => {
                        const awayX = node.x - centerX;
                        const awayY = node.y - centerY;
                        const radialLen = Math.hypot(awayX, awayY) || 1;
                        const rx = awayX / radialLen;
                        const ry = awayY / radialLen;
                        const splitAngle = (idx / count) * Math.PI * 2 + (Math.random() * 0.36 - 0.18);
                        const sx = Math.cos(splitAngle);
                        const sy = Math.sin(splitAngle);
                        const dirX = rx * 0.52 + sx * 0.48;
                        const dirY = ry * 0.52 + sy * 0.48;
                        const dirLen = Math.hypot(dirX, dirY) || 1;
                        const nx = dirX / dirLen;
                        const ny = dirY / dirLen;
                        node.vx += nx * (0.2 + Math.random() * 0.12);
                        node.vy += ny * (0.2 + Math.random() * 0.12);
                        const scatterPoint = pickSafeOrbitPoint(
                            minX,
                            maxX,
                            minY,
                            maxY,
                            avoidZones,
                            centerX + nx * (maxX - minX) * (0.62 + Math.random() * 0.2),
                            centerY + ny * (maxY - minY) * (0.62 + Math.random() * 0.2)
                        );
                        node.targetX = scatterPoint.x;
                        node.targetY = scatterPoint.y;
                        node.targetShiftAt = now + 2000 + Math.random() * 1800;
                    });
                }
            }

            const blendT = Math.max(0, Math.min(1, (now - formationBlendStartAt) / FORMATION_BLEND_MS));
            const easedBlend = blendT * blendT * (3 - 2 * blendT);
            const danceWeight = danceMode ? easedBlend : 1 - easedBlend;
            const freeWeight = 1 - danceWeight;
            const scatterStrength = freeWeight > 0.1 && now < freeScatterUntil
                ? Math.max(0, Math.min(1, (freeScatterUntil - now) / FREE_SCATTER_MS))
                : 0;

            orbitNodes.forEach((node) => {
                const targetScale = node.hovered ? 1.22 : 1;
                node.scale += (targetScale - node.scale) * 0.24;
                if (node.hovered) {
                    node.vx = 0;
                    node.vy = 0;
                    node.el.style.transform = `translate(${node.x}px, ${node.y}px) scale(${node.scale})`;
                    return;
                }

                if (
                    freeWeight > 0.12 &&
                    (now > node.targetShiftAt || Math.hypot(node.targetX - node.x, node.targetY - node.y) < 32)
                ) {
                    const nextPoint = pickSafeOrbitPoint(minX, maxX, minY, maxY, avoidZones, node.x, node.y);
                    node.targetX = nextPoint.x;
                    node.targetY = nextPoint.y;
                    node.targetShiftAt = now + 2600 + Math.random() * 3200;
                }

                const wobble = Math.sin(now * node.wobbleSpeed + node.wobblePhase) * 0.1;
                node.vx += wobble * 0.0008;
                node.vy += Math.cos(now * node.wobbleSpeed * 0.85 + node.wobblePhase) * 0.0008;
                node.vx += (node.targetX - node.x) * (0.00011 * freeWeight);
                node.vy += (node.targetY - node.y) * (0.00011 * freeWeight);
                node.vx += (centerX - node.x) * (0.000012 * freeWeight);
                node.vy += (centerY - node.y) * (0.000012 * freeWeight);
                const pad = 8;
                if (node.x < minX + pad) {
                    node.vx += (minX + pad - node.x) * 0.003;
                } else if (node.x > maxX - pad) {
                    node.vx -= (node.x - (maxX - pad)) * 0.003;
                }

                if (node.y < minY + pad) {
                    node.vy += (minY + pad - node.y) * 0.003;
                } else if (node.y > maxY - pad) {
                    node.vy -= (node.y - (maxY - pad)) * 0.003;
                }
                applyZoneRepulsion(node, avoidZones, ORBIT_AVOID_FORCE + freeWeight * 0.014 + danceWeight * 0.01);

                if (!IS_SAFARI && scatterStrength > 0) {
                    orbitNodes.forEach((other) => {
                        if (other === node) return;
                        const dx = node.x - other.x;
                        const dy = node.y - other.y;
                        const dist = Math.hypot(dx, dy) || 0.0001;
                        const desired = 86;
                        if (dist >= desired) return;
                        const repel = ((desired - dist) / desired) * (0.012 + scatterStrength * 0.02);
                        node.vx += (dx / dist) * repel;
                        node.vy += (dy / dist) * repel;
                    });
                }

                node.vx = Math.max(-0.24, Math.min(0.24, node.vx));
                node.vy = Math.max(-0.24, Math.min(0.24, node.vy));
                node.x += node.vx;
                node.y += node.vy;

                node.angle += node.danceSpeed;
                const phasePulse = Math.sin(now * 0.001 + node.wobblePhase) * 6;
                const radiusX = node.danceRadius + phasePulse;
                const radiusY = node.danceRadius * 0.76 + phasePulse * 0.6;
                const targetX = centerX + Math.cos(node.angle) * radiusX;
                const targetY = centerY + Math.sin(node.angle) * radiusY;

                node.x += (targetX - node.x) * (0.024 * danceWeight);
                node.y += (targetY - node.y) * (0.024 * danceWeight);
                node.vx *= (0.992 - danceWeight * 0.03);
                node.vy *= (0.992 - danceWeight * 0.03);
                applyZoneRepulsion(node, avoidZones, ORBIT_AVOID_FORCE * 0.86);
                node.x = Math.max(minX + 4, Math.min(maxX - 4, node.x));
                node.y = Math.max(minY + 4, Math.min(maxY - 4, node.y));

                node.el.style.transform = `translate(${node.x}px, ${node.y}px) scale(${node.scale})`;
            });

            orbitRafId = requestAnimationFrame(tick);
        };
        orbitRafId = requestAnimationFrame(tick);
    }

    function renderOrbitFeed(feedEl, items) {
        if (!feedEl) return;
        feedEl.classList.add("visitor-feed-orbit");
        feedEl.innerHTML = "";
        orbitNodes = [];
        const avoidZones = buildOrbitAvoidZones();

        const orbitItems = (items || []).slice(0, ORBIT_MAX_PARTICLES);
        if (orbitItems.length === 0) {
            const empty = document.createElement("li");
            empty.className = "visitor-orbit-empty";
            empty.textContent = "No messages yet.";
            feedEl.appendChild(empty);
            stopOrbitAnimation();
            return;
        }

        orbitItems.forEach((entry, index) => {
            const node = document.createElement("li");
            node.className = "visitor-orbit-node";

            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "visitor-orbit-dot";
            dot.setAttribute("aria-label", `${entry.username}: ${entry.message}`);
            dot.style.setProperty("--orbit-color", getOrbitColor(entry));

            const tip = document.createElement("div");
            tip.className = "visitor-orbit-tip";
            const tipName = document.createElement("strong");
            tipName.textContent = entry.username;
            const tipMsg = document.createElement("span");
            tipMsg.textContent = entry.message;
            tip.appendChild(tipName);
            tip.appendChild(tipMsg);

            const width = Math.max(120, feedEl.clientWidth || window.innerWidth);
            const height = Math.max(120, feedEl.clientHeight || window.innerHeight);
            const bounds = getOrbitBounds(width, height);
            const minX = bounds.minX;
            const maxX = bounds.maxX;
            const minY = bounds.minY;
            const maxY = bounds.maxY;
            const startPoint = pickSafeOrbitPoint(minX, maxX, minY, maxY, avoidZones, width * 0.5, height * 0.5);
            const targetPoint = pickSafeOrbitPoint(minX, maxX, minY, maxY, avoidZones, width * 0.5, height * 0.5);
            const orbitNode = {
                el: node,
                x: startPoint.x,
                y: startPoint.y,
                vx: (Math.random() * 2 - 1) * 0.32,
                vy: (Math.random() * 2 - 1) * 0.32,
                targetX: targetPoint.x,
                targetY: targetPoint.y,
                targetShiftAt: performance.now() + 1800 + Math.random() * 2200,
                angle: Math.random() * Math.PI * 2,
                danceSpeed: 0.008 + Math.random() * 0.006,
                danceRadius: (Math.min(width, height) * 0.08) + Math.random() * (Math.min(width, height) * 0.06),
                wobbleSpeed: 0.001 + Math.random() * 0.0012,
                wobblePhase: Math.random() * Math.PI * 2,
                wobbleSize: 2 + Math.random() * 4,
                hovered: false,
                scale: 1
            };
            orbitNodes.push(orbitNode);

            node.addEventListener("mouseenter", () => {
                const now = performance.now();
                orbitNode.hovered = true;
                if (now - lastHoverSoundAt < 90) return;
                lastHoverSoundAt = now;
                window.dispatchEvent(new CustomEvent("visitorparticlehover", {
                    detail: { intensity: 0.7 + Math.random() * 0.3 }
                }));
            });
            node.addEventListener("mouseleave", () => {
                orbitNode.hovered = false;
            });

            node.appendChild(dot);
            node.appendChild(tip);
            feedEl.appendChild(node);
        });

        startOrbitAnimation(feedEl);
    }

    function renderFeed(feedEl, items) {
        if (!feedEl) return;
        if (ENABLE_ORBITAL_VISITOR_FEED) {
            renderOrbitFeed(feedEl, items);
            return;
        }
        feedEl.classList.remove("visitor-feed-orbit");
        stopOrbitAnimation();
        feedEl.innerHTML = "";
        if (!items || items.length === 0) {
            const empty = document.createElement("li");
            empty.className = "visitor-entry";
            empty.textContent = "No messages yet.";
            feedEl.appendChild(empty);
            return;
        }
        items.forEach((entry) => {
            const li = document.createElement("li");
            li.className = "visitor-entry";
            li.addEventListener("mousemove", (event) => {
                const rect = li.getBoundingClientRect();
                li.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                li.style.setProperty("--my", `${event.clientY - rect.top}px`);
            });

            const head = document.createElement("div");
            head.className = "visitor-entry-head";
            const name = document.createElement("span");
            name.className = "visitor-entry-name";
            name.textContent = entry.username;
            const time = document.createElement("time");
            time.className = "visitor-entry-time";
            time.textContent = formatTimestamp(entry.createdAt);
            head.appendChild(name);
            head.appendChild(time);

            const msg = document.createElement("p");
            msg.className = "visitor-entry-message";
            msg.textContent = entry.message;

            li.appendChild(head);
            li.appendChild(msg);
            feedEl.appendChild(li);
        });
    }

    function renderArchive(archiveEl, items) {
        if (!archiveEl) return;
        archiveEl.innerHTML = "";
        if (window.innerWidth <= 768) return;
        const archiveItems = (items || []).slice(ORBIT_MAX_PARTICLES);
        if (archiveItems.length === 0) return;
        archiveItems.forEach((entry) => {
            const li = document.createElement("li");
            li.className = "visitor-archive-item";
            const name = document.createElement("strong");
            name.textContent = `${entry.username}: `;
            const msg = document.createElement("span");
            msg.textContent = entry.message;
            li.appendChild(name);
            li.appendChild(msg);
            archiveEl.appendChild(li);
        });
    }

    function lockUsername(inputEl, username) {
        if (!inputEl || !username) return;
        inputEl.value = username;
        inputEl.readOnly = true;
        inputEl.setAttribute("aria-readonly", "true");
    }

    function initVisitorsPage() {
        const panel = document.querySelector(".visitors-panel");
        if (!panel) return;
        if (panel.dataset.ready === "true") return;
        panel.dataset.ready = "true";
        panel.addEventListener("mousemove", (event) => {
            const rect = panel.getBoundingClientRect();
            panel.style.setProperty("--mx", `${event.clientX - rect.left}px`);
            panel.style.setProperty("--my", `${event.clientY - rect.top}px`);
        });

        const form = panel.querySelector("#visitor-form");
        const nameInput = panel.querySelector("#visitor-name");
        const messageInput = panel.querySelector("#visitor-message");
        const noteEl = panel.querySelector("#visitor-note");
        const feedEl = document.querySelector("#visitor-feed");
        const archiveEl = document.querySelector("#visitor-archive");
        if (!form || !nameInput || !messageInput || !feedEl) return;

        const endpoint = getApiEndpoint();
        const supabase = getSupabaseConfig();
        let posting = false;
        let feedCache = [];

        const savedName = clampText(localStorage.getItem(USERNAME_KEY) || "", MAX_NAME_LEN);
        if (savedName) {
            lockUsername(nameInput, savedName);
            setNote(noteEl, "Username locked.");
        }

        const loadFeed = async () => {
            try {
                if (supabase) {
                    feedCache = await fetchSupabaseFeed(supabase);
                } else if (endpoint) {
                    feedCache = await fetchRemoteFeed(endpoint);
                } else {
                    feedCache = readLocalFeed().map(normalizeEntry).filter(Boolean);
                }
                feedCache.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
                renderFeed(feedEl, feedCache);
                renderArchive(archiveEl, feedCache);
            } catch (_) {
                setNote(noteEl, "Could not load visitor feed.");
                renderFeed(feedEl, feedCache);
                renderArchive(archiveEl, feedCache);
            }
        };

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (posting) return;

            const lockedName = clampText(localStorage.getItem(USERNAME_KEY) || "", MAX_NAME_LEN);
            const candidateName = clampText(nameInput.value, MAX_NAME_LEN);
            const username = lockedName || candidateName;
            const message = clampText(messageInput.value, MAX_MESSAGE_LEN);
            if (!username || !message) {
                setNote(noteEl, "Add a username and a comment.");
                return;
            }

            if (!lockedName) {
                localStorage.setItem(USERNAME_KEY, username);
                lockUsername(nameInput, username);
                setNote(noteEl, "Username set.");
            }

            const entry = {
                username,
                message,
                createdAt: new Date().toISOString()
            };

            posting = true;
            setNote(noteEl, "Posting...");
            try {
                if (supabase) {
                    await postSupabaseEntry(supabase, entry);
                    await loadFeed();
                } else if (endpoint) {
                    await postRemoteEntry(endpoint, entry);
                    await loadFeed();
                } else {
                    const nextFeed = [entry, ...readLocalFeed().map(normalizeEntry).filter(Boolean)];
                    writeLocalFeed(nextFeed);
                    feedCache = nextFeed;
                    renderFeed(feedEl, feedCache);
                    renderArchive(archiveEl, feedCache);
                }
                messageInput.value = "";
                setNote(noteEl, (supabase || endpoint)
                    ? "Posted to live board."
                    : "Posted locally (no live endpoint configured).");
            } catch (_) {
                setNote(noteEl, "Failed to post comment.");
            } finally {
                posting = false;
            }
        });

        loadFeed();
    }

    window.addEventListener("pagechange", (event) => {
        const page = event && event.detail && event.detail.page;
        if (page !== "visitors") {
            stopOrbitAnimation();
            return;
        }
        initVisitorsPage();
    });

    window.addEventListener("load", () => {
        if (document.body.dataset.page === "visitors") {
            initVisitorsPage();
        }
    });

    window.addEventListener("beforeunload", () => {
        stopOrbitAnimation();
    });
})();
