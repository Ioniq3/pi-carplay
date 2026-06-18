// @vitest-environment node

describe('store in node environment', () => {
  test('module init handles missing window', async () => {
    vi.resetModules()

    const { useLiviStore } = await import('../store')

    await Promise.resolve()

    expect(useLiviStore.getState().settings).toBeNull()
  })
})
