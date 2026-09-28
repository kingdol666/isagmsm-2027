<template>
  <div class="admin">
    <header class="admin-bar">
      <NuxtLink to="/admin" class="a-brand">ISAGMSM <span>ADMIN</span></NuxtLink>
      <nav class="a-nav" aria-label="Admin sections">
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/approvals">缴费审批</NuxtLink>
        <NuxtLink to="/admin/participants">参会人员管理</NuxtLink>
        <NuxtLink to="/admin/abstracts">稿件审稿</NuxtLink>
        <NuxtLink to="/admin/orders">Orders</NuxtLink>
        <NuxtLink to="/admin/payments">Payments</NuxtLink>
        <NuxtLink to="/admin/checkins">Check-ins</NuxtLink>
      </nav>
      <button class="a-scan" type="button" @click="navigateTo('/scan')">Scan app</button>
    </header>
    <main class="admin-main wrap">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.admin {
  min-height: 100svh;
  background: var(--paper);
}

.admin-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 14px var(--pad);
  background: var(--ink);
  color: var(--paper);
}

.a-brand {
  font-family: var(--serif);
  font-size: 22px;
  color: var(--paper);
  white-space: nowrap;
}

.a-brand i { font-style: normal; color: var(--copper-light); }

.a-brand span {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .18em;
  color: var(--paper-dim);
  margin-left: 8px;
}

.a-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 18px;
  flex: 1;
}

.a-nav a {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--paper-dim);
  padding: 4px 0;
  transition: color .2s ease;
}

.a-nav a:hover,
.a-nav a.router-link-active {
  color: var(--copper-light);
}

.a-scan {
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: .12em;
  text-transform: uppercase;
  border: 1px solid var(--paper-hl);
  color: var(--paper);
  background: transparent;
  padding: 8px 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color .2s ease, color .2s ease;
}

.a-scan:hover { border-color: var(--copper-light); color: var(--copper-light); }

.admin-main {
  padding-block: clamp(28px, 4vw, 48px);
}

@media (max-width: 767px) {
  .admin-bar { flex-wrap: wrap; gap: 10px 16px; }
}
</style>
