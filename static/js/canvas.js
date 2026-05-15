const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let width, height, dpr;
let particles = [];

// Configurations
const PARTICLE_COUNT = window.innerWidth < 768 ? 50 : 120;
const MAX_VELOCITY = 3.0;
const FRICTION = 0.95;
const RETURN_SPEED = 0.002;
const GRAVITY_RADIUS = 280;
const CONNECTION_DISTANCE = 140;

function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); // Limit dpr for mobile performance
    width = window.innerWidth;

    // Set height to full document height so it covers the scrollable area
    height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        window.innerHeight
    );

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.scale(dpr, dpr);
}

window.addEventListener('resize', resize);
document.addEventListener('DOMContentLoaded', resize);
setTimeout(resize, 500);

let mouseX = -1000;
let mouseY = -1000;

document.addEventListener('mousemove', (e) => {
    mouseX = e.pageX;
    mouseY = e.pageY;
});

// Mobile Touch Support
document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        mouseX = e.touches[0].pageX;
        mouseY = e.touches[0].pageY;
    }
}, { passive: true });

document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        mouseX = e.touches[0].pageX;
        mouseY = e.touches[0].pageY;
    }
}, { passive: true });

document.addEventListener('mouseout', () => {
    mouseX = -1000;
    mouseY = -1000;
});

document.addEventListener('touchend', () => {
    mouseX = -1000;
    mouseY = -1000;
});

class Particle {
    constructor() {
        // Initial spawn spread across the full document dimensions
        this.baseX = Math.random() * (window.innerWidth - 20) + 10;

        // Guess a large height initially if DOM isn't fully loaded
        const estHeight = Math.max(document.body.scrollHeight, window.innerHeight);
        this.baseY = Math.random() * estHeight;

        this.x = this.baseX;
        this.y = this.baseY;
        this.vx = 0;
        this.vy = 0;
        this.radius = Math.random() * 1.7 + 0.8; // 0.8 to 2.5
        this.density = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
        this.opacity = Math.random() * 0.5 + 0.3; // 0.3 to 0.8

        // For organic idle drift
        this.noiseOffsetX = Math.random() * 1000;
        this.noiseOffsetY = Math.random() * 1000;
    }

    update() {
        // 1. Organic Idle Drift (Pseudo-random noise)
        this.noiseOffsetX += 0.01;
        this.noiseOffsetY += 0.01;
        let driftX = Math.sin(this.noiseOffsetX) * 0.1;
        let driftY = Math.cos(this.noiseOffsetY) * 0.1;

        this.vx += driftX;
        this.vy += driftY;

        // 2. Gravity-Well Interaction
        let dx = mouseX - this.x;
        let dy = mouseY - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < GRAVITY_RADIUS && mouseX !== -1000) {
            let force = (GRAVITY_RADIUS - dist) / GRAVITY_RADIUS;
            let attraction = force * force * 1.8;
            let angle = Math.atan2(dy, dx);

            // Pull towards cursor smoothly
            this.vx += Math.cos(angle) * attraction * this.density;
            this.vy += Math.sin(angle) * attraction * this.density;
        }

        // 3. Return-to-home Spring System
        this.vx += (this.baseX - this.x) * RETURN_SPEED;
        this.vy += (this.baseY - this.y) * RETURN_SPEED;

        // 4. Friction & Speed Control
        this.vx *= FRICTION;
        this.vy *= FRICTION;

        let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > MAX_VELOCITY) {
            this.vx = (this.vx / speed) * MAX_VELOCITY;
            this.vy = (this.vy / speed) * MAX_VELOCITY;
        }

        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#8b5cf6'; // Subtle purple/blue glow
        ctx.fillStyle = '#ffffff'; // Soft white

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Initialize Particle System
for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
}

function drawConnections() {
    ctx.lineWidth = 0.6;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Particle-to-Particle connections
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
            let dx = particles[i].x - particles[j].x;
            let dy = particles[i].y - particles[j].y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONNECTION_DISTANCE) {
                let opacity = 1 - (dist / CONNECTION_DISTANCE);
                ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.4})`; // Purple tint
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }

        // Cursor-to-Particle connections
        if (mouseX !== -1000) {
            let mdx = particles[i].x - mouseX;
            let mdy = particles[i].y - mouseY;
            let mdist = Math.sqrt(mdx * mdx + mdy * mdy);

            if (mdist < CONNECTION_DISTANCE * 1.2) {
                let mOpacity = 1 - (mdist / (CONNECTION_DISTANCE * 1.2));
                ctx.strokeStyle = `rgba(59, 130, 246, ${mOpacity * 0.5})`; // Blue tint
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(mouseX, mouseY);
                ctx.stroke();
            }
        }
    }
}

function animate() {
    // Semi-transparent clear creates smooth motion blur trails
    // Deep black #050505 base
    ctx.fillStyle = 'rgba(5, 5, 5, 0.25)';
    ctx.fillRect(0, 0, width, height);

    drawConnections();

    for (const particle of particles) {
        particle.update();
        particle.draw();
    }

    requestAnimationFrame(animate);
}

// Boot up
setTimeout(() => {
    resize();
    animate();
}, 100);
