(function () {
    function initLabelPage() {
        const shell = document.querySelector(".label-shell");
        if (!shell) return;
        if (shell.dataset.ready === "true") return;
        shell.dataset.ready = "true";

        const list = shell.querySelector("#label-releases-list");
        const count = shell.querySelector("#label-release-count");
        const releases = Array.isArray(window.LABEL_RELEASES_DATA) ? window.LABEL_RELEASES_DATA : [];
        const links = Array.from(shell.querySelectorAll(".about-link"));

        if (count) {
            count.textContent = `${releases.length} ${releases.length === 1 ? "release" : "releases"}`;
        }

        if (list && window.ReleaseCards) {
            list.innerHTML = "";
            releases.forEach((release) => {
                list.appendChild(window.ReleaseCards.renderReleaseCard(release));
            });
            window.ReleaseCards.bindCardInteractions(Array.from(list.querySelectorAll(".release-card")));
        }

        links.forEach((link, index) => {
            link.style.transitionDelay = `${index * 38}ms`;
            link.addEventListener("mousemove", (event) => {
                const rect = link.getBoundingClientRect();
                link.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                link.style.setProperty("--my", `${event.clientY - rect.top}px`);
            });
        });

        requestAnimationFrame(() => {
            shell.classList.add("is-ready");
        });
    }

    window.addEventListener("pagechange", (event) => {
        const page = event && event.detail && event.detail.page;
        if (page !== "label") return;
        initLabelPage();
    });

    window.addEventListener("load", () => {
        if (document.body.dataset.page === "label") {
            initLabelPage();
        }
    });
})();
