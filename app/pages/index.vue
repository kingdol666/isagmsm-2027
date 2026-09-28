<script setup lang="ts">
import { siteMeta, transportationContent } from '#shared/content/site'

definePageMeta({ layout: 'site' })

useSeoMeta({
  title: `${siteMeta.fullNameZh} · ${siteMeta.dates} · ${siteMeta.location}`,
  description:
    `${siteMeta.fullNameEn}（${siteMeta.fullNameZh}），${siteMeta.dates}，${siteMeta.location}。围绕凝胶材料设计合成、软物质物理、智能响应体系、生物医用转化与产业化交流最新进展。`,
  ogTitle: `ISAGMSM 2027 — ${siteMeta.fullNameZh}`,
  ogDescription: `${siteMeta.dates} · ${siteMeta.location} · 立即报名`,
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ConferenceEvent',
        name: siteMeta.fullNameEn,
        alternateName: siteMeta.fullNameZh,
        description: '第五届先进凝胶材料与软物质国际学术研讨会',
        startDate: '2027-04-24',
        endDate: '2027-04-26',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: transportationContent.venueName,
          address: {
            '@type': 'PostalAddress',
            addressLocality: '合肥',
            addressRegion: '安徽',
            addressCountry: 'CN',
          },
        },
        organizer: {
          '@type': 'Organization',
          name: 'ISAGMSM 组织委员会',
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
    <RegistrationSection />
    <SponsorsSection />
  </main>
</template>
