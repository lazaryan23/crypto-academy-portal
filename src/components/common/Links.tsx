"use client";

import Link, { type LinkProps } from "next/link";
import { Anchor, Button, Card, type AnchorProps, type ButtonProps, type CardProps } from "@mantine/core";
import type { ReactNode } from "react";

type Href = LinkProps["href"];

export function AnchorLink({ href, children, ...props }: AnchorProps & { href: Href; children: ReactNode }) {
  return (
    <Anchor component={Link} href={href} {...props}>
      {children}
    </Anchor>
  );
}

export function ButtonLink({ href, children, ...props }: ButtonProps & { href: Href; children: ReactNode }) {
  return (
    <Button component={Link} href={href} {...props}>
      {children}
    </Button>
  );
}

export function CardLink({ href, children, ...props }: CardProps & { href: Href; children: ReactNode }) {
  return (
    <Card component={Link} href={href} {...props}>
      {children}
    </Card>
  );
}
