const modules = import.meta.glob('../**/*.ts')

const entries = Object.entries(modules).filter(
  ([p]) =>
    !p.includes('/__tests__/') &&
    !p.endsWith('.test.ts') &&
    !p.endsWith('.d.ts') &&
    p !== '../index.ts'
)

describe('main module smoke imports', () => {
  test.each(entries)('imports %s', async (_modulePath, load) => {
    await expect((load as () => Promise<unknown>)()).resolves.toBeDefined()
  })
})
