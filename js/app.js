const contentContainer = document.getElementById('content');
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const TRANSITION_OUT_MS = 1200;
let isTransitioning = false;

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Load a page snippet
async function loadPage(page, options = {}) {
    const { initial = false } = options;
    if (isTransitioning) return;

    document.body.classList.toggle('on-home', page === 'home');
    document.body.dataset.page = page;
    window.dispatchEvent(new CustomEvent("pagewillchange", {
        detail: { page, initial }
    }));
    isTransitioning = true;

    try {
        if (!initial) {
            contentContainer.classList.add('is-fading');
            await wait(TRANSITION_OUT_MS);
        }

        const res = await fetch(`content/${page}.html`);
        const html = await res.text();
        contentContainer.innerHTML = html;

        window.dispatchEvent(new CustomEvent("pagechange", {
            detail: { page }
        }));

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
        closeMobileMenu();
        loadPage(page);
    });
});

function openMobileMenu() {
    document.body.classList.add('menu-open');
    if (mobileMenuToggle) mobileMenuToggle.setAttribute('aria-expanded', 'true');
}

function closeMobileMenu() {
    document.body.classList.remove('menu-open');
    if (mobileMenuToggle) mobileMenuToggle.setAttribute('aria-expanded', 'false');
}

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        const isOpen = document.body.classList.contains('menu-open');
        if (isOpen) closeMobileMenu();
        else openMobileMenu();
    });
}

document.addEventListener('click', event => {
    if (!document.body.classList.contains('menu-open')) return;
    const clickedInsideNav = event.target.closest('#site-nav-list');
    const clickedToggle = event.target.closest('.mobile-menu-toggle');
    if (!clickedInsideNav && !clickedToggle) closeMobileMenu();
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMobileMenu();
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
