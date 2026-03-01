(function () {
    function makeTag(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (typeof text === "string") el.textContent = text;
        return el;
    }

    function setCount(el, count) {
        if (!el) return;
        el.textContent = `${count} ${count === 1 ? "link" : "links"}`;
    }

    function renderLinkCard(item) {
        const isClickable = typeof item.url === "string" && item.url.length > 0;
        const link = makeTag(isClickable ? "a" : "div", "about-link");
        if (isClickable) {
            link.href = item.url;
            if (item.url.startsWith("mailto:")) {
                link.rel = "noopener noreferrer";
            } else {
                link.target = "_blank";
                link.rel = "noopener noreferrer";
            }
            link.setAttribute("data-ui-sound", "menu");
        } else {
            link.classList.add("is-static");
        }

        const label = makeTag("span", "about-link-label", item.label || "");
        const handle = makeTag("span", "about-link-handle", item.handle || "");
        const icon = isClickable ? makeTag("span", "about-link-icon") : null;
        if (icon) icon.setAttribute("aria-hidden", "true");

        link.appendChild(label);
        link.appendChild(handle);
        if (icon) link.appendChild(icon);

        if (isClickable) {
            link.addEventListener("mousemove", (event) => {
                const rect = link.getBoundingClientRect();
                link.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                link.style.setProperty("--my", `${event.clientY - rect.top}px`);
            });
        }

        return link;
    }

    function renderGroup(container, items) {
        if (!container) return [];
        if (container.dataset.rendered === "true") {
            return Array.from(container.querySelectorAll(".about-link"));
        }
        (items || []).forEach((item) => {
            container.appendChild(renderLinkCard(item));
        });
        container.dataset.rendered = "true";
        return Array.from(container.querySelectorAll(".about-link"));
    }

    function initAboutPage() {
        const shell = document.querySelector(".about-shell");
        if (!shell) return;
        if (shell.dataset.ready === "true") return;
        shell.dataset.ready = "true";

        const data = window.ABOUT_LINKS_DATA || {};
        const social = Array.isArray(data.social) ? data.social : [];
        const streaming = Array.isArray(data.streaming) ? data.streaming : [];
        const contact = Array.isArray(data.contact) ? data.contact : [];

        const socialList = shell.querySelector("#about-social-list");
        const streamList = shell.querySelector("#about-stream-list");
        const contactList = shell.querySelector("#about-contact-list");
        const socialCount = shell.querySelector("#about-social-count");
        const streamCount = shell.querySelector("#about-stream-count");
        const contactCount = shell.querySelector("#about-contact-count");

        const socialLinks = renderGroup(socialList, social);
        const streamLinks = renderGroup(streamList, streaming);
        const contactLinks = renderGroup(contactList, contact);
        setCount(socialCount, social.length);
        setCount(streamCount, streaming.length);
        setCount(contactCount, contact.length);

        [...socialLinks, ...streamLinks, ...contactLinks].forEach((link, index) => {
            link.style.transitionDelay = `${index * 38}ms`;
        });

        requestAnimationFrame(() => {
            shell.classList.add("is-ready");
        });
    }

    window.addEventListener("pagechange", (event) => {
        const page = event && event.detail && event.detail.page;
        if (page !== "about") return;
        initAboutPage();
    });

    window.addEventListener("load", () => {
        if (document.body.dataset.page === "about") {
            initAboutPage();
        }
    });
})();
