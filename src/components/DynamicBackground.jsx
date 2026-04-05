import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

export default function DynamicBackground() {
  const pointerX = useMotionValue(-240);
  const pointerY = useMotionValue(-240);
  const glowX = useSpring(pointerX, { stiffness: 120, damping: 26, mass: 0.7 });
  const glowY = useSpring(pointerY, { stiffness: 120, damping: 26, mass: 0.7 });

  useEffect(() => {
    function handleMove(event) {
      pointerX.set(event.clientX - 220);
      pointerY.set(event.clientY - 220);
    }

    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, [pointerX, pointerY]);

  return (
    <div className="dynamic-bg" aria-hidden>
      <div className="bg-noise" />
      <motion.div
        className="bg-blob blob-a"
        animate={{ x: [0, 34, -20, 0], y: [0, -26, 16, 0], scale: [1, 1.08, 0.95, 1] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="bg-blob blob-b"
        animate={{ x: [0, -26, 30, 0], y: [0, 20, -14, 0], scale: [1, 0.94, 1.1, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="bg-blob blob-c"
        animate={{ x: [0, 20, -26, 0], y: [0, -16, 28, 0], scale: [1, 1.05, 0.97, 1] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div className="bg-glow" style={{ x: glowX, y: glowY }} />
    </div>
  );
}
