import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

function TrailDot({ mouseX, mouseY, size, opacity, lag }) {
  const x = useSpring(mouseX, {
    stiffness: 420 - lag * 28,
    damping: 34 + lag * 2,
    mass: 0.25 + lag * 0.02
  });
  const y = useSpring(mouseY, {
    stiffness: 420 - lag * 28,
    damping: 34 + lag * 2,
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

export default function CursorTrail() {
  const [enabled, setEnabled] = useState(false);
  const mouseX = useMotionValue(-120);
  const mouseY = useMotionValue(-120);

  const dots = useMemo(
    () => [18, 15, 12, 10, 8, 6].map((size, index) => ({ size, index })),
    []
  );

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");

    function handleMediaChange() {
      setEnabled(media.matches);
    }

    handleMediaChange();

    if (media.addEventListener) {
      media.addEventListener("change", handleMediaChange);
      return () => media.removeEventListener("change", handleMediaChange);
    }

    media.addListener(handleMediaChange);
    return () => media.removeListener(handleMediaChange);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function handleMove(event) {
      mouseX.set(event.clientX);
      mouseY.set(event.clientY);
    }

    function handleLeave() {
      mouseX.set(-120);
      mouseY.set(-120);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerleave", handleLeave);

    return () => {
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
          opacity={0.38 - idx * 0.05}
        />
      ))}
    </div>
  );
}
