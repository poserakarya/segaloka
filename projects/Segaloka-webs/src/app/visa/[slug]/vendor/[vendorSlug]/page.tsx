import { notFound } from "next/navigation";

import {
  getVisaDetailMock,
  getVisaProductsByVendor,
  getVisaVendorBySlug,
} from "@/ui/visa-detail";

import VisaVendorDetailClient from "./VisaVendorDetailClient";

type Props = {
  params: Promise<{
    slug: string;
    vendorSlug: string;
  }>;
  searchParams: Promise<{
    travelers?: string;
    departureDate?: string;
    returnDate?: string;
  }>;
};

function normalize(value: string) {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase();
}

export default async function VisaVendorDetailPage({
  params,
  searchParams,
}: Props) {
  const { slug, vendorSlug } = await params;
  const search = await searchParams;

  const countrySlug = normalize(slug);
  const normalizedVendorSlug =
    normalize(vendorSlug);

  const country =
    getVisaDetailMock(countrySlug);

  if (!country) {
    notFound();
  }

  const vendor =
    getVisaVendorBySlug(
      normalizedVendorSlug,
    );

  if (!vendor) {
    notFound();
  }

  const products =
    getVisaProductsByVendor(
      countrySlug,
      normalizedVendorSlug,
    );

  /*
   * Vendor yang valid tetap memiliki halaman untuk negara
   * yang valid meskipun belum mempunyai produk aktif.
   *
   * Empty product state ditangani oleh UI.
   * Jangan membuat produk, harga, atau offer fallback palsu.
   */

  return (
    <VisaVendorDetailClient
      countrySlug={countrySlug}
      countryName={country.country.name}
      vendor={vendor}
      products={products}
      travelers={search.travelers || ""}
      departureDate={search.departureDate || ""}
      returnDate={search.returnDate || ""}
    />
  );
}