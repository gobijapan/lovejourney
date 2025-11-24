import React, { useEffect, useRef } from 'react';

interface Props {
  active: boolean;
  type: 'hearts' | 'snow' | 'stars' | 'fireflies' | 'none';
}

const HeartCanvas: React.FC<Props> = ({ active, type }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || type === 'none' || !canvasRef.current) {
        const ctx = canvasRef.current?.getContext('2d');
        if(ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number; pulseSpeed?: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticle = (initial = false) => {
      const x = Math.random() * canvas.width;
      let y = type === 'fireflies' || initial ? Math.random() * canvas.height : -10;
      
      let size = 0, speedY = 0, speedX = 0, opacity = 1;
      
      if (type === 'hearts') {
          size = Math.random() * 15 + 5;
          speedY = Math.random() * 2 + 1;
          speedX = Math.random() * 1 - 0.5;
          opacity = Math.random() * 0.5 + 0.3;
      } else if (type === 'snow') {
          size = Math.random() * 5 + 2;
          speedY = Math.random() * 2 + 1;
          speedX = Math.random() * 1 - 0.5;
          opacity = Math.random() * 0.6 + 0.4;
      } else if (type === 'stars') {
          size = Math.random() * 2 + 1;
          speedY = Math.random() * 0.2 + 0.1; // Fall very slowly or stay
          speedX = 0;
          opacity = Math.random();
      } else if (type === 'fireflies') {
          size = Math.random() * 3 + 1;
          speedY = (Math.random() - 0.5) * 1;
          speedX = (Math.random() - 0.5) * 1;
          opacity = Math.random();
      }

      particles.push({ x, y, size, speedX, speedY, opacity, pulseSpeed: Math.random() * 0.05 });
    };

    // Initialize some particles for stars/fireflies
    if (type === 'stars' || type === 'fireflies') {
        for(let i=0; i<50; i++) createParticle(true);
    }

    const drawHeart = (x: number, y: number, size: number, opacity: number) => {
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#fa3452'; // Use theme color in future if passed prop
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(x, y + topCurveHeight);
      ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
      ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size * 1.2), x, y + (size * 1.5));
      ctx.bezierCurveTo(x, y + (size * 1.2), x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
      ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
      ctx.fill();
    };

    const drawCircle = (x: number, y: number, size: number, opacity: number, color: string) => {
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn rate
      if (type === 'hearts' && Math.random() < 0.03) createParticle();
      if (type === 'snow' && Math.random() < 0.05) createParticle();
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;

        if (type === 'hearts' || type === 'snow') {
            p.opacity -= 0.001;
        } else if (type === 'fireflies' || type === 'stars') {
            // Pulse effect
            p.opacity += (p.pulseSpeed || 0.01);
            if (p.opacity > 1 || p.opacity < 0.2) p.pulseSpeed = -(p.pulseSpeed || 0.01);
            
            // Boundary bounce for fireflies
            if(p.x < 0 || p.x > canvas.width) p.speedX *= -1;
            if(p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        }

        if (type === 'hearts') drawHeart(p.x, p.y, p.size, p.opacity);
        else if (type === 'snow') drawCircle(p.x, p.y, p.size, p.opacity, '#ffffff');
        else if (type === 'stars') drawCircle(p.x, p.y, p.size, p.opacity, '#ffffff');
        else if (type === 'fireflies') drawCircle(p.x, p.y, p.size, p.opacity, '#ffeb3b');

        ctx.globalAlpha = 1;

        if ((type === 'hearts' || type === 'snow') && (p.y > canvas.height || p.opacity <= 0)) {
          particles.splice(i, 1);
          i--;
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, type]);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-0" />;
};

export default HeartCanvas;