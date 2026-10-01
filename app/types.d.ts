/* Vite 资产导入的类型声明（MapLibre worker 显式注入用）：
   ?worker&url 把 worker 连同依赖图打包成自洽产物并返回其 URL */
declare module 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url' {
  const workerUrl: string
  export default workerUrl
}
