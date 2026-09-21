// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// 1. Initialize Lenis for smooth scrolling
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

// Integrate Lenis with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0, 0);

// 2. Three.js Background (Points animation)
const initThreeJS = () => {
    const canvas = document.querySelector('#webgl-canvas');
    const scene = new THREE.Scene();
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 2000;
    
    const posArray = new Float32Array(particlesCount * 3);
    
    for(let i = 0; i < particlesCount * 3; i++) {
        // Spread particles
        posArray[i] = (Math.random() - 0.5) * 15;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.02,
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });
    
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Mouse interaction variables
    let mouseX = 0;
    let mouseY = 0;

    // Animation Loop
    const clock = new THREE.Clock();

    const tick = () => {
        const elapsedTime = clock.getElapsedTime();
        
        // Rotate entire particle system slowly
        particlesMesh.rotation.y = elapsedTime * 0.05;
        particlesMesh.rotation.x = elapsedTime * 0.02;

        // Add subtle mouse parallax
        particlesMesh.position.x += (mouseX * 0.5 - particlesMesh.position.x) * 0.05;
        particlesMesh.position.y += (-mouseY * 0.5 - particlesMesh.position.y) * 0.05;

        renderer.render(scene, camera);
        window.requestAnimationFrame(tick);
    }
    
    tick();

    // Event Listeners
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = (event.clientY / window.innerHeight) * 2 - 1;
    });
};

initThreeJS();


// 3. GSAP Animations

// Hero Typography Animation
gsap.from(".macro-type .line", {
    y: 100,
    opacity: 0,
    duration: 1.5,
    stagger: 0.2,
    ease: "power4.out",
    delay: 0.2
});

// Infinite Marquee
const marqueeInner = document.querySelector('.marquee-inner');
// Clone the content for seamless looping
marqueeInner.innerHTML += marqueeInner.innerHTML;

gsap.to('.marquee-inner', {
    xPercent: -50,
    ease: "none",
    duration: 10,
    repeat: -1
});

// Horizontally Pinned Scroll Section
const horizontalSection = document.querySelector('.horizontal-scroll-section');
const horizontalContainer = document.querySelector('.horizontal-container');

gsap.to(horizontalContainer, {
    x: () => -(horizontalContainer.scrollWidth - window.innerWidth),
    ease: "none",
    scrollTrigger: {
        trigger: horizontalSection,
        start: "top top",
        end: () => `+=${horizontalContainer.scrollWidth - window.innerWidth}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
    }
});

// Glassmorphism Cards Fade Up
gsap.from(".glass-card", {
    y: 100,
    opacity: 0,
    duration: 1,
    stagger: 0.2,
    scrollTrigger: {
        trigger: ".glassmorphism-section",
        start: "top 70%",
        end: "top 30%",
        scrub: 1
    }
});
