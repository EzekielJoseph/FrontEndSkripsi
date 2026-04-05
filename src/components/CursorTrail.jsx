import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

function TrailDot({ mouseX, mouseY, size, opacity, lag }) {
  const x = useSpring(mouseX, {
    stiffness: 360 - lag * 24,
    damping: 30 + lag * 2,
    mass: 0.25 + lag * 0.02
  });
  const y = useSpring(mouseY, {
    stiffness: 360 - lag * 24,
    damping: 30 + lag * 2,
    mass: 0.25 + lag * 0.02
  });

  return (
    <motion.span
      className="cursor-dot"
      style={{
        x,
        y,
        width: size,
        height: size,
        opacity,
        marginLeft: -size / 2,
        marginTop: -size / 2
      }}
    />
  );
}

export default function CursorTrail({ lowPower = false }) {
  const [enabled, setEnabled] = useState(false);
  const mouseX = useMotionValue(-120);
  const mouseY = useMotionValue(-120);

  const rafRef = useRef(0);
  const pendingRef = useRef({ x: -120, y: -120 });

  const dots = useMemo(
    () => [16, 12, 9, 7].map((size, index) => ({ size, index })),
    []
  );

  useEffect(() => {
    const pointerMedia = window.matchMedia("(pointer: fine)");
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

    function handleMediaChange() {
      setEnabled(pointerMedia.matches && !motionMedia.matches && !lowPower);
    }

    handleMediaChange();

    const unsubscribe = [];

    if (pointerMedia.addEventListener) {
      pointerMedia.addEventListener("change", handleMediaChange);
      motionMedia.addEventListener("change", handleMediaChange);
      unsubscribe.push(() => pointerMedia.removeEventListener("change", handleMediaChange));
      unsubscribe.push(() => motionMedia.removeEventListener("change", handleMediaChange));
    } else {
      pointerMedia.addListener(handleMediaChange);
      motionMedia.addListener(handleMediaChange);
      unsubscribe.push(() => pointerMedia.removeListener(handleMediaChange));
      unsubscribe.push(() => motionMedia.removeListener(handleMediaChange));
    }

    return () => {
      unsubscribe.forEach((fn) => fn());
    };
  }, [lowPower]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function flushMove() {
      rafRef.current = 0;
      mouseX.set(pendingRef.current.x);
      mouseY.set(pendingRef.current.y);
    }

    function handleMove(event) {
      pendingRef.current = { x: event.clientX, y: event.clientY };

      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(flushMove);
      }
    }

    function handleLeave() {
      pendingRef.current = { x: -120, y: -120 };

      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(flushMove);
      }
    }

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerleave", handleLeave);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }

      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerleave", handleLeave);
    };
  }, [enabled, mouseX, mouseY]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="cursor-trail" aria-hidden>
      {dots.map((dot, idx) => (
        <TrailDot
          key={dot.size}
          mouseX={mouseX}
          mouseY={mouseY}
          size={dot.size}
          lag={idx}
          opacity={0.34 - idx * 0.06}
        />
      ))}
    </div>
  );
}
