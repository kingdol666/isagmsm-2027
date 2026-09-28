<script setup lang="ts">
import { siteMeta, venueContent } from '#shared/content/site'

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

/* Structured data for search engines (ConferenceEvent). */
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ConferenceEvent',
        name: 'Polymer Processing Symposium 2026',
        alternateName: 'PPS 2026',
        description: 'International symposium on polymer processing — materials, processing, manufacturing and intelligence.',
        startDate: '2026-10-15',
        endDate: '2026-10-17',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: venueContent.name,
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Hefei',
            addressRegion: 'Anhui',
            addressCountry: 'CN',
          },
        },
        organizer: {
          '@type': 'Organization',
          name: 'PPS 2026 Organising Committee',
          email: siteMeta.email,
        },
      }),
    },
  ],
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
