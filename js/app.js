const contentContainer = document.getElementById('content');
const TRANSITION_OUT_MS = 1200;
let isTransitioning = false;

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Load a page snippet
async function loadPage(page, options = {}) {
    const { initial = false } = options;
    if (isTransitioning) return;

    isTransitioning = true;

    try {
        if (!initial) {
            contentContainer.classList.add('is-fading');
            await wait(TRANSITION_OUT_MS);
        }

        const res = await fetch(`content/${page}.html`);
        const html = await res.text();
        contentContainer.innerHTML = html;

        requestAnimationFrame(() => {
            contentContainer.classList.remove('is-fading');
        });
    } finally {
        isTransitioning = false;
    }
}

// Initial load
loadPage('home', { initial: true });

// Navigation links
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const page = link.dataset.link;
        loadPage(page);
    });
});

// Persistent player state using localStorage
const audioE1 = document.getElementById("music-player");
window.addEventListener("load", () => {
    const savedTime = localStorage.getItem("player-time");
    if (savedTime) audioE1.currentTime = parseFloat(savedTime);
});
setInterval(() => {
    localStorage.setItem("player-time", audioE1.currentTime);
}, 1000);
