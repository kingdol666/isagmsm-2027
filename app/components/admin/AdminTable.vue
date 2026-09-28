<script lang="ts">
export interface AdminColumn {
  key: string
  label: string
  mono?: boolean
  width?: string
}
</script>

<script setup lang="ts" generic="Row extends Record<string, unknown>">
const props = defineProps<{
  columns: AdminColumn[]
  rows: Row[]
  rowKey?: (row: Row) => string
  empty?: string
}>()

function keyFor(row: Row, index: number): string {
  return props.rowKey ? props.rowKey(row) : String(row.id ?? index)
}
</script>

<template>
  <div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="col.width ? { width: col.width } : undefined"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length">
          <td :colspan="columns.length" class="empty">{{ empty ?? 'No records.' }}</td>
        </tr>
        <tr v-for="(row, index) in rows" :key="keyFor(row, index)">
          <td v-for="col in columns" :key="col.key" :class="{ mono: col.mono }">
            <slot :name="col.key" :row="row">{{ row[col.key] }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tbl-wrap {
  overflow-x: auto;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.tbl th {
  text-align: left;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--grey);
  padding: 12px 14px 12px 0;
  border-bottom: 1px solid var(--ink);
  white-space: nowrap;
}

.tbl td {
  padding: 12px 14px 12px 0;
  border-bottom: 1px solid var(--hairline);
  vertical-align: top;
}

.tbl td.mono {
  font-family: var(--mono);
  font-size: 12.5px;
  letter-spacing: .04em;
}

.tbl td.empty {
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--grey);
  padding: 24px 0;
}
</style>
