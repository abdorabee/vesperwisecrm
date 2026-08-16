import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { MarketingContentPage } from "@/components/marketing/marketing-content-page";
import {
  SOLUTION_SLUGS,
  getSolutionPage,
} from "@/components/marketing/content/pages";
import { marketingContentMetadata } from "@/lib/marketing/content-route";

interface SolutionPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return SOLUTION_SLUGS.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: SolutionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getSolutionPage(slug);
  if (!page) return {};
  return marketingContentMetadata(page);
}

export default async function SolutionPage({ params }: SolutionPageProps) {
  const { slug } = await params;
  const page = getSolutionPage(slug);
  if (!page) notFound();
  return <MarketingContentPage page={page} />;
}
