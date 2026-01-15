export function PowerOff(): null {
  window.app.quitApp().catch(console.error)
  return null
}
