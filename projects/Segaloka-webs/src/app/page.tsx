import { Hero } from "@/components/home/Hero";
import {
  AccommodationSection,
  AppSection,
  BenefitSection,
  CampaignBanners,
  CouponSection,
  DestinationSection,
  InspirationSection,
  PackageSection,
} from "@/components/home/Sections";
export default function Home() {
  return (
    <main>
<Hero />
      <BenefitSection />
      <CouponSection />
      <CampaignBanners />
      <PackageSection />
      <AccommodationSection />
      <DestinationSection />
      <InspirationSection />
      <AppSection />
</main>
  );
}
