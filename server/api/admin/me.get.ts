export default defineEventHandler((event) => {
  const session = requireSession(event)
  return { user: session }
})
