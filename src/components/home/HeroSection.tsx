"use client";

import Link from "next/link";
import * as m from "framer-motion/m";
import type { Variants } from "framer-motion";
import { Badge, Button, Grid, GridCol, Group, Stack, Text, Title } from "@mantine/core";
import { IconArrowRight, IconBolt, IconChartCandle, IconSchool, IconShieldCheck } from "@tabler/icons-react";
import { CryptoOrbit } from "./CryptoOrbit";
import classes from "./HeroSection.module.css";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
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
        <GridCol span={{ base: 12, md: 7 }} order={{ base: 2, md: 1 }}>
          <m.div variants={container} initial="hidden" animate="show">
            <Stack gap="lg">
              <m.div variants={item}>
                <Badge
                  size="lg"
                  variant="gradient"
                  gradient={{ from: "cyan", to: "violet", deg: 90 }}
                  leftSection={<span className={classes.liveDot} />}
                >
                  Live crypto market dashboard
                </Badge>
              </m.div>

              <Title order={1} id="hero-title" className={classes.title}>
                Track the crypto market.{" "}
                <span className={classes.gradientText}>Learn to trade it safely.</span>
              </Title>

              <m.div variants={item}>
                <Text size="lg" c="dimmed" maw={560}>
                  Real-time prices for Bitcoin, Ethereum, Solana, TON and thousands more — plus practical guides on futures,
                  leverage and long-term investing.
                </Text>
              </m.div>

              <m.div variants={item}>
                <Group gap="sm">
                  <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      component="a"
                      href="#markets"
                      size="md"
                      variant="gradient"
                      gradient={{ from: "cyan", to: "violet", deg: 120 }}
                      leftSection={<IconChartCandle size={18} />}
                      className={classes.ctaPrimary}
                    >
                      Explore markets
                    </Button>
                  </m.div>
                  <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      component={Link}
                      href="/academy"
                      size="md"
                      variant="default"
                      className={classes.ctaGhost}
                      rightSection={<IconArrowRight size={18} />}
                    >
                      Start learning
                    </Button>
                  </m.div>
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

        <GridCol span={{ base: 12, md: 5 }} order={{ base: 1, md: 2 }}>
          <m.div
            initial={{ opacity: 0, scale: 0.85, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className={classes.orbitWrap}
          >
            <CryptoOrbit />
          </m.div>
        </GridCol>
      </Grid>
    </section>
  );
}
