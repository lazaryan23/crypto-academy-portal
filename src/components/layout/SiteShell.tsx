"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  ActionIcon,
  AppShell,
  AppShellHeader,
  AppShellMain,
  AppShellNavbar,
  Box,
  Burger,
  Button,
  Container,
  Group,
  NavLink,
  Stack,
  Text,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCompass, IconMoon, IconSun } from "@tabler/icons-react";
import { siteConfig } from "@/config/site";
import { CoinSearch } from "./CoinSearch";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/crypto") : pathname.startsWith(href);
}

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("dark", { getInitialValueInEffect: true });
  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label="Toggle color scheme"
      onClick={() => setColorScheme(computed === "dark" ? "light" : "dark")}
    >
      <Box component="span" lightHidden h={18}>
        <IconSun size={18} />
      </Box>
      <Box component="span" darkHidden h={18}>
        <IconMoon size={18} />
      </Box>
    </ActionIcon>
  );
}

export function SiteShell({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 280, breakpoint: "md", collapsed: { desktop: true, mobile: !opened } }}
      padding={0}
    >
      <AppShellHeader>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap" gap="md">
            <Group gap="xs" wrap="nowrap">
              <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" aria-label="Toggle navigation" />
              <Link href="/" onClick={close} style={{ textDecoration: "none" }} aria-label={`${siteConfig.name} home`}>
                <Group gap={8} wrap="nowrap">
                  <IconCompass size={28} color="var(--mantine-color-brand-5)" />
                  <Text fw={800} size="lg">
                    {siteConfig.name}
                  </Text>
                </Group>
              </Link>
            </Group>

            <Group gap={4} visibleFrom="md" wrap="nowrap" component="nav" aria-label="Main">
              {siteConfig.nav.map((item) => (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  variant={isActive(pathname, item.href) ? "light" : "subtle"}
                  color={isActive(pathname, item.href) ? "brand" : "gray"}
                >
                  {item.label}
                </Button>
              ))}
            </Group>

            <Group gap="xs" wrap="nowrap">
              <Box visibleFrom="xs" w={{ xs: 260, lg: 320 }}>
                <CoinSearch />
              </Box>
              <ColorSchemeToggle />
            </Group>
          </Group>
        </Container>
      </AppShellHeader>

      <AppShellNavbar p="md">
        <Stack gap="xs">
          <Box hiddenFrom="xs">
            <CoinSearch onNavigate={close} />
          </Box>
          {siteConfig.nav.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              active={isActive(pathname, item.href)}
              onClick={close}
            />
          ))}
        </Stack>
      </AppShellNavbar>

      <AppShellMain>
        <Box mih="calc(100dvh - 64px)">{children}</Box>
        {footer}
      </AppShellMain>
    </AppShell>
  );
}
