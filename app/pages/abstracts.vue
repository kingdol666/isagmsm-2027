<script setup lang="ts">
import { abstractsContent, themesContent } from '#shared/content/site'

definePageMeta({ layout: 'site' })
useSeoMeta({ title: '征文投稿' })
</script>

<template>
  <main id="main" class="page">
    <div class="wrap">
      <header class="sec-head">
        <div class="sec-meta">
          <span class="sec-code">{{ abstractsContent.code }}</span>
          <span class="sec-tag">{{ abstractsContent.tag }}</span>
        </div>
        <h1 class="sec-title">{{ abstractsContent.title }}</h1>
      </header>

      <p class="intro">{{ abstractsContent.intro }}</p>

      <!-- 征文主题 -->
      <section class="block">
        <h2 class="b-title">征文主题</h2>
        <ol class="topic-index">
          <li v-for="topic in themesContent.items" :key="topic.no">
            <span class="t-no">{{ topic.no }}</span>
            <div>
              <h3 class="t-title">{{ topic.title }}</h3>
              <p class="t-desc">{{ topic.desc }}</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- 征文要求 -->
      <section class="block">
        <h2 class="b-title">征文要求</h2>
        <ol class="req-list">
          <li v-for="(req, index) in abstractsContent.requirements" :key="index">
            <span class="r-no mono">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="r-text">{{ req }}</span>
          </li>
        </ol>
      </section>

      <!-- 投稿方式 -->
      <section class="block">
        <h2 class="b-title">投稿方式</h2>
        <div class="submit-box">
          <p class="s-text">{{ abstractsContent.submit.channel }}</p>
          <a class="s-mail" :href="`mailto:${abstractsContent.submit.email}?subject=ISAGMSM%E6%8A%95%E7%A8%BF`">
            {{ abstractsContent.submit.email }}
          </a>
          <p class="s-deadline mono">截稿：{{ abstractsContent.submit.deadline }}</p>
        </div>
      </section>

      <p class="page-note mono">{{ abstractsContent.contact }}</p>
    </div>
  </main>
</template>

<style scoped>
.page {
  padding-block: clamp(48px, 8vh, 96px);
}

.intro {
  font-size: clamp(15.5px, 1.3vw, 17px);
  line-height: 1.9;
  max-width: 62ch;
  margin-bottom: clamp(36px, 5vw, 56px);
}

.block {
  margin-bottom: clamp(40px, 6vw, 64px);
}

.b-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--copper-deep);
  border-top: 1px solid var(--ink);
  padding-top: 14px;
  margin-bottom: 18px;
}

/* topics */
.topic-index {
  border-bottom: 1px solid var(--ink);
}

.topic-index li {
  display: grid;
  grid-template-columns: 56px 1fr;
  column-gap: 18px;
  border-top: 1px solid var(--hairline);
  padding: 18px 10px 18px 0;
  transition: background-color .2s ease;
}

.topic-index li:hover {
  background: rgba(180, 95, 58, .055);
}

.t-no {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: .08em;
  color: var(--grey);
}

.t-title {
  font-size: 16.5px;
  font-weight: 600;
}

.t-desc {
  font-size: 14.5px;
  color: var(--grey);
  margin-top: 6px;
  line-height: 1.7;
  max-width: 62ch;
}

/* requirements */
.req-list {
  border-bottom: 1px solid var(--ink);
}

.req-list li {
  display: grid;
  grid-template-columns: 48px 1fr;
  column-gap: 14px;
  border-top: 1px solid var(--hairline);
  padding: 14px 0;
  align-items: baseline;
}

.r-no {
  font-size: 12.5px;
  color: var(--copper-deep);
}

.r-text {
  font-size: 15px;
  line-height: 1.8;
}

/* submit box */
.submit-box {
  border: 1px solid var(--ink);
  padding: clamp(20px, 3vw, 30px);
}

.s-text {
  font-size: 15px;
  line-height: 1.8;
  max-width: 58ch;
}

.s-mail {
  display: inline-block;
  margin-top: 14px;
  font-family: var(--mono);
  font-size: 15px;
  color: var(--copper-deep);
  border-bottom: 1px solid var(--copper-deep);
}

.s-deadline {
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--grey);
  letter-spacing: .08em;
}

.page-note {
  font-size: 12px;
  color: var(--grey);
  border-top: 1px solid var(--hairline);
  padding-top: 16px;
}

@media (min-width: 768px) {
  .topic-index li {
    grid-template-columns: 72px minmax(0, 5fr) minmax(0, 6fr);
    grid-template-areas: "no title desc";
    align-items: baseline;
  }

  .topic-index li .t-no { grid-area: no; }
  .topic-index li h3 { grid-area: title; margin-top: 2px; }
  .topic-index li .t-desc { grid-area: desc; margin-top: 0; }
}
</style>
