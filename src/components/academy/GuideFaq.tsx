"use client";

import { Accordion, AccordionControl, AccordionItem, AccordionPanel } from "@mantine/core";

export function GuideFaq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion variant="separated" radius="md">
      {items.map((item) => (
        <AccordionItem key={item.q} value={item.q}>
          <AccordionControl>{item.q}</AccordionControl>
          <AccordionPanel>{item.a}</AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
