import React, { useRef, useEffect, useCallback } from 'react';

/**
 * Animated neural-network / node-graph background drawn on a <canvas>.
 * Nodes drift slowly; edges pulse between nearby nodes.
 * Uses requestAnimationFrame with no external deps.
 */
const NeuralBg = ({ className, nodeCount = 60 }) => {
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  const initNodes = useCallback((w, h) => {
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.8,
      });
    }
    nodesRef.current = nodes;
  }, [nodeCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (nodesRef.current.length === 0) {
        initNodes(rect.width, rect.height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const isDark = () => document.documentElement.classList.contains('dark');
    const linkDist = 140;

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const dark = isDark();
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, w, h);
      const nodes = nodesRef.current;

      // Update positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;

        // Slight mouse attraction
        const dx = mx - n.x;
        const dy = my - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 1) {
          n.vx += (dx / dist) * 0.008;
          n.vy += (dy / dist) * 0.008;
        }
        // Clamp velocity
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > 0.6) {
          n.vx = (n.vx / speed) * 0.6;
          n.vy = (n.vy / speed) * 0.6;
        }
      }

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * (dark ? 0.15 : 0.12);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = dark
              ? `rgba(37, 99, 235, ${alpha})`
              : `rgba(37, 99, 235, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        // Mouse proximity glow
        const mdx = mx - n.x;
        const mdy = my - n.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        const glow = mDist < 160 ? (1 - mDist / 160) * 0.5 : 0;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        const baseAlpha = dark ? 0.3 : 0.25;
        ctx.fillStyle = `rgba(37, 99, 235, ${baseAlpha + glow})`;
        ctx.fill();
      }

      // Draw pulsing signal dots along some edges (top 8 shortest edges)
      const time = Date.now() * 0.001;
      let edgeCount = 0;
      for (let i = 0; i < nodes.length && edgeCount < 10; i++) {
        for (let j = i + 1; j < nodes.length && edgeCount < 10; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < linkDist * 0.6) {
            const t = ((time * 0.4 + i * 0.7) % 1);
            const px = nodes[i].x + (nodes[j].x - nodes[i].x) * t;
            const py = nodes[i].y + (nodes[j].y - nodes[i].y) * t;
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = dark
              ? `rgba(37, 99, 235, ${0.5 + Math.sin(time * 3 + i) * 0.2})`
              : `rgba(37, 99, 235, ${0.4 + Math.sin(time * 3 + i) * 0.15})`;
            ctx.fill();
            edgeCount++;
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [initNodes]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        zIndex: 0,
      }}
    />
  );
};

export default NeuralBg;
