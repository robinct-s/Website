(function () {
    const TOGGLE_MS = 620;
    const TOGGLE_EASE = "cubic-bezier(0.22, 0.64, 0.2, 1)";
    let videoModeActive = false;

    function makeTag(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (typeof text === "string") el.textContent = text;
        return el;
    }

    function setCount(el, count) {
        if (!el) return;
        el.textContent = `${count} ${count === 1 ? "project" : "projects"}`;
    }

    function renderCard(item) {
        const card = makeTag("details", "sd-card");
        card.dataset.id = item.id || "";

        const summary = document.createElement("summary");
        const brand = makeTag("span", "sd-brand", item.brand || "");
        const title = makeTag("span", "sd-title", item.title || "");
        const icon = makeTag("span", "sd-icon");
        icon.setAttribute("aria-hidden", "true");

        summary.appendChild(brand);
        summary.appendChild(title);
        summary.appendChild(icon);

        const panel = makeTag("div", "sd-panel");
        const videoWrap = makeTag("div", "sd-video");
        const iframe = document.createElement("iframe");
        iframe.loading = "lazy";
        iframe.src = `https://www.youtube.com/embed/${item.youtubeId || ""}`;
        iframe.title = `${item.brand || "Project"} video`;
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.allowFullscreen = true;

        videoWrap.appendChild(iframe);
        panel.appendChild(videoWrap);
        card.appendChild(summary);
        card.appendChild(panel);
        return card;
    }

    function renderGroup(container, items) {
        if (!container) return [];
        if (container.dataset.rendered === "true") {
            return Array.from(container.querySelectorAll(".sd-card"));
        }
        (items || []).forEach((item) => {
            container.appendChild(renderCard(item));
        });
        container.dataset.rendered = "true";
        return Array.from(container.querySelectorAll(".sd-card"));
    }

    function setVideoMode(active) {
        if (videoModeActive === active) return;
        videoModeActive = active;
        document.body.classList.toggle("video-focus-active", active);
        window.dispatchEvent(new CustomEvent("sdvideomodechange", {
            detail: { active }
        }));
    }

    function animateOpen(card, onDone) {
        if (card.dataset.animating === "true") return;
        card.dataset.animating = "true";

        const start = card.offsetHeight;
        card.open = true;
        const end = card.offsetHeight;

        card.style.overflow = "hidden";
        card.style.height = `${start}px`;
        const animation = card.animate(
            [{ height: `${start}px` }, { height: `${end}px` }],
            { duration: TOGGLE_MS, easing: TOGGLE_EASE }
        );

        animation.onfinish = () => {
            card.style.height = "";
            card.style.overflow = "";
            card.dataset.animating = "false";
            if (typeof onDone === "function") onDone();
        };
        animation.oncancel = () => {
            card.style.height = "";
            card.style.overflow = "";
            card.dataset.animating = "false";
            if (typeof onDone === "function") onDone();
        };
    }

    function animateClose(card, onDone) {
        if (card.dataset.animating === "true") return;
        card.dataset.animating = "true";

        const summary = card.querySelector("summary");
        const start = card.offsetHeight;
        const end = summary ? summary.offsetHeight : 0;

        card.style.overflow = "hidden";
        card.style.height = `${start}px`;
        const animation = card.animate(
            [{ height: `${start}px` }, { height: `${end}px` }],
            { duration: TOGGLE_MS, easing: TOGGLE_EASE }
        );

        animation.onfinish = () => {
            card.open = false;
            card.style.height = "";
            card.style.overflow = "";
            card.dataset.animating = "false";
            if (typeof onDone === "function") onDone();
        };
        animation.oncancel = () => {
            card.style.height = "";
            card.style.overflow = "";
            card.dataset.animating = "false";
            if (typeof onDone === "function") onDone();
        };
    }

    function wireCards(cards) {
        const syncVideoMode = () => {
            const anyOpen = cards.some((card) => card.open || card.dataset.animating === "true");
            setVideoMode(anyOpen);
        };

        cards.forEach((card, index) => {
            card.style.transitionDelay = `${index * 45}ms`;

            const summary = card.querySelector("summary");
            if (summary) {
                summary.addEventListener("click", (event) => {
                    event.preventDefault();
                    if (card.dataset.animating === "true") return;
                    if (card.open) {
                        window.dispatchEvent(new CustomEvent("sdvideocloseintent"));
                        animateClose(card, syncVideoMode);
                        syncVideoMode();
                        return;
                    }
                    cards.forEach((other) => {
                        if (other !== card && other.open) animateClose(other, syncVideoMode);
                    });
                    animateOpen(card, syncVideoMode);
                    syncVideoMode();
                });
            }

            card.addEventListener("mousemove", (event) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                card.style.setProperty("--my", `${event.clientY - rect.top}px`);
            });
        });
    }

    function initSoundDesignPage() {
        const shell = document.querySelector(".sd-shell");
        if (!shell) return;
        if (shell.dataset.ready === "true") return;
        shell.dataset.ready = "true";

        const data = window.SOUND_DESIGN_DATA || {};
        const commercial = Array.isArray(data.commercial) ? data.commercial : [];
        const game = Array.isArray(data.game) ? data.game : [];

        const commercialList = shell.querySelector("#sd-commercial-list");
        const gameList = shell.querySelector("#sd-game-list");
        const commercialCount = shell.querySelector("#sd-commercial-count");
        const gameCount = shell.querySelector("#sd-game-count");

        const commercialCards = renderGroup(commercialList, commercial);
        const gameCards = renderGroup(gameList, game);

        setCount(commercialCount, commercial.length);
        setCount(gameCount, game.length);

        const allCards = [...commercialCards, ...gameCards];
        wireCards(allCards);

        requestAnimationFrame(() => {
            shell.classList.add("is-ready");
        });
    }

    window.addEventListener("pagechange", (event) => {
        const page = event && event.detail && event.detail.page;
        if (page !== "sound-design") {
            setVideoMode(false);
            return;
        }
        initSoundDesignPage();
    });

    window.addEventListener("load", () => {
        if (document.body.dataset.page === "sound-design") {
            initSoundDesignPage();
        }
    });
})();
