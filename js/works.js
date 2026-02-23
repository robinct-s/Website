(function () {
    const CARD_TOGGLE_MS = 1080;
    const CARD_TOGGLE_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";
    const PANEL_FADE_IN_MS = 380;
    const PANEL_FADE_OUT_MS = 260;

    function makeTag(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (typeof text === "string") el.textContent = text;
        return el;
    }

    function renderReleaseCard(release) {
        const details = makeTag("details", "release-card");
        details.dataset.releaseId = release.id || "";

        const summary = document.createElement("summary");
        const number = makeTag("span", "release-number", release.number || "");
        const main = makeTag("span", "release-main");
        const name = makeTag("span", "release-name", release.title || "");
        const meta = makeTag(
            "span",
            "release-meta",
            `${release.year || ""} \u00B7 ${release.format || ""} \u00B7 ${release.trackCount || 0} tracks`
        );
        const indicator = makeTag("span", "release-toggle-indicator");
        indicator.setAttribute("aria-hidden", "true");

        main.appendChild(name);
        main.appendChild(meta);
        summary.appendChild(number);
        summary.appendChild(main);
        summary.appendChild(indicator);

        const panel = makeTag("div", "release-panel");
        const figure = makeTag("figure", "release-art");
        figure.dataset.imageState = "loading";
        figure.setAttribute("role", "img");
        figure.setAttribute("aria-label", `${release.title || "Release"} artwork`);
        const artworkSrc = release.artworkRef || "assets/releases/replace-me.jpg";
        const artImage = makeTag("img", "release-art-image");
        artImage.loading = "lazy";
        artImage.decoding = "async";
        artImage.alt = `${release.title || "Release"} artwork`;
        artImage.src = artworkSrc;
        const artLabel = makeTag(
            "span",
            "release-art-label",
            `Image ref: ${artworkSrc}`
        );
        artImage.addEventListener("load", () => {
            figure.dataset.imageState = "loaded";
        });
        artImage.addEventListener("error", () => {
            figure.dataset.imageState = "missing";
            artImage.remove();
        });
        figure.appendChild(artImage);
        figure.appendChild(artLabel);

        const copy = makeTag("div", "release-copy");
        const facts = makeTag("dl", "release-facts");
        const factRows = [
            ["Title", release.title || ""],
            ["Year", release.year || ""],
            ["Format", release.format || ""],
            ["Label", release.label || ""],
            ["Track Count", String(release.trackCount || 0)],
            ["Artwork", release.artworkCredit || ""],
            ["Mix", release.mixCredit || ""],
            ["Master", release.masterCredit || ""]
        ];
        factRows.forEach(([label, value]) => {
            const row = document.createElement("div");
            row.appendChild(makeTag("dt", "", label));
            row.appendChild(makeTag("dd", "", value));
            facts.appendChild(row);
        });

        const tracksTitle = makeTag("h4", "release-tracks-title", "Tracks");
        const tracks = makeTag("ol", "release-tracks");
        (release.tracks || []).forEach((track) => {
            const item = document.createElement("li");
            const name = makeTag("span", "track-name", track.title || "");
            const featured = Array.isArray(track.featuredArtists)
                ? track.featuredArtists.join(", ")
                : (track.featuredArtists || "");
            const variants = [];
            if (track.remixBy) variants.push(`${track.remixBy} Remix`);
            if (track.kenjaRebuildBy) variants.push(`${track.kenjaRebuildBy} Kenja Rebuild`);
            if (variants.length > 0) {
                name.appendChild(makeTag("span", "track-variant", ` ${variants.join(", ")}`));
            }
            if (featured) {
                name.appendChild(makeTag("span", "track-feature", ` (+ ${featured})`));
            }
            item.appendChild(name);
            item.appendChild(makeTag("span", "track-time", track.duration || ""));
            tracks.appendChild(item);
        });

        copy.appendChild(facts);
        copy.appendChild(tracksTitle);
        copy.appendChild(tracks);
        panel.appendChild(figure);
        panel.appendChild(copy);
        details.appendChild(summary);
        details.appendChild(panel);

        return details;
    }

    function renderReleases(shell) {
        const list = shell.querySelector("#releases-list");
        if (!list) return [];
        if (list.dataset.rendered === "true") {
            return Array.from(list.querySelectorAll(".release-card"));
        }

        const releases = Array.isArray(window.RELEASES_DATA) ? window.RELEASES_DATA : [];
        releases.forEach((release) => {
            list.appendChild(renderReleaseCard(release));
        });
        list.dataset.rendered = "true";
        return Array.from(list.querySelectorAll(".release-card"));
    }

    function animateOpen(card) {
        if (card.dataset.animating === "true") return;
        card.dataset.animating = "true";
        card.classList.remove("is-collapsing");
        card.classList.add("is-expanding");

        const summary = card.querySelector("summary");
        const panel = card.querySelector(".release-panel");
        if (!summary) {
            card.open = true;
            card.classList.remove("is-expanding");
            card.dataset.animating = "false";
            return;
        }

        const startHeight = card.offsetHeight;
        card.open = true;
        const endHeight = card.offsetHeight;

        const animation = card.animate(
            [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
            { duration: CARD_TOGGLE_MS, easing: CARD_TOGGLE_EASING }
        );

        card.style.overflow = "hidden";
        card.style.height = `${startHeight}px`;

        animation.onfinish = () => {
            card.style.height = "";
            card.style.overflow = "";
            card.classList.remove("is-expanding");
            if (panel) {
                panel.animate(
                    [
                        { opacity: 0, transform: "translateY(5px)" },
                        { opacity: 1, transform: "translateY(0)" }
                    ],
                    { duration: PANEL_FADE_IN_MS, easing: "ease-out", fill: "both" }
                );
            }
            card.dataset.animating = "false";
        };

        animation.oncancel = () => {
            card.style.height = "";
            card.style.overflow = "";
            card.classList.remove("is-expanding");
            card.dataset.animating = "false";
        };
    }

    function animateClose(card) {
        if (card.dataset.animating === "true") return;
        card.dataset.animating = "true";
        card.classList.add("is-collapsing");

        const summary = card.querySelector("summary");
        const panel = card.querySelector(".release-panel");
        if (!summary) {
            card.open = false;
            card.classList.remove("is-collapsing");
            card.dataset.animating = "false";
            return;
        }

        const startCollapse = () => {
            const startHeight = card.offsetHeight;
            const endHeight = summary.offsetHeight;

            const animation = card.animate(
                [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
                { duration: CARD_TOGGLE_MS, easing: CARD_TOGGLE_EASING }
            );

            card.style.overflow = "hidden";
            card.style.height = `${startHeight}px`;

            animation.onfinish = () => {
                card.open = false;
                card.style.height = "";
                card.style.overflow = "";
                card.classList.remove("is-collapsing");
                card.dataset.animating = "false";
            };

            animation.oncancel = () => {
                card.style.height = "";
                card.style.overflow = "";
                card.classList.remove("is-collapsing");
                card.dataset.animating = "false";
            };
        };

        if (panel) {
            const fadeOut = panel.animate(
                [
                    { opacity: 1, transform: "translateY(0)" },
                    { opacity: 0, transform: "translateY(-4px)" }
                ],
                { duration: PANEL_FADE_OUT_MS, easing: "ease-in", fill: "both" }
            );
            fadeOut.onfinish = () => {
                startCollapse();
            };
            fadeOut.oncancel = () => {
                startCollapse();
            };
        } else {
            startCollapse();
        }
    }

    function closeOtherCards(cards, activeCard) {
        cards.forEach((card) => {
            if (card === activeCard || !card.open) return;
            animateClose(card);
        });
    }

    function initWorksPage() {
        const shell = document.querySelector(".works-shell");
        if (!shell) return;
        if (shell.dataset.ready === "true") return;
        shell.dataset.ready = "true";

        const cards = renderReleases(shell);
        cards.forEach((card, index) => {
            card.style.transitionDelay = `${index * 45}ms`;

            const summary = card.querySelector("summary");
            if (summary) {
                summary.addEventListener("click", (event) => {
                    event.preventDefault();
                    if (card.dataset.animating === "true") return;

                    if (card.open) {
                        animateClose(card);
                        return;
                    }

                    closeOtherCards(cards, card);
                    animateOpen(card);
                });
            }

            card.addEventListener("mousemove", (event) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                card.style.setProperty("--my", `${event.clientY - rect.top}px`);
            });
        });

        requestAnimationFrame(() => {
            shell.classList.add("is-ready");
        });
    }

    window.addEventListener("pagechange", (event) => {
        const page = event && event.detail && event.detail.page;
        if (page !== "works") return;
        initWorksPage();
    });

    window.addEventListener("load", () => {
        if (document.body.dataset.page === "works") {
            initWorksPage();
        }
    });
})();
