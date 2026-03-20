import type { Plugin } from 'vite'
import { writeFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Vite plugin that generates a precache-manifest.json in the output
 * directory listing every built asset. The service worker fetches this
 * during install to pre-cache all JS, CSS, WASM, and font files.
 *
 * Must be the LAST plugin in the array so it runs after vite-plugin-wasm
 * and vite-plugin-top-level-await have emitted their assets.
 */
export function precacheManifest(): Plugin {
  return {
    name: 'precache-manifest',
    apply: 'build',
    writeBundle(options) {
      const outDir = options.dir ?? resolve(process.cwd(), 'dist')
      const assetsDir = resolve(outDir, 'assets')
      const assets: string[] = []

      // Read the actual dist/assets/ directory to catch everything —
      // including WASM files that Vite 8's rolldown may not include
      // in the bundle object passed to writeBundle.
      try {
        const files = readdirSync(assetsDir)
        for (const file of files) {
          if (/\.(js|css|wasm|woff2?|png|svg|ico)$/i.test(file)) {
            assets.push(`/assets/${file}`)
          }
        }
      } catch {
        // assetsDir doesn't exist — no assets to cache
      }

      const manifest = {
        version: `devmem-${Date.now()}`,
        assets,
      }

      writeFileSync(
        resolve(outDir, 'precache-manifest.json'),
        JSON.stringify(manifest, null, 2)
      )

      console.log(
        `[precache-manifest] Generated manifest with ${assets.length} assets`
      )
    },
  }
}
