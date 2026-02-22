const contentContainer = document.getElementById('content');

// Load a page snippet
async function loadPage(page) {
    const res = await fetch(`content/${page}.html`);
    const html = await res.text();
    contentContainer.innerHTML = html;
}

// Initial load
loadPage('home');

// Navigation links
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const page = link.dataset.link;
        loadPage(page);
    });
});

// Persistent player state using localStorage
const player = document.getElementById("music-player");
window.addEventListener("load", () => {
    const savedTime = localStorage.getItem("player-time");
    if (savedTime) player.currentTime = parseFloat(savedTime);
});
setInterval(() => {
    localStorage.setItem("player-time", player.currentTime);
}, 1000);