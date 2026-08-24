(function () {
    const installationPhotos = [
        {
            title: "Symbiosis",
            src: "assets/PRI1_Photos/PRI1_1.JPG",
            copy: "A fully custom-built generative audio-visual system."
        },
        {
            title: "Translation",
            src: "assets/PRI1_Photos/PRI1_2.JPG",
            copy: "Plant bio-signals converted into live control data."
        },
        {
            title: "Vessel",
            src: "assets/PRI1_Photos/PRI1_3.JPG",
            copy: "The plant is functionally housed within a re-engineered computer chassis."
        },
        {
            title: "Architecture",
            src: "assets/PRI1_Photos/PRI1_4.JPG",
            copy: "Every digital audio process built from scratch in Max for Live."
        },
        {
            title: "Recursion",
            src: "assets/PRI1_Photos/PRI1_5.JPG",
            copy: "Live data controls sound, visuals, and light projected back onto the plant, closing the feedback loop."
        },
        {
            title: "State",
            src: "assets/PRI1_Photos/PRI1_6.JPG",
            copy: "A reactive 3D particle simulation visualises the system's internal state."
        },
        {
            title: "Rapture",
            src: "assets/PRI1_Photos/PRI1_7.JPG",
            copy: "A programmed audio-visual impact destroys and resets the ecology at its threshold."
        },
        {
            title: "Emergence",
            src: "assets/PRI1_Photos/PRI1_8.JPG",
            copy: "A Bernoulli-gate sampling architecture creates generative sonic output."
        },
        {
            title: "Flux",
            src: "assets/PRI1_Photos/PRI1_9.JPG",
            copy: "A hand-built granular engine continuously transforms the sound."
        },
        {
            title: "Sensing",
            src: "assets/PRI1_Photos/PRI1_10.JPG",
            copy: "Custom circuitry reads the plant's galvanic activity."
        },
        {
            title: "Resonance",
            src: "assets/PRI1_Photos/PRI1_11.JPG",
            copy: "Custom harmonic-resonance and feedback systems shape each cycle."
        }
    ];

    function padNumber(value) {
        return String(value).padStart(2, "0");
    }

    function initInstallationPage() {
        const shell = document.querySelector(".installation-shell");
        if (!shell || shell.dataset.ready === "true") return;
        shell.dataset.ready = "true";

        const track = shell.querySelector(".installation-track");
        const reel = shell.querySelector(".installation-reel");
        if (!track || !reel) return;

        let activeIndex = 0;
        let scrollFrame = null;
        let pendingActiveIndex = null;
        let activeSwitchTimer = null;

        const items = installationPhotos.map((photo, index) => {
            const figure = document.createElement("figure");
            figure.className = "installation-photo";
            figure.dataset.index = String(index);

            const button = document.createElement("button");
            button.className = "installation-photo-button";
            button.type = "button";
            button.setAttribute("aria-label", `Focus ${photo.title}`);

            const img = document.createElement("img");
            img.src = photo.src;
            img.alt = photo.title;
            img.loading = index < 3 ? "eager" : "lazy";
            img.decoding = "async";

            const caption = document.createElement("figcaption");
            caption.className = "installation-photo-detail";

            const count = document.createElement("span");
            count.className = "installation-photo-count";
            count.textContent = `${padNumber(index + 1)} / ${padNumber(installationPhotos.length)}`;

            const title = document.createElement("strong");
            title.textContent = photo.title;

            const copy = document.createElement("span");
            copy.textContent = photo.copy;

            button.appendChild(img);
            caption.append(count, title, copy);
            figure.append(button, caption);
            reel.appendChild(figure);

            button.addEventListener("click", () => {
                figure.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                setActive(index);
            });

            return figure;
        });

        function setActive(index) {
            if (activeSwitchTimer !== null) {
                window.clearTimeout(activeSwitchTimer);
                activeSwitchTimer = null;
            }
            pendingActiveIndex = null;
            activeIndex = index;
            items.forEach((item, itemIndex) => {
                const isActive = itemIndex === activeIndex;
                item.classList.toggle("is-active", isActive);
                item.querySelector(".installation-photo-button").setAttribute("aria-current", isActive ? "true" : "false");
            });
        }

        function scheduleActive(index) {
            if (index === activeIndex || index === pendingActiveIndex) return;
            pendingActiveIndex = index;
            if (activeSwitchTimer !== null) {
                window.clearTimeout(activeSwitchTimer);
            }
            activeSwitchTimer = window.setTimeout(() => {
                setActive(index);
            }, 90);
        }

        function syncActiveToScroll() {
            scrollFrame = null;
            const trackRect = track.getBoundingClientRect();
            const trackCenter = trackRect.left + trackRect.width / 2;
            let nearestIndex = activeIndex;
            let nearestDistance = Infinity;

            items.forEach((item, index) => {
                const rect = item.getBoundingClientRect();
                const itemCenter = rect.left + rect.width / 2;
                const distance = Math.abs(trackCenter - itemCenter);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            });

            if (nearestIndex !== activeIndex) scheduleActive(nearestIndex);
        }

        track.addEventListener("scroll", () => {
            if (scrollFrame !== null) return;
            scrollFrame = requestAnimationFrame(syncActiveToScroll);
        }, { passive: true });

        window.addEventListener("resize", syncActiveToScroll);

        setActive(0);

        requestAnimationFrame(() => {
            shell.classList.add("is-ready");
            syncActiveToScroll();
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
