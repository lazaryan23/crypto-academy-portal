"use client";

import Link from "next/link";
import * as m from "framer-motion/m";
import type { Variants } from "framer-motion";
import { Button, Grid, GridCol, Group, Stack, Text, Title } from "@mantine/core";
import { IconBolt, IconChartCandle, IconSchool, IconShieldCheck } from "@tabler/icons-react";
import { CryptoOrbit } from "./CryptoOrbit";
import classes from "./HeroSection.module.css";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0 } },
};

const item: Variants = {
  hidden: { y: 10 },
  show: { y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const highlights = [
  { icon: IconBolt, label: "Live prices" },
  { icon: IconSchool, label: "Free academy" },
  { icon: IconShieldCheck, label: "Risk-first guides" },
];

export function HeroSection() {
  return (
    <section className={classes.hero} aria-labelledby="hero-title">
      <Grid gap={{ base: 32, md: 48 }} align="center">
        <GridCol span={{ base: 12, md: 7 }} order={{ base: 1, md: 1 }}>
          <m.div variants={container} initial="hidden" animate="show">
            <Stack gap="lg">
              <Title order={1} id="hero-title" className={classes.title}>
                Track the crypto market. Learn to trade it safely.
              </Title>

              <m.div variants={item}>
                <Text size="lg" c="dimmed" maw={560}>
                  Real-time prices for Bitcoin, Ethereum, Solana, TON and thousands more — plus practical guides on futures,
                  leverage and long-term investing.
                </Text>
              </m.div>

              <m.div variants={item}>
                <Group gap="sm">
                  <Button component="a" href="#markets" size="md" leftSection={<IconChartCandle size={18} />}>
                    Explore markets
                  </Button>
                  <Button component={Link} href="/academy" size="md" variant="default">
                    Start learning
                  </Button>
                </Group>
              </m.div>

              <m.div variants={item}>
                <Group gap="lg">
                  {highlights.map((h) => (
                    <Group key={h.label} gap={6} wrap="nowrap">
                      <h.icon size={16} color="var(--mantine-color-cyan-4)" />
                      <Text size="sm" c="dimmed">
                        {h.label}
                      </Text>
                    </Group>
                  ))}
                </Group>
              </m.div>
            </Stack>
          </m.div>
        </GridCol>

        <GridCol span={{ base: 12, md: 5 }} order={{ base: 2, md: 2 }}>
          <m.div
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={classes.orbitWrap}
          >
            <CryptoOrbit />
          </m.div>
        </GridCol>
      </Grid>
    </section>
  );
}
