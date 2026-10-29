import { notFound } from "next/navigation";

import {
  getAccommodationBySlug,
} from "@/data/accommodations";

import AccommodationDetailClient from "./AccommodationDetailClient";
import "./detail.css";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AccommodationDetailPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const product = getAccommodationBySlug(slug);

  if (!product) {
    notFound();
  }

  return <AccommodationDetailClient slug={slug} />;
}