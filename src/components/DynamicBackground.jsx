import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

export default function DynamicBackground({ lowPower = false }) {
  const pointerX = useMotionValue(-240);
  const pointerY = useMotionValue(-240);
  const glowX = useSpring(pointerX, { stiffness: 100, damping: 24, mass: 0.8 });
  const glowY = useSpring(pointerY, { stiffness: 100, damping: 24, mass: 0.8 });

  const rafRef = useRef(0);
  const pendingRef = useRef({ x: -240, y: -240 });

  useEffect(() => {
    if (lowPower) {
      return undefined;
    }

    function flushMove() {
      rafRef.current = 0;
      pointerX.set(pendingRef.current.x);
      pointerY.set(pendingRef.current.y);
    }

    function handleMove(event) {
      pendingRef.current = {
        x: event.clientX - 220,
        y: event.clientY - 220
      };

      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(flushMove);
      }
    }

    window.addEventListener("pointermove", handleMove, { passive: true });

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }

      window.removeEventListener("pointermove", handleMove);
    };
  }, [lowPower, pointerX, pointerY]);

  if (lowPower) {
    return (
      <div className="dynamic-bg" aria-hidden>
        <div className="bg-noise" />
        <div className="bg-blob blob-a" />
        <div className="bg-blob blob-b" />
      </div>
    );
  }

  return (
    <div className="dynamic-bg" aria-hidden>
      <div className="bg-noise" />
      <motion.div
        className="bg-blob blob-a"
        animate={{ x: [0, 24, -14, 0], y: [0, -18, 10, 0], scale: [1, 1.06, 0.96, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="bg-blob blob-b"
        animate={{ x: [0, -20, 18, 0], y: [0, 16, -10, 0], scale: [1, 0.95, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="bg-blob blob-c"
        animate={{ x: [0, 16, -20, 0], y: [0, -12, 22, 0], scale: [1, 1.03, 0.97, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div className="bg-glow" style={{ x: glowX, y: glowY }} />
    </div>
  );
}
