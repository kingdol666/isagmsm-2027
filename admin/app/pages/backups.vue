<script setup lang="ts">
interface BackupFile {
  name: string
  sizeBytes: number
  createdAt: string
}

const { data, error, refresh } = await useFetch<{ backups: BackupFile[], intervalHours: number, keep: number }>('/api/backups')

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/login')
}, { immediate: true })

const busy = ref(false)
const message = ref('')

function sizeText(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

async function createNow() {
  busy.value = true
  message.value = ''
  try {
    const res = await $fetch<{ created: string }>('/api/backups', { method: 'POST' })
    message.value = `备份完成：${res.created}`
    await refresh()
  }
  catch (err: unknown) {
    message.value = (err as { data?: { statusMessage?: string } }).data?.statusMessage ?? '备份失败'
  }
  finally {
    busy.value = false
  }
}

async function remove(name: string) {
  busy.value = true
  try {
    await $fetch(`/api/backups/${name}`, { method: 'DELETE' })
    message.value = `已删除 ${name}`
    await refresh()
  }
  catch (err: unknown) {
    message.value = (err as { data?: { statusMessage?: string } }).data?.statusMessage ?? '删除失败'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ADMIN CONSOLE · DATABASE BACKUPS</span>
        <span class="sec-tag">{{ data?.backups.length ?? 0 }} 份备份</span>
      </div>
      <h1 class="sec-title">数据库<em>备份</em></h1>
    </header>

    <p class="guide">
      使用 <b>pg_dump（自定义格式）</b>对共享数据库做物理级转储。定时备份
      {{ data && data.intervalHours > 0 ? `每 ${data.intervalHours} 小时自动执行` : '当前未启用（BACKUP_INTERVAL_HOURS=0）' }}，
      自动保留最新 <b>{{ data?.keep ?? '—' }}</b> 份；恢复请由运维在受控环境执行
      <code class="mono">pg_restore</code>（不在网页暴露恢复入口，防止误操作）。
    </p>

    <div class="r-actions" style="margin-bottom: 16px;">
      <button class="btn btn-solid" type="button" :disabled="busy" @click="createNow">
        {{ busy ? '处理中…' : '立即备份' }}
      </button>
      <button class="btn btn-ghost" type="button" :disabled="busy" @click="refresh()">刷新列表</button>
    </div>

    <p v-if="message" class="msg">{{ message }}</p>

    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>备份文件</th>
            <th>大小</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in data?.backups ?? []" :key="file.name">
            <td class="cell-id">{{ file.name }}</td>
            <td class="fee">{{ sizeText(file.sizeBytes) }}</td>
            <td>{{ new Date(file.createdAt).toLocaleString('zh-CN') }}</td>
            <td>
              <div class="cell-ops">
                <a class="op" :href="`/api/backups/${file.name}`" download>下载</a>
                <button class="op danger" type="button" :disabled="busy" @click="remove(file.name)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!data?.backups.length" class="empty">还没有备份 —— 点击「立即备份」创建第一份。</p>
  </div>
</template>
