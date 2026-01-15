export function Restart(): null {
  window.app.restartApp().catch(console.error)
  return null
}
