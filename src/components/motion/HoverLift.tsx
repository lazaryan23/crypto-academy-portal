"use client";

import type { ReactNode } from "react";
import * as m from "framer-motion/m";

export function HoverLift({ children }: { children: ReactNode }) {
  return (
    <m.div whileTap={{ scale: 0.985 }} transition={{ duration: 0.12, ease: "easeOut" }} style={{ height: "100%" }}>
      {children}
    </m.div>
  );
}
