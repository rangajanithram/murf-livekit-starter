'use client';

import { useEffect, useRef } from 'react';

type Point = { x: number; y: number; age: number };

export function PencilCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Only run on desktop devices to prevent interfering with touch screens
    if (window.matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window)) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let points: Point[] = [];
    let animationFrameId: number;
    const maxAge = 40; // How many frames the line lasts

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const onMouseMove = (e: MouseEvent) => {
      // Add multiple interpolated points for smoother fast movements
      if (points.length > 0) {
        const lastPoint = points[points.length - 1];
        const dx = e.clientX - lastPoint.x;
        const dy = e.clientY - lastPoint.y;
        const dist = Math.hypot(dx, dy);
        
        // Add intermediate points if moving fast
        if (dist > 10) {
          const steps = Math.floor(dist / 10);
          for (let i = 1; i <= steps; i++) {
            points.push({
              x: lastPoint.x + (dx * i) / steps,
              y: lastPoint.y + (dy * i) / steps,
              age: 0,
            });
          }
        }
      }
      
      points.push({ x: e.clientX, y: e.clientY, age: 0 });
    };
    
    window.addEventListener('mousemove', onMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update ages and filter out old points
      points.forEach((p) => (p.age += 1));
      points = points.filter((p) => p.age < maxAge);

      if (points.length > 1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (let i = 1; i < points.length; i++) {
          const p1 = points[i - 1];
          const p2 = points[i];
          
          // Fade out based on age
          const opacity = Math.max(0, 1 - p2.age / maxAge);
          
          // Main pencil stroke
          ctx.beginPath();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = `rgba(0, 32, 69, ${opacity})`;
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          
          // Secondary sketchy stroke (slightly offset and lighter)
          ctx.beginPath();
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = `rgba(0, 32, 69, ${opacity * 0.5})`;
          ctx.moveTo(p1.x + (Math.random() - 0.5) * 4, p1.y + (Math.random() - 0.5) * 4);
          ctx.lineTo(p2.x + (Math.random() - 0.5) * 4, p2.y + (Math.random() - 0.5) * 4);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
