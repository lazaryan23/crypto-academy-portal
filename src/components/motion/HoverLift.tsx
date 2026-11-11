"use client";

import type { ReactNode } from "react";
import * as m from "framer-motion/m";

export function HoverLift({ children, scale = 1.05 }: { children: ReactNode; scale?: number }) {
  return (
    <m.div
      whileHover={{ scale, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      style={{ height: "100%", willChange: "transform" }}
    >
      {children}
    </m.div>
  );
}
