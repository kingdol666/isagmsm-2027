<script setup lang="ts">
import { siteContent } from '#shared/content/localized'

definePageMeta({ layout: 'site' })

const { locale, t } = useI18n()
const content = computed(() => siteContent(locale.value))

useSeoMeta({
  title: () => t('home.seo.title', {
    name: content.value.siteMeta.fullName,
    dates: content.value.siteMeta.dates,
    location: content.value.siteMeta.location,
  }),
  description: () => t('home.seo.description', {
    nameEn: content.value.siteMeta.fullNameEn,
    nameZh: content.value.siteMeta.fullNameZh,
    dates: content.value.siteMeta.dates,
    location: content.value.siteMeta.location,
  }),
  ogTitle: () => t('home.seo.ogTitle', { name: content.value.siteMeta.fullName }),
  ogDescription: () => t('home.seo.ogDescription', {
    dates: content.value.siteMeta.dates,
    location: content.value.siteMeta.location,
  }),
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
        name: content.value.siteMeta.fullNameEn,
        alternateName: content.value.siteMeta.fullNameZh,
        description: '第五届先进凝胶材料与软物质国际学术研讨会',
        startDate: '2027-04-09',
        endDate: '2027-04-11',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: content.value.transportationContent.venueName,
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
          email: content.value.siteMeta.email,
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
