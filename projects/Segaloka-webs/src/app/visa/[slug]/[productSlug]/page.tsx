import { notFound } from "next/navigation";

import {
  getVisaDetailMock,
  getVisaProductsByCountry,
} from "@/ui/visa-detail";

import VisaProductDetailClient from "./VisaProductDetailClient";

type VisaProductPageProps = {
  params: Promise<{
    slug: string;
    productSlug: string;
  }>;
  searchParams: Promise<{
    vendor?: string;
    travelers?: string;
    departureDate?: string;
    returnDate?: string;
  }>;
};

type VisaProduct = ReturnType<
  typeof getVisaProductsByCountry
>[number];

function normalize(value: string | undefined) {
  return decodeURIComponent(value ?? "")
    .trim()
    .toLowerCase();
}

function resolveVisaProduct({
  products,
  productSlug,
  vendorSlug,
}: {
  products: VisaProduct[];
  productSlug: string;
  vendorSlug: string;
}): VisaProduct | null {
  return (
    products.find((product) => {
      const productMatches =
        normalize(product.slug) === productSlug;

      const vendorMatches =
        !vendorSlug ||
        normalize(product.vendor.slug) === vendorSlug;

      return productMatches && vendorMatches;
    }) ?? null
  );
}

export default async function VisaProductPage({
  params,
  searchParams,
}: VisaProductPageProps) {
  const { slug, productSlug } = await params;
  const query = await searchParams;

  const countrySlug = normalize(slug);
  const requestedProductSlug = normalize(productSlug);
  const requestedVendorSlug = normalize(query.vendor);

  const country = getVisaDetailMock(countrySlug);

  if (!country) {
    notFound();
  }

  const countryProducts =
    getVisaProductsByCountry(countrySlug);

  const product = resolveVisaProduct({
    products: countryProducts,
    productSlug: requestedProductSlug,
    vendorSlug: requestedVendorSlug,
  });

  if (!product) {
    notFound();
  }

  /*
   * Vendor isolation.
   *
   * Jika URL membawa vendor, produk harus benar-benar
   * merupakan produk milik vendor tersebut.
   */
  if (
    requestedVendorSlug &&
    normalize(product.vendor.slug) !== requestedVendorSlug
  ) {
    notFound();
  }

  const vendorSlug =
    requestedVendorSlug ||
    normalize(product.vendor.slug);

  return (
    <VisaProductDetailClient
      countrySlug={countrySlug}
      countryName={country.country.name}
      countryImage={country.country.image}
      product={product}
      vendorSlug={vendorSlug}
      initialTravelers={query.travelers}
      departureDate={query.departureDate}
      returnDate={query.returnDate}
    />
  );
}