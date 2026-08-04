(function () {
    function makeTag(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (typeof text === "string") el.textContent = text;
        return el;
    }

    function renderFacts(item) {
        const facts = makeTag("dl", "physical-facts");
        [
            ["Edition", item.edition],
            ["Release", item.release],
            ["Information", item.information]
        ].forEach(([label, value]) => {
            if (!value) return;
            const row = document.createElement("div");
            row.appendChild(makeTag("dt", "", label));
            const detail = makeTag("dd", "", value);
            if (label === "Information" && item.informationCredit) {
                detail.appendChild(makeTag("span", "physical-info-credit", item.informationCredit));
            }
            row.appendChild(detail);
            facts.appendChild(row);
        });
        return facts;
    }

    function renderImages(item) {
        const media = makeTag("div", "physical-media");
        const images = Array.isArray(item.images) ? item.images : [];
        const stage = makeTag("figure", "physical-image-stage");
        const image = makeTag("img", "physical-image");
        let activeImageIndex = 0;
        let imageSwitchTimer = null;
        image.loading = "lazy";
        image.decoding = "async";
        image.src = images[0] && images[0].src ? images[0].src : "";
        image.alt = images[0] && images[0].alt ? images[0].alt : `${item.title || "Physical release"} product image`;
        stage.appendChild(image);
        media.appendChild(stage);

        if (images.length > 1) {
            const controls = makeTag("div", "physical-image-controls");
            images.forEach((asset, index) => {
                const button = makeTag("button", "physical-image-button", String(index + 1).padStart(2, "0"));
                button.type = "button";
                button.setAttribute("aria-label", `Show ${item.title || "release"} image ${index + 1}`);
                button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
                if (index === 0) button.classList.add("is-active");
                button.addEventListener("click", () => {
                    if (index === activeImageIndex) return;
                    activeImageIndex = index;
                    if (imageSwitchTimer !== null) {
                        window.clearTimeout(imageSwitchTimer);
                    }
                    stage.classList.add("is-switching");
                    imageSwitchTimer = window.setTimeout(() => {
                        image.src = asset.src || "";
                        image.alt = asset.alt || `${item.title || "Physical release"} product image ${index + 1}`;
                        stage.classList.remove("is-switching");
                        imageSwitchTimer = null;
                    }, 360);
                    controls.querySelectorAll(".physical-image-button").forEach((control, controlIndex) => {
                        const isActive = controlIndex === index;
                        control.classList.toggle("is-active", isActive);
                        control.setAttribute("aria-pressed", isActive ? "true" : "false");
                    });
                });
                controls.appendChild(button);
            });
            media.appendChild(controls);
        }

        return media;
    }

    function renderPhysical(item, index) {
        const article = makeTag("article", "physical-card");
        article.dataset.id = item.id || "";
        article.style.transitionDelay = `${index * 45}ms`;

        const media = renderImages(item);
        const copy = makeTag("div", "physical-copy");
        const title = makeTag("h3", "physical-title", item.title || "");
        const format = makeTag("span", "physical-format", item.format || "");
        const heading = makeTag("div", "physical-heading");
        heading.appendChild(title);
        heading.appendChild(format);

        copy.appendChild(heading);
        copy.appendChild(renderFacts(item));
        if (item.bonusTrack || item.bonusNote) {
            const bonus = makeTag("div", "physical-bonus");
            if (item.bonusTrack) {
                bonus.appendChild(makeTag("p", "physical-bonus-track", item.bonusTrack));
            }
            if (item.bonusNote) {
                bonus.appendChild(makeTag("p", "physical-bonus-note", item.bonusNote));
            }
            copy.appendChild(bonus);
        }
        if (item.purchaseUrl) {
            const purchase = makeTag("div", "release-stream-links physical-purchase-links");
            const link = makeTag("a", "release-stream-link physical-purchase-link", "Purchase");
            link.href = item.purchaseUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.dataset.uiSound = "streamLink";
            link.dataset.uiHoverSound = "streamLinkHover";
            purchase.appendChild(link);
            copy.appendChild(purchase);
        }

        article.appendChild(media);
        article.appendChild(copy);
        return article;
    }

    function initPhysicalsPage() {
        const shell = document.querySelector(".physicals-shell");
        if (!shell || shell.dataset.ready === "true") return;
        shell.dataset.ready = "true";

        const list = shell.querySelector("#physicals-list");
        const items = Array.isArray(window.PHYSICALS_DATA) ? window.PHYSICALS_DATA : [];
        if (list) {
            list.innerHTML = "";
            items.forEach((item, index) => {
                list.appendChild(renderPhysical(item, index));
            });
        }

        requestAnimationFrame(() => {
            shell.classList.add("is-ready");
        });
    }

    window.addEventListener("pagechange", (event) => {
        const page = event && event.detail && event.detail.page;
        if (page !== "physicals") return;
        initPhysicalsPage();
    });

    window.addEventListener("load", () => {
        if (document.body.dataset.page === "physicals") {
            initPhysicalsPage();
        }
    });
})();
