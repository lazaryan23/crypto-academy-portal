import type { Metadata } from "next";
import { AnchorLink, ButtonLink } from "@/components/common/Links";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Anchor, Badge, Box, Breadcrumbs, Card, Container, Grid, GridCol, Group, Skeleton, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconArrowRight, IconClock } from "@tabler/icons-react";
import { getGuide, guides } from "@/content/academy";
import { defaultOgImages, siteConfig } from "@/config/site";
import { GuideContent } from "@/components/academy/GuideContent";
import { GuideFaq } from "@/components/academy/GuideFaq";
import { Disclaimer } from "@/components/common/Disclaimer";
import { PromoCallout } from "@/components/common/PromoCallout";

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps<"/academy/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/academy/${guide.slug}` },
    openGraph: { type: "article", title: guide.title, description: guide.description, url: `/academy/${guide.slug}`, images: defaultOgImages },
  };
}

async function GuideArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const index = guides.findIndex((g) => g.slug === guide.slug);
  const prev = guides[index - 1];
  const next = guides[index + 1];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      dateModified: guide.updated,
      author: { "@type": "Organization", name: siteConfig.name },
      publisher: { "@type": "Organization", name: siteConfig.name },
      mainEntityOfPage: `${siteConfig.url}/academy/${guide.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <Grid gap={48}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <GridCol span={{ base: 12, md: 8 }}>
        <Stack gap="xl" component="article">
          <Breadcrumbs>
            <AnchorLink href="/academy" size="sm">
              Academy
            </AnchorLink>
            <Text size="sm" c="dimmed" truncate>
              {guide.shortTitle}
            </Text>
          </Breadcrumbs>
          <Stack gap="sm">
            <Group gap="xs">
              <Badge variant="light" color={guide.color}>
                {guide.level}
              </Badge>
              <Badge variant="default" leftSection={<IconClock size={12} />}>
                {guide.readMinutes} min read
              </Badge>
            </Group>
            <Title order={1} fz={{ base: 28, sm: 38 }} lh={1.2}>
              {guide.title}
            </Title>
            <Text size="lg" c="dimmed">
              {guide.description}
            </Text>
          </Stack>

          <GuideContent guide={guide} />

          <Stack gap="md" component="section" id="faq">
            <Title order={2} size="h3">
              Frequently asked questions
            </Title>
            <GuideFaq items={guide.faq} />
          </Stack>

          <Disclaimer />

          <Group justify="space-between">
            {prev ? (
              <ButtonLink href={`/academy/${prev.slug}`} variant="default" leftSection={<IconArrowLeft size={16} />}>
                {prev.shortTitle}
              </ButtonLink>
            ) : (
              <span />
            )}
            {next && (
              <ButtonLink href={`/academy/${next.slug}`} rightSection={<IconArrowRight size={16} />}>
                Next: {next.shortTitle}
              </ButtonLink>
            )}
          </Group>
        </Stack>
      </GridCol>

      <GridCol span={{ base: 12, md: 4 }} visibleFrom="md">
        <Box pos="sticky" top={88}>
          <Stack gap="lg">
            <Card padding="lg">
              <Text fw={700} mb="sm">
                On this page
              </Text>
              <Stack gap={8}>
                {guide.sections.map((s) => (
                  <Anchor key={s.id} href={`#${s.id}`} size="sm" c="dimmed">
                    {s.heading}
                  </Anchor>
                ))}
                <Anchor href="#faq" size="sm" c="dimmed">
                  FAQ
                </Anchor>
              </Stack>
            </Card>
            <PromoCallout compact />
          </Stack>
        </Box>
      </GridCol>
    </Grid>
  );
}

export default function GuidePage({ params }: PageProps<"/academy/[slug]">) {
  return (
    <Container size="xl" py="xl">
      <Suspense fallback={<Skeleton height={600} radius="lg" />}>
        <GuideArticle params={params} />
      </Suspense>
    </Container>
  );
}
