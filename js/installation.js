(function () {
    function initInstallationPage() {
        const shell = document.querySelector(".installation-shell");
        if (!shell || shell.dataset.ready === "true") return;
        shell.dataset.ready = "true";

        const panel = shell.querySelector(".installation-ui");
        if (panel) {
            panel.addEventListener("mousemove", (event) => {
                const rect = panel.getBoundingClientRect();
                panel.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                panel.style.setProperty("--my", `${event.clientY - rect.top}px`);
            });
        }

        requestAnimationFrame(() => {
            shell.classList.add("is-ready");
        });
    }

    window.addEventListener("pagechange", (event) => {
        const page = event && event.detail && event.detail.page;
        if (page !== "installation") return;
        initInstallationPage();
    });

    window.addEventListener("load", () => {
        if (document.body.dataset.page === "installation") {
            initInstallationPage();
        }
    });
})();
