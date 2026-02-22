(function () {
    const host = document.getElementById("particles-js");
    if (!host) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    host.appendChild(canvas);

    const pointer = { x: 0, y: 0, active: false };
    const particles = [];
    const particleCount = 90;
    const INTERFERENCE_MIN_INTERVAL_MS = 75;
    let width = 0;
    let height = 0;
    let rafId = null;
    let currentPage = "home";
    let lastInterferenceAt = 0;

    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    function createParticle(index) {
        return {
            i: index,
            x: rand(0, width),
            y: rand(0, height),
            radius: rand(0.7, 2.8),
            alpha: rand(0.08, 0.26),
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
                const yBand = (n - 0.5) * height * 0.75;
                tx = cx + Math.sin(n * Math.PI * 6 + time * 0.001) * (width * 0.12);
                ty = cy + yBand;
                break;
            }
            case "home":
            default: {
                const cloud = Math.min(width, height) * (0.1 + p.homeRadius * 0.28);
                tx = cx + Math.cos(p.homeAngle) * cloud;
                ty = cy + Math.sin(p.homeAngle) * cloud * 0.72;
                break;
            }
        }

        return {
            x: tx + p.jitterX * 0.24 + sway,
            y: ty + p.jitterY * 0.24 + breathe
        };
    }

    function animate(time) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
        let interferenceCount = 0;
        let maxInterferenceForce = 0;

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
            const interactionRadius = 170;
            let reactX = 0;
            let reactY = 0;

            if (distance < interactionRadius) {
                const falloff = 1 - distance / interactionRadius;
                const force = falloff * falloff * 0.8;
                reactX = (dx / distance) * force;
                reactY = (dy / distance) * force;
                if (pointer.active && force > 0.04) {
                    interferenceCount += 1;
                    if (force > maxInterferenceForce) {
                        maxInterferenceForce = force;
                    }
                }
            }

            p.x += p.vx + Math.sin(p.phase) * 0.12 + pullX + reactX + toTargetX;
            p.y += p.vy + Math.cos(p.phase * 1.25) * 0.08 + pullY + reactY + toTargetY;

            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            if (p.y < -10) p.y = height + 10;
            if (p.y > height + 10) p.y = -10;

            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        if (
            pointer.active &&
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

        const haze = ctx.createLinearGradient(0, 0, width, height);
        haze.addColorStop(0, "rgba(255, 255, 255, 0)");
        haze.addColorStop(0.45, "rgba(255, 255, 255, 0.08)");
        haze.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, width, height);

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
    });

    window.addEventListener("mouseleave", () => {
        pointer.active = false;
        pointer.x = width * 0.5;
        pointer.y = height * 0.5;
    });

    window.addEventListener("touchmove", (event) => {
        if (!event.touches || event.touches.length === 0) return;
        pointer.x = event.touches[0].clientX;
        pointer.y = event.touches[0].clientY;
        pointer.active = true;
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
