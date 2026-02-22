(function () {
    const host = document.getElementById("particles-js");
    if (!host) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    host.appendChild(canvas);

    const pointer = { x: 0, y: 0 };
    const particles = [];
    const particleCount = 90;
    let width = 0;
    let height = 0;
    let rafId = null;

    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    function createParticle() {
        return {
            x: rand(0, width),
            y: rand(0, height),
            radius: rand(0.7, 2.8),
            alpha: rand(0.08, 0.26),
            vx: rand(-0.16, 0.16),
            vy: rand(-0.12, 0.2),
            drift: rand(0.0006, 0.0022),
            phase: rand(0, Math.PI * 2)
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
    }

    function seed() {
        particles.length = 0;
        for (let i = 0; i < particleCount; i += 1) {
            particles.push(createParticle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(0, 0, 0, 0.95)";

        for (let i = 0; i < particles.length; i += 1) {
            const p = particles[i];
            p.phase += p.drift;

            const pullX = (pointer.x - width * 0.5) * 0.00003;
            const pullY = (pointer.y - height * 0.5) * 0.00003;

            p.x += p.vx + Math.sin(p.phase) * 0.12 + pullX;
            p.y += p.vy + Math.cos(p.phase * 1.25) * 0.08 + pullY;

            if (p.x < -8) p.x = width + 8;
            if (p.x > width + 8) p.x = -8;
            if (p.y < -8) p.y = height + 8;
            if (p.y > height + 8) p.y = -8;

            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // soft haze sweep to make motion feel atmospheric instead of static dots
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
        seed();
    });

    window.addEventListener("mousemove", (event) => {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
    });

    resize();
    seed();
    animate();

    window.addEventListener("beforeunload", () => {
        if (rafId) cancelAnimationFrame(rafId);
    });
})();
