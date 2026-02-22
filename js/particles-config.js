particlesJS("particles-js", {
    particles: {
        number: { value: 60 },
        color: { value: "#ffffff" },
        shape: { type: "circle" },
        opacity: { value: 0.3 },
        size: { value: 2 },
        move: {
            enable: true,
            speed: 0.6
        },
        line_linked: {
            enable: true,
            distance: 160,
            opacity: 0.2
        }
    },
    interactivity: {
        events: {
            onhover: {
                enable: true,
                mode: "grab"
            }
        },
        modes: {
            grab: {
                distance: 200,
                line_linked: {
                    opacity: 0.4
                }
            }
        }
    }
});