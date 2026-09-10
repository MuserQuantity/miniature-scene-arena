import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    files: ['components/scenes/**/*.tsx'],
    rules: { 'react/no-unknown-property': 'off' },
  },
  globalIgnores(['.next/**', 'out/**', 'dist/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**']),
])
