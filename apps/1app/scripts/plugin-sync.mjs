#!/usr/bin/env node
/**
 * Copy plugin/ → dist/ for the WordPress-loadable plugin.
 * Preserves dist/build/ (owned by Vite).
 */

import {
    cpSync,
    existsSync,
    mkdirSync,
    readdirSync,
    rmSync,
    statSync,
    watch,
  } from "node:fs"
  import { dirname, join, resolve } from "node:path"
  import { fileURLToPath } from "node:url"
  
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const root = resolve(__dirname, "..")
  const srcDir = join(root, "plugin")
  const distDir = join(root, "dist")
  
  const watchMode = process.argv.includes("--watch")
  
  /**
   * Remove everything in dist except build/.
   */
  function clearDistExceptBuild() {
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true })
      return
    }
  
    for (const entry of readdirSync(distDir)) {
      if (entry === "build") {
        continue
      }
      rmSync(join(distDir, entry), { recursive: true, force: true })
    }
  }
  
  /**
   * Sync plugin/ into dist/.
   */
  function sync() {
    if (!existsSync(srcDir)) {
      console.error("sync-plugin: plugin/ not found")
      process.exit(1)
    }
  
    clearDistExceptBuild()
    cpSync(srcDir, distDir, { recursive: true })
    console.log("sync-plugin: plugin/ → dist/")
  }
  
  sync()
  
  if (!watchMode) {
    process.exit(0)
  }
  
  console.log("sync-plugin: watching plugin/…")
  
  let timer = null
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      try {
        sync()
      } catch (err) {
        console.error("sync-plugin: sync failed", err)
      }
    }, 100)
  }
  
  /**
   * Recursively watch a directory (macOS/Node recursive support).
   *
   * @param {string} dir
   */
  function watchTree(dir) {
    try {
      watch(dir, { recursive: true }, () => schedule())
      return
    } catch {
      // Fall back to non-recursive per-directory watches.
    }
  
    watch(dir, () => schedule())
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        watchTree(full)
      }
    }
  }
  
  watchTree(srcDir)
  
  // Keep process alive.
  process.stdin.resume()