<template>
  <div>
    <SiteTopbar />
    <SiteRail />
    <!-- Footer lives INSIDE the main content column (not beside it) so the
         fixed index rail can never cover it — the Direction-C port fix. -->
    <div class="site-main">
      <slot />
      <SiteFooter />
    </div>
  </div>
</template>

<style scoped>
.site-main {
  padding-top: 60px; /* topbar offset (mobile / tablet) */
}

@media (min-width: 1024px) {
  .site-main {
    padding-top: 0;
    margin-left: var(--rail-w);
  }
}
</style>
