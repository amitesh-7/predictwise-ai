import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  pulsePhase: number;
}

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const colors = [
      { r: 99, g: 102, b: 241 },   // Primary indigo
      { r: 168, g: 85, b: 247 },   // Purple
      { r: 59, g: 130, b: 246 },   // Blue
      { r: 14, g: 165, b: 233 },   // Cyan
      { r: 236, g: 72, b: 153 },   // Pink
      { r: 139, g: 92, b: 246 },   // Violet
    ];

    const createParticles = () => {
      const particleCount = Math.min(100, Math.floor((canvas.width * canvas.height) / 12000));
      particlesRef.current = [];

      for (let i = 0; i < particleCount; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 2.5 + 1,
          color: `${color.r}, ${color.g}, ${color.b}`,
          alpha: Math.random() * 0.6 + 0.2,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    const drawParticle = (p: Particle, time: number) => {
      if (!ctx) return;
      
      // Pulsing effect
      const pulse = Math.sin(time * 0.002 + p.pulsePhase) * 0.3 + 0.7;
      const currentAlpha = p.alpha * pulse;
      const currentRadius = p.radius * (0.8 + pulse * 0.4);
      
      // Glow effect
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius * 3);
      gradient.addColorStop(0, `rgba(${p.color}, ${currentAlpha})`);
      gradient.addColorStop(0.5, `rgba(${p.color}, ${currentAlpha * 0.3})`);
      gradient.addColorStop(1, `rgba(${p.color}, 0)`);
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentRadius * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${currentAlpha})`;
      ctx.fill();
    };

    const drawConnections = (time: number) => {
      if (!ctx) return;
      const particles = particlesRef.current;
      const maxDistance = 120;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.12;
            const wave = Math.sin(time * 0.001 + i * 0.1) * 0.5 + 0.5;
            
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 102, 241, ${opacity * wave})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }

        // Mouse connection with gradient
        const dx = particles[i].x - mouseRef.current.x;
        const dy = particles[i].y - mouseRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 180 && mouseRef.current.x > 0) {
          const opacity = (1 - distance / 180) * 0.4;
          
          const gradient = ctx.createLinearGradient(
            particles[i].x, particles[i].y,
            mouseRef.current.x, mouseRef.current.y
          );
          gradient.addColorStop(0, `rgba(168, 85, 247, ${opacity})`);
          gradient.addColorStop(1, `rgba(99, 102, 241, ${opacity * 0.5})`);
          
          ctx.beginPath();
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
          ctx.stroke();
        }
      }
    };

    const updateParticles = () => {
      const particles = particlesRef.current;

      particles.forEach((p) => {
        // Smooth floating motion
        p.x += p.vx;
        p.y += p.vy;

        // Soft bounce off edges
        if (p.x < 0) { p.x = 0; p.vx *= -0.8; }
        if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -0.8; }
        if (p.y < 0) { p.y = 0; p.vy *= -0.8; }
        if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -0.8; }

        // Mouse interaction - smooth attraction/repulsion
        if (mouseRef.current.x > 0) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150 && distance > 0) {
            const force = (150 - distance) / 150;
            // Gentle push away
            p.vx += (dx / distance) * force * 0.015;
            p.vy += (dy / distance) * force * 0.015;
          }
        }

        // Add slight random movement for organic feel
        p.vx += (Math.random() - 0.5) * 0.01;
        p.vy += (Math.random() - 0.5) * 0.01;

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Limit velocity
        const maxVel = 1;
        const vel = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (vel > maxVel) {
          p.vx = (p.vx / vel) * maxVel;
          p.vy = (p.vy / vel) * maxVel;
        }
      });
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      timeRef.current += 16;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawConnections(timeRef.current);
      particlesRef.current.forEach(p => drawParticle(p, timeRef.current));
      updateParticles();

      animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    const handleResize = () => {
      resizeCanvas();
      createParticles();
    };

    resizeCanvas();
    createParticles();
    animate();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
};

export default ParticleBackground;
