import { notFound } from "next/navigation";

import {
  getVisaDetailMock,
  VisaDetail,
} from "@/ui/visa-detail";

type VisaDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function VisaDetailPage({
  params,
}: VisaDetailPageProps) {
  const { slug } = await params;

  const data = getVisaDetailMock(slug);

  if (!data) {
    notFound();
  }

  return <VisaDetail data={data} />;
}