"use client";

import type { ReactNode } from "react";
import * as m from "framer-motion/m";

export function Reveal({ children, delay = 0, y = 12 }: { children: ReactNode; delay?: number; y?: number }) {
  return (
    <m.div
      initial={{ y }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: "100%" }}
    >
      {children}
    </m.div>
  );
}
