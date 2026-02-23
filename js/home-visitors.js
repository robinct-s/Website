(function () {
    const USERNAME_KEY = "stasis-visitor-username";
    const LOCAL_FEED_KEY = "stasis-visitor-feed-v1";
    const MAX_NAME_LEN = 24;
    const MAX_MESSAGE_LEN = 220;
    const MAX_ITEMS = 120;

    function clampText(value, maxLen) {
        return (value || "").trim().replace(/\s+/g, " ").slice(0, maxLen);
    }

    function getApiEndpoint() {
        const cfg = window.VISITORS_CONFIG || {};
        return typeof cfg.endpoint === "string" ? cfg.endpoint.trim() : "";
    }

    function getSupabaseConfig() {
        const cfg = window.VISITORS_CONFIG || {};
        const supabaseUrl = typeof cfg.supabaseUrl === "string" ? cfg.supabaseUrl.trim() : "";
        const publishableKey = typeof cfg.publishableKey === "string" ? cfg.publishableKey.trim() : "";
        if (!supabaseUrl || !publishableKey) return null;
        const table = typeof cfg.table === "string" && cfg.table.trim() ? cfg.table.trim() : "visitors";
        return { supabaseUrl, publishableKey, table };
    }

    function readLocalFeed() {
        try {
            const raw = localStorage.getItem(LOCAL_FEED_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }

    function writeLocalFeed(items) {
        try {
            localStorage.setItem(LOCAL_FEED_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
        } catch (_) {
            // ignore quota / storage errors
        }
    }

    function normalizeEntry(raw) {
        if (!raw || typeof raw !== "object") return null;
        const username = clampText(raw.username || raw.name, MAX_NAME_LEN);
        const message = clampText(raw.message || raw.comment, MAX_MESSAGE_LEN);
        const createdAt =
            (typeof raw.createdAt === "string" && raw.createdAt) ||
            (typeof raw.created_at === "string" && raw.created_at) ||
            new Date().toISOString();
        if (!username || !message) return null;
        return { username, message, createdAt };
    }

    async function fetchRemoteFeed(endpoint) {
        const res = await fetch(endpoint, { method: "GET", credentials: "omit" });
        if (!res.ok) throw new Error("Failed to load visitors");
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
        return arr.map(normalizeEntry).filter(Boolean).slice(0, MAX_ITEMS);
    }

    async function postRemoteEntry(endpoint, entry) {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "omit",
            body: JSON.stringify(entry)
        });
        if (!res.ok) throw new Error("Failed to post comment");
    }

    async function fetchSupabaseFeed(config) {
        const url = `${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.table)}?select=username,message,created_at&order=created_at.desc&limit=${MAX_ITEMS}`;
        const headers = {
            apikey: config.publishableKey,
            Authorization: `Bearer ${config.publishableKey}`
        };
        const res = await fetch(url, { method: "GET", headers, credentials: "omit" });
        if (!res.ok) throw new Error("Failed to load visitors");
        const data = await res.json();
        return (Array.isArray(data) ? data : []).map(normalizeEntry).filter(Boolean);
    }

    async function postSupabaseEntry(config, entry) {
        const url = `${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.table)}`;
        const payload = [{
            username: entry.username,
            message: entry.message,
            created_at: entry.createdAt
        }];
        const headers = {
            apikey: config.publishableKey,
            Authorization: `Bearer ${config.publishableKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
        };
        const res = await fetch(url, {
            method: "POST",
            headers,
            credentials: "omit",
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to post comment");
    }

    function formatTimestamp(value) {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        const day = `${d.getDate()}`.padStart(2, "0");
        const month = `${d.getMonth() + 1}`.padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function setNote(noteEl, text) {
        if (!noteEl) return;
        noteEl.textContent = text || "";
    }

    function renderFeed(feedEl, items) {
        if (!feedEl) return;
        feedEl.innerHTML = "";
        if (!items || items.length === 0) {
            const empty = document.createElement("li");
            empty.className = "visitor-entry";
            empty.textContent = "No messages yet.";
            feedEl.appendChild(empty);
            return;
        }
        items.forEach((entry) => {
            const li = document.createElement("li");
            li.className = "visitor-entry";
            li.addEventListener("mousemove", (event) => {
                const rect = li.getBoundingClientRect();
                li.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                li.style.setProperty("--my", `${event.clientY - rect.top}px`);
            });

            const head = document.createElement("div");
            head.className = "visitor-entry-head";
            const name = document.createElement("span");
            name.className = "visitor-entry-name";
            name.textContent = entry.username;
            const time = document.createElement("time");
            time.className = "visitor-entry-time";
            time.textContent = formatTimestamp(entry.createdAt);
            head.appendChild(name);
            head.appendChild(time);

            const msg = document.createElement("p");
            msg.className = "visitor-entry-message";
            msg.textContent = entry.message;

            li.appendChild(head);
            li.appendChild(msg);
            feedEl.appendChild(li);
        });
    }

    function lockUsername(inputEl, username) {
        if (!inputEl || !username) return;
        inputEl.value = username;
        inputEl.readOnly = true;
        inputEl.setAttribute("aria-readonly", "true");
    }

    function initVisitorsHome() {
        const panel = document.querySelector(".visitors-panel");
        if (!panel) return;
        if (panel.dataset.ready === "true") return;
        panel.dataset.ready = "true";
        panel.addEventListener("mousemove", (event) => {
            const rect = panel.getBoundingClientRect();
            panel.style.setProperty("--mx", `${event.clientX - rect.left}px`);
            panel.style.setProperty("--my", `${event.clientY - rect.top}px`);
        });

        const form = panel.querySelector("#visitor-form");
        const nameInput = panel.querySelector("#visitor-name");
        const messageInput = panel.querySelector("#visitor-message");
        const noteEl = panel.querySelector("#visitor-note");
        const feedEl = document.querySelector("#visitor-feed");
        if (!form || !nameInput || !messageInput || !feedEl) return;

        const endpoint = getApiEndpoint();
        const supabase = getSupabaseConfig();
        let posting = false;
        let feedCache = [];

        const savedName = clampText(localStorage.getItem(USERNAME_KEY) || "", MAX_NAME_LEN);
        if (savedName) {
            lockUsername(nameInput, savedName);
            setNote(noteEl, "Username locked.");
        }

        const loadFeed = async () => {
            try {
                if (supabase) {
                    feedCache = await fetchSupabaseFeed(supabase);
                } else if (endpoint) {
                    feedCache = await fetchRemoteFeed(endpoint);
                } else {
                    feedCache = readLocalFeed().map(normalizeEntry).filter(Boolean);
                }
                feedCache.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
                renderFeed(feedEl, feedCache);
            } catch (_) {
                setNote(noteEl, "Could not load visitor feed.");
                renderFeed(feedEl, feedCache);
            }
        };

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (posting) return;

            const lockedName = clampText(localStorage.getItem(USERNAME_KEY) || "", MAX_NAME_LEN);
            const candidateName = clampText(nameInput.value, MAX_NAME_LEN);
            const username = lockedName || candidateName;
            const message = clampText(messageInput.value, MAX_MESSAGE_LEN);
            if (!username || !message) {
                setNote(noteEl, "Add a username and a comment.");
                return;
            }

            if (!lockedName) {
                localStorage.setItem(USERNAME_KEY, username);
                lockUsername(nameInput, username);
                setNote(noteEl, "Username set.");
            }

            const entry = {
                username,
                message,
                createdAt: new Date().toISOString()
            };

            posting = true;
            setNote(noteEl, "Posting...");
            try {
                if (supabase) {
                    await postSupabaseEntry(supabase, entry);
                    await loadFeed();
                } else if (endpoint) {
                    await postRemoteEntry(endpoint, entry);
                    await loadFeed();
                } else {
                    const nextFeed = [entry, ...readLocalFeed().map(normalizeEntry).filter(Boolean)];
                    writeLocalFeed(nextFeed);
                    feedCache = nextFeed;
                    renderFeed(feedEl, feedCache);
                }
                messageInput.value = "";
                setNote(noteEl, (supabase || endpoint)
                    ? "Posted to live board."
                    : "Posted locally (no live endpoint configured).");
            } catch (_) {
                setNote(noteEl, "Failed to post comment.");
            } finally {
                posting = false;
            }
        });

        loadFeed();
    }

    window.addEventListener("pagechange", (event) => {
        const page = event && event.detail && event.detail.page;
        if (page !== "home") return;
        initVisitorsHome();
    });

    window.addEventListener("load", () => {
        if (document.body.dataset.page === "home") {
            initVisitorsHome();
        }
    });
})();
