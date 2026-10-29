"use client";

import {
  AccommodationDetailUI,
  makkahMadinahAccommodationMock,
} from "../../../ui/accommodation-detail";

import {
  getAccommodationBySlug,
} from "../../../data/accommodations";

type AccommodationDetailClientProps = {
  slug: string;
};

export default function AccommodationDetailClient({
  slug,
}: AccommodationDetailClientProps) {
  const product = getAccommodationBySlug(slug);

  /*
   * Fase sekarang adalah UI/UX.
   *
   * Data mock di bawah hanya presentation data untuk membangun
   * tampilan detail akomodasi sesuai desain.
   *
   * Ini BUKAN inventory, periode, harga transaksi, atau booking
   * yang berasal dari backend.
   */

  const data = {
    ...makkahMadinahAccommodationMock,

    ...(product
      ? {
          title: product.title,
          rating: product.rating,
          reviews: product.reviews,
        }
      : {}),
  };

  return <AccommodationDetailUI data={data} />;
}