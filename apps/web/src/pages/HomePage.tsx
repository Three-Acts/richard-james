import {
  HomeContactSection,
  HomeConversionPathSection,
  HomeHeroSection,
  HomeServicesSection,
  HomeTechnicalFoundationSection
} from "../components/sections";

export function HomePage() {
  return (
    <>
      <HomeHeroSection />
      <HomeServicesSection />
      <HomeConversionPathSection />
      <HomeTechnicalFoundationSection />
      <HomeContactSection />
    </>
  );
}
