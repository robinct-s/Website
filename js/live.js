(function () {
    function makeTag(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (typeof text === "string") el.textContent = text;
        return el;
    }

    function renderEventItem(eventData) {
        const item = makeTag("li", "live-item");
        const primary = makeTag("div", "live-primary");
        const name = makeTag("span", "live-name", eventData.name || "");
        const city = makeTag("span", "live-city", eventData.city || "");
        const date = makeTag("time", "live-date", eventData.dateLabel || "");
        if (eventData.dateIso) {
            date.setAttribute("datetime", eventData.dateIso);
        }
        primary.appendChild(name);
        primary.appendChild(city);
        item.appendChild(primary);
        item.appendChild(date);
        return item;
    }

    function getEventYear(eventData) {
        if (!eventData) return "";
        if (typeof eventData.dateIso === "string" && eventData.dateIso.length >= 4) {
            return eventData.dateIso.slice(0, 4);
        }
        if (typeof eventData.dateLabel === "string") {
            const match = eventData.dateLabel.match(/\b(19|20)\d{2}\b/);
            if (match) return match[0];
        }
        return "";
    }

    function renderYearDivider(year) {
        return makeTag("li", "live-year-divider", year || "Unknown Year");
    }

    function setCount(el, count) {
        if (!el) return;
        el.textContent = `${count} ${count === 1 ? "event" : "events"}`;
    }

    function renderLiveData(shell) {
        const upcomingList = shell.querySelector("#live-upcoming-list");
        const archiveList = shell.querySelector("#live-archive-list");
        const upcomingCount = shell.querySelector("#live-upcoming-count");
        const archiveCount = shell.querySelector("#live-archive-count");
        if (!upcomingList || !archiveList) return [];
        if (shell.dataset.rendered === "true") {
            return Array.from(shell.querySelectorAll(".live-item"));
        }

        const data = window.LIVE_EVENTS_DATA || {};
        const upcoming = Array.isArray(data.upcoming) ? data.upcoming : [];
        const archive = Array.isArray(data.archive) ? data.archive : [];

        upcoming.forEach((eventData) => {
            upcomingList.appendChild(renderEventItem(eventData));
        });
        let currentYear = "";
        archive.forEach((eventData) => {
            const year = getEventYear(eventData);
            if (year && year !== currentYear) {
                archiveList.appendChild(renderYearDivider(year));
                currentYear = year;
            }
            archiveList.appendChild(renderEventItem(eventData));
        });

        setCount(upcomingCount, upcoming.length);
        setCount(archiveCount, archive.length);

        shell.dataset.rendered = "true";
        return Array.from(shell.querySelectorAll(".live-item"));
    }

    function initLivePage() {
        const shell = document.querySelector(".live-shell");
        if (!shell) return;
        if (shell.dataset.ready === "true") return;
        shell.dataset.ready = "true";

        const items = renderLiveData(shell);
        items.forEach((item, index) => {
            item.style.transitionDelay = `${index * 40}ms`;
            item.addEventListener("mousemove", (event) => {
                const rect = item.getBoundingClientRect();
                item.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                item.style.setProperty("--my", `${event.clientY - rect.top}px`);
            });
        });

        requestAnimationFrame(() => {
            shell.classList.add("is-ready");
        });
    }

    window.addEventListener("pagechange", (event) => {
        const page = event && event.detail && event.detail.page;
        if (page !== "live") return;
        initLivePage();
    });

    window.addEventListener("load", () => {
        if (document.body.dataset.page === "live") {
            initLivePage();
        }
    });
})();
