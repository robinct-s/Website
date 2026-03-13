const contentContainer = document.getElementById('content');
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const TRANSITION_OUT_MS = 1200;
const LOGO_INTERACTIVE_DELAY_MS = 5600;
let isTransitioning = false;
let logoInteractiveTimer = null;

function isSafariBrowser() {
    const ua = navigator.userAgent || "";
    const vendor = navigator.vendor || "";
    const isAppleVendor = /Apple/i.test(vendor);
    const hasSafari = /Safari/i.test(ua);
    const excluded = /Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS|SamsungBrowser/i.test(ua);
    return isAppleVendor && hasSafari && !excluded;
}

if (isSafariBrowser()) {
    document.body.classList.add("safari-perf");
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clearLogoInteractiveTimer() {
    if (logoInteractiveTimer !== null) {
        clearTimeout(logoInteractiveTimer);
        logoInteractiveTimer = null;
    }
}

function scheduleLogoInteractive() {
    clearLogoInteractiveTimer();
    document.body.classList.remove("logo-interactive");
    if (!document.body.classList.contains("intro-started")) return;
    if (document.body.dataset.page !== "home") return;
    logoInteractiveTimer = window.setTimeout(() => {
        if (!document.body.classList.contains("intro-started")) return;
        if (document.body.dataset.page !== "home") return;
        document.body.classList.add("logo-interactive");
    }, LOGO_INTERACTIVE_DELAY_MS);
}

// Load a page snippet
async function loadPage(page, options = {}) {
    const { initial = false } = options;
    if (isTransitioning) return;

    document.body.classList.toggle('visitors-wash-active', page === 'visitors');

    const fromPage = document.body.dataset.page || 'home';
    const delayPageStateSwap = !initial && fromPage !== 'home' && page !== 'home';
    if (!delayPageStateSwap) {
        document.body.classList.toggle('on-home', page === 'home');
        document.body.dataset.page = page;
    }
    window.dispatchEvent(new CustomEvent("pagewillchange", {
        detail: { page, initial }
    }));
    isTransitioning = true;

    try {
        if (!initial) {
            contentContainer.classList.add('is-fading');
            await wait(TRANSITION_OUT_MS);
        }
        if (delayPageStateSwap) {
            document.body.classList.toggle('on-home', page === 'home');
            document.body.dataset.page = page;
        }

        const res = await fetch(`content/${page}.html`);
        const html = await res.text();
        contentContainer.innerHTML = html;

        window.dispatchEvent(new CustomEvent("pagechange", {
            detail: { page }
        }));
        scheduleLogoInteractive();

        requestAnimationFrame(() => {
            contentContainer.classList.remove('is-fading');
            contentContainer.classList.remove('hide-home-tagline');
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
        const currentPage = document.body.dataset.page || 'home';
        if (currentPage === 'home' && page === 'home') {
            // Force re-entry into the home animation selector state.
            document.body.classList.remove('on-home');
            void document.body.offsetWidth;
        }
        if (document.body.dataset.page === 'home' && page !== 'home') {
            contentContainer.classList.add('hide-home-tagline');
        }
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

window.addEventListener("introanimationcomplete", () => {
    scheduleLogoInteractive();
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
