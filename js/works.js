(function () {
    const CARD_TOGGLE_MS = 1080;
    const CARD_TOGGLE_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";
    const PANEL_FADE_IN_MS = 380;
    const PANEL_FADE_OUT_MS = 260;
    const DEFAULT_WORKS_TAB = "canon";
    const STREAM_PLATFORM_LABELS = {
        soundcloud: "SoundCloud",
        bandcamp: "Bandcamp",
        spotify: "Spotify",
        apple: "Apple Music"
    };
    const RELEASE_STREAMING_OPTIONS = {
        "9": {
            spotify: "https://open.spotify.com/track/0SLGFwoNVKL0gMmhRDaCxL?si=36ce6592986b4d4c",
            apple: "https://music.apple.com/ca/song/9/1626060321",
            soundcloud: "https://soundcloud.com/azzrell/9a-1?si=5a84b0e546fd42c5bc7c9f11658b7f73&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://azrel1.bandcamp.com/track/9"
        },
        "exstasis-2023": {
            spotify: "https://open.spotify.com/album/3qC60t84Owel6sdtSfS3ZW?si=wCLK-B7sQMG0877gQg0byA",
            apple: "https://music.apple.com/ca/album/exstasis/1687510874",
            soundcloud: "https://soundcloud.com/mizuha-cc/sets/mzh007-azrel-exstasis?si=a18b0289e1a24ebf935ed34a08555aff&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://mizuhamizuha.bandcamp.com/album/exstasis"
        },
        "exstasis-restored-2024": {
            spotify: "https://open.spotify.com/album/0J89bTI2qIN6EUDc9AFUrE?si=BfQ-7i4bRMm5GSYtsvaYZQ",
            apple: "https://music.apple.com/ca/album/exstasis-restored/1734126540",
            soundcloud: "https://soundcloud.com/mizuha-cc/sets/mzh010-azrel-exstasis-restored?si=c4cb8bbeec6d4a829d8a8d90ae92f05b&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://mizuhamizuha.bandcamp.com/album/exstasis-restored"
        },
        "sanzen": {
            spotify: "https://open.spotify.com/album/31DLSwcsm3O3hztMTPjyvp?si=juru1ItzRDW24lRsin4cMg",
            apple: "https://music.apple.com/ca/album/sanzen-single/1763949632",
            soundcloud: "https://soundcloud.com/genomeshanghai/sets/gnm038-azrel-renko-sanzen?si=d54dd0b420b745bf986e178da716f0c2&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://genome666mbp.bandcamp.com/album/gnm038-sanzen"
        },
        "re-gen": {
            spotify: "https://open.spotify.com/album/0FFPXSuZbKMcVVyWRFKmmM?si=FRlBc30VRKKgwgBvKqydOA",
            apple: "https://music.apple.com/ca/album/re-gen/1827115407",
            soundcloud: "https://soundcloud.com/mizuha-cc/sets/mzh017-azrel-negative-architecture-regen?si=c5476db0de7045b79765b6331ef8bebf&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://mizuhamizuha.bandcamp.com/album/re-gen"
        },
        "way-home": {
            spotify: "https://open.spotify.com/track/26yD9ohiJUrGDMVEgjSfoi?si=c6a647b387fb4fac",
            apple: "https://music.apple.com/ca/album/way-home-single/1869530875",
            soundcloud: "https://soundcloud.com/azzrell/way-home?si=07b423b98eda45f8b915ca53c82e1b53&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://azrel1.bandcamp.com/track/way-home"
        },
        "heliacal-rising": {
            spotify: "https://open.spotify.com/album/4HDaYdDB9Ojc3IThDa85it?si=UmDqtF8JTzWTLwQH2eb4IA",
            apple: "https://music.apple.com/ca/album/heliacal-rising-ep/1749062783",
            soundcloud: "https://soundcloud.com/hyperlinkfr/sets/quit-life-heliacal-rising?si=c3d0a71d7e504b81a96c1c4832daeb96&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://hyperlinkfr.bandcamp.com/album/quit-life-heliacal-rising"
        },
        "torrent": {
            spotify: "https://open.spotify.com/album/6awItUBFW5Gqt8XpNcUl11?si=u-BY9PBBS1u7BdeXXVtiIA",
            apple: "https://music.apple.com/ca/album/torrent/1772938673",
            soundcloud: "https://soundcloud.com/doubletakerecords/sets/torrent?si=63d1121fb1464f38b2bbb75f0d0a21e1&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://doubletakerecords.bandcamp.com/album/torrent"
        },
        "4-ever": {
            soundcloud: "https://soundcloud.com/azzrell/4ever?si=8f5dbe1d6bef47ae97f022c332dd1918&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://azrel1.bandcamp.com/track/4-ever"
        },
        "our-time-here-is-precious": {
            soundcloud: "https://soundcloud.com/formforum/our-time-here-is-precious-part-2?si=a47dc1327cf74c26b372cddf4baad909&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://formforum.bandcamp.com/album/our-time-here-is-precious?search_item_id%3D4022192116%26search_item_type%3Da%26search_match_part%3D%253F%26search_page_id%3D5183832652%26search_page_no%3D0%26search_rank%3D1="
        },
        "teen-pls-emily-glass-remix-vs-myen-hard-baile-refix-azrel-edit": {
            soundcloud: "https://soundcloud.com/azzrell/teen-pls-emily-glass-remix-x?si=95bcafa260bb4af3a60177970ed178fe&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing"
        },
        "4real": {
            spotify: "https://open.spotify.com/album/4D8083kbaQjrHdnycAizrk?si=N8tGpwILRNKws1yJPYSG7A",
            apple: "https://music.apple.com/ca/album/4real/1788907575",
            soundcloud: "https://soundcloud.com/reallivecph/sets/real-live-4real?si=f1c5b4f915f24d53ba15d7be9b8fc447&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://reallivemusic.bandcamp.com/album/4real"
        },
        "tuskebolso": {
            soundcloud: "https://soundcloud.com/marmintagency/nature-morte?si=e25738eea0b949d69720b49036f9afd1&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://marmintagency.bandcamp.com/album/t-skeb-lcs"
        },
        "global-tides": {
            spotify: "https://open.spotify.com/album/3ApHjJ5wHwEaF8YB8UIMXe?si=1ta7x-BPToSojFrKdpLhsg",
            apple: "https://music.apple.com/ca/album/global-tides/1818368333",
            soundcloud: "https://soundcloud.com/hyperlinkfr/sets/global-tides?si=160d0fc11b654a15a873e8b30b421344&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://hyperlinkfr.bandcamp.com/album/global-tides"
        },
        "solarmodern-nature-neotrance": {
            soundcloud: "https://soundcloud.com/eco-futurism-corp/sets/solarmodern-nature-neotrance?si=e2318fac02ea45d5b2512a119dce4631&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://eco-futurism-corp.bandcamp.com/album/solarmodern-nature-neotrance?search_item_id%3D3638361647%26search_item_type%3Da%26search_match_part%3D%253F%26search_page_id%3D5183843015%26search_page_no%3D0%26search_rank%3D1"
        },
        "remember": {
            soundcloud: "https://soundcloud.com/azzrell/sets/remember?si=95c2fb29cba0433f9c12b6e04f25a758&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://azrel1.bandcamp.com/album/remember"
        },
        "mirror-mirror": {
            soundcloud: "https://soundcloud.com/portraitureplatform/sets/various-artists-mirror-mirror?si=f0c1c75b5cf94347984983ee3a680e56&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://portraitureplatform.bandcamp.com/album/mirror-mirror"
        },
        "augment-where": {
            soundcloud: "https://soundcloud.com/azzrell/augment-where?si=0867d2061f104edbb08e8da0c246659f&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing"
        },
        "amager-plus": {
            spotify: "https://open.spotify.com/album/3KbzNgcygVc1fD8e8C34r7?si=-Tr5uOILTb-e6MPb-bzYvw",
            apple: "https://music.apple.com/ca/album/amager/1859606163",
            soundcloud: "https://soundcloud.com/reallivecph/sets/amager?si=cbf4f2c73ed44609b2e91396e72af851&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://reallivemusic.bandcamp.com/album/amager?search_item_id%3D3521490534%26search_item_type%3Da%26search_match_part%3D%253F%26search_page_id%3D5183848092%26search_page_no%3D0%26search_rank%3D1"
        },
        "li-042": {
            spotify: "https://open.spotify.com/album/7iEq4WLL1TwhX4YduWeaes?si=INrRzVKLQNSfBDagrdwqQQ",
            apple: "https://music.apple.com/ca/album/lis042/1876339498",
            soundcloud: "https://soundcloud.com/lowincomesquad/sets/lis042?si=cd637a741bd3461496b90897c5dd7ce4&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://lowincomesquad.bandcamp.com/album/li-042"
        },
        "exphoria": {
            soundcloud: "https://soundcloud.com/exphorialabel/sets/exphoria?si=51b39f4615aa4ca1ab2ea14846d560ff&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://exphoria.bandcamp.com/album/exphoria"
        },
        "isos-five-seasons-winter": {
            soundcloud: "https://soundcloud.com/mizuha-cc/sets/isos-five-seasons?si=a0b799417ba241df8614018121999432&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
            bandcamp: "https://mizuhamizuha.bandcamp.com/album/isos-five-seasons-3"
        }
    };

    function makeTag(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (typeof text === "string") el.textContent = text;
        return el;
    }

    function makeReleaseStreamLinks(release) {
        const cfg = RELEASE_STREAMING_OPTIONS[release.id] || {};
        const platformOrder = ["soundcloud", "bandcamp", "spotify", "apple"];
        return platformOrder
            .filter((platform) => typeof cfg[platform] === "string" && cfg[platform].trim() && STREAM_PLATFORM_LABELS[platform])
            .map((platform) => ({
                id: platform,
                label: STREAM_PLATFORM_LABELS[platform],
                href: cfg[platform].trim()
            }));
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
        if (release.primaryArtist) {
            factRows.splice(4, 0, ["Primary Artist", release.primaryArtist]);
        }
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
            const primary = Array.isArray(track.primaryArtists)
                ? track.primaryArtists.join(", ")
                : (track.primaryArtists || "");
            const featured = Array.isArray(track.featuredArtists)
                ? track.featuredArtists.join(", ")
                : (track.featuredArtists || "");
            const variants = [];
            if (track.remixBy) variants.push(`${track.remixBy} Remix`);
            if (track.kenjaRebuildBy) variants.push(`${track.kenjaRebuildBy} Kenja Rebuild`);
            if (variants.length > 0) {
                name.appendChild(makeTag("span", "track-variant", ` ${variants.join(", ")}`));
            }
            if (primary) {
                name.appendChild(makeTag("span", "track-feature", ` (w/ ${primary})`));
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
        const streamLinks = makeReleaseStreamLinks(release);
        if (streamLinks.length > 0) {
            const streamTitle = makeTag("h4", "release-stream-title", "Listen");
            const streamList = makeTag("div", "release-stream-links");
            streamLinks.forEach((stream) => {
                const link = makeTag("a", "release-stream-link", stream.label);
                link.href = stream.href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.dataset.platform = stream.id;
                link.dataset.uiSound = "streamLink";
                streamList.appendChild(link);
            });
            copy.appendChild(streamTitle);
            copy.appendChild(streamList);
        }
        panel.appendChild(figure);
        panel.appendChild(copy);
        details.appendChild(summary);
        details.appendChild(panel);

        return details;
    }

    function buildEmptyState(tabName) {
        const empty = makeTag("p", "releases-empty");
        if (tabName === "fragments") {
            empty.textContent = "No fragment releases published yet.";
        } else {
            empty.textContent = "No releases found in this section.";
        }
        return empty;
    }

    function getReleasesForTab(tabName) {
        const releases = Array.isArray(window.RELEASES_DATA) ? window.RELEASES_DATA : [];
        return releases
            .filter((release) => (release.catalog || DEFAULT_WORKS_TAB) === tabName)
            .sort((a, b) => Number(a.number || 0) - Number(b.number || 0));
    }

    function renderReleases(shell, tabName) {
        const list = shell.querySelector("#releases-list");
        if (!list) return [];
        list.innerHTML = "";

        const releases = getReleasesForTab(tabName);
        if (releases.length === 0) {
            list.appendChild(buildEmptyState(tabName));
            return [];
        }

        releases.forEach((release) => {
            list.appendChild(renderReleaseCard(release));
        });
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

    function bindCardInteractions(cards) {
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
    }

    function setActiveTab(shell, tabName) {
        const tabs = Array.from(shell.querySelectorAll(".works-tab"));
        tabs.forEach((tab) => {
            const isActive = tab.dataset.worksTab === tabName;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        shell.dataset.activeTab = tabName;
    }

    function updateHeaderCopy(shell, tabName, count) {
        const description = shell.querySelector("#works-description");
        if (!description) return;
        if (tabName === "fragments") {
            description.textContent = `${count} fragment ${count === 1 ? "release" : "releases"}. Secondary catalogue.`;
            return;
        }
        description.textContent = `${count} canon ${count === 1 ? "release" : "releases"}. Main primary catalogue.`;
    }

    function initWorksPage() {
        const shell = document.querySelector(".works-shell");
        if (!shell) return;
        if (shell.dataset.ready === "true") return;
        shell.dataset.ready = "true";

        const renderTab = (tabName) => {
            setActiveTab(shell, tabName);
            const cards = renderReleases(shell, tabName);
            bindCardInteractions(cards);
            updateHeaderCopy(shell, tabName, cards.length);
        };

        const tabs = Array.from(shell.querySelectorAll(".works-tab"));
        tabs.forEach((tabButton) => {
            tabButton.addEventListener("click", () => {
                const tabName = tabButton.dataset.worksTab || DEFAULT_WORKS_TAB;
                if ((shell.dataset.activeTab || DEFAULT_WORKS_TAB) === tabName) return;
                renderTab(tabName);
            });
        });

        renderTab(DEFAULT_WORKS_TAB);
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
