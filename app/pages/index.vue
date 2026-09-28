<script setup lang="ts">
definePageMeta({ layout: 'site' })

useSeoMeta({
  title: 'PPS 2026 — Polymer Processing Symposium · Hefei, China',
  description:
    'PPS 2026 — International Symposium on Polymer Processing. Materials · Processing · Manufacturing · Intelligence. 15—17 October 2026, Hefei, China. Register now.',
  ogTitle: 'PPS 2026 — Polymer Processing Symposium',
  ogDescription:
    'Materials · Processing · Manufacturing · Intelligence. 15—17 October 2026, Hefei, China.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <main id="main">
    <HomeHero />
    <AboutSection />
    <ThemesSection />
    <SpeakersSection />
    <ProgramSection />
    <DatesSection />
    <VenueSection />
    <RegistrationSection />
    <SponsorsSection />
  </main>
</template>
