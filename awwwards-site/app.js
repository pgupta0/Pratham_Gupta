// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Custom Cursor Logic
const cursor = document.getElementById('custom-cursor');
let cursorX = 0;
let cursorY = 0;
let targetX = 0;
let targetY = 0;

document.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
});

const renderCursor = () => {
    cursorX += (targetX - cursorX) * 0.15; 
    cursorY += (targetY - cursorY) * 0.15;
    cursor.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;
    requestAnimationFrame(renderCursor);
};
requestAnimationFrame(renderCursor);

// Add hover effect to interactive elements
const interactables = document.querySelectorAll('a, .glass-card, .marquee-section');
interactables.forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursor.style.width = '60px';
        cursor.style.height = '60px';
        cursor.style.backgroundColor = 'transparent';
        cursor.style.border = '2px solid #D4AF37';
    });
    el.addEventListener('mouseleave', () => {
        cursor.style.width = '20px';
        cursor.style.height = '20px';
        cursor.style.backgroundColor = '#D4AF37';
        cursor.style.border = 'none';
    });
});


// 1. Initialize Lenis for smooth scrolling
const lenis = new Lenis({
    duration: 1.5,
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

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0, 0);

// 2. Three.js Background (Gold and Red Dust particles)
const initThreeJS = () => {
    const canvas = document.querySelector('#webgl-canvas');
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particlesCount = 2500;
    const posArray = new Float32Array(particlesCount * 3);
    const colorArray = new Float32Array(particlesCount * 3);
    
    const goldColor = new THREE.Color('#D4AF37');
    const redColor = new THREE.Color('#8B0000'); 
    
    for(let i = 0; i < particlesCount; i++) {
        posArray[i*3] = (Math.random() - 0.5) * 15;
        posArray[i*3+1] = (Math.random() - 0.5) * 15;
        posArray[i*3+2] = (Math.random() - 0.5) * 15;
        
        const isGold = Math.random() > 0.4; // 60% gold, 40% red
        const mixedColor = isGold ? goldColor : redColor;
        colorArray[i*3] = mixedColor.r;
        colorArray[i*3+1] = mixedColor.g;
        colorArray[i*3+2] = mixedColor.b;
    }
    
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.03,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    });
    
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const clock = new THREE.Clock();

    const tick = () => {
        const elapsedTime = clock.getElapsedTime();
        
        targetRotationY = elapsedTime * 0.03 + (mouseX * 0.3);
        targetRotationX = elapsedTime * 0.02 + (-mouseY * 0.3);

        particlesMesh.rotation.y += (targetRotationY - particlesMesh.rotation.y) * 0.05;
        particlesMesh.rotation.x += (targetRotationX - particlesMesh.rotation.x) * 0.05;

        renderer.render(scene, camera);
        window.requestAnimationFrame(tick);
    }
    
    tick();

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
gsap.from(".line", {
    y: 120,
    opacity: 0,
    duration: 1.8,
    stagger: 0.15,
    ease: "power4.out",
    delay: 0.3
});

// Infinite Marquee
const marqueeInner = document.querySelector('.marquee-inner');
marqueeInner.innerHTML += marqueeInner.innerHTML; 

gsap.to('.marquee-inner', {
    xPercent: -50,
    ease: "none",
    duration: 20,
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
    duration: 1.2,
    stagger: 0.2,
    ease: "power3.out",
    scrollTrigger: {
        trigger: ".glassmorphism-section",
        start: "top 75%",
        end: "top 25%",
        scrub: 1
    }
});
