/**
 * Global configuration for joyful CLI
 *
 * Centralizes all configuration including environment variables and paths
 * Environment files should be loaded using Node's --env-file flag
 */

import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import packageJson from '../package.json'

class Configuration {
  public readonly serverUrl: string | null
  public readonly webappUrl: string | null
  public readonly isDaemonProcess: boolean

  // Directories and paths (from persistence)
  public readonly joyfulHomeDir: string
  public readonly logsDir: string
  public readonly settingsFile: string
  public readonly privateKeyFile: string
  public readonly daemonStateFile: string
  public readonly daemonLockFile: string
  public readonly currentCliVersion: string

  public readonly isExperimentalEnabled: boolean
  public readonly disableCaffeinate: boolean

  constructor() {
    // Server configuration - priority: parameter > environment; no defaults (self-hosting only)
    this.serverUrl = process.env.JOYFUL_SERVER_URL || null
    this.webappUrl = process.env.JOYFUL_WEBAPP_URL || null

    // Check if we're running as daemon based on process args
    const args = process.argv.slice(2)
    this.isDaemonProcess = args.length >= 2 && args[0] === 'daemon' && (args[1] === 'start-sync')

    // Directory configuration - Priority: JOYFUL_HOME_DIR env > default home dir
    if (process.env.JOYFUL_HOME_DIR) {
      // Expand ~ to home directory if present
      const expandedPath = process.env.JOYFUL_HOME_DIR.replace(/^~/, homedir())
      this.joyfulHomeDir = expandedPath
    } else {
      this.joyfulHomeDir = join(homedir(), '.joyful')
    }

    this.logsDir = join(this.joyfulHomeDir, 'logs')
    this.settingsFile = join(this.joyfulHomeDir, 'settings.json')
    this.privateKeyFile = join(this.joyfulHomeDir, 'access.key')
    this.daemonStateFile = join(this.joyfulHomeDir, 'daemon.state.json')
    this.daemonLockFile = join(this.joyfulHomeDir, 'daemon.state.json.lock')

    this.isExperimentalEnabled = ['true', '1', 'yes'].includes(process.env.JOYFUL_EXPERIMENTAL?.toLowerCase() || '');
    this.disableCaffeinate = ['true', '1', 'yes'].includes(process.env.JOYFUL_DISABLE_CAFFEINATE?.toLowerCase() || '');

    this.currentCliVersion = packageJson.version

    // Validate variant configuration
    const variant = process.env.JOYFUL_VARIANT || 'stable'
    if (variant === 'dev' && !this.joyfulHomeDir.includes('dev')) {
      console.warn('⚠️  WARNING: JOYFUL_VARIANT=dev but JOYFUL_HOME_DIR does not contain "dev"')
      console.warn(`   Current: ${this.joyfulHomeDir}`)
      console.warn(`   Expected: Should contain "dev" (e.g., ~/.joyful-dev)`)
    }

    // Visual indicator on CLI startup (only if not daemon process to avoid log clutter)
    if (!this.isDaemonProcess && variant === 'dev') {
      console.log('\x1b[33m🔧 DEV MODE\x1b[0m - Data: ' + this.joyfulHomeDir)
    }

    if (!existsSync(this.joyfulHomeDir)) {
      mkdirSync(this.joyfulHomeDir, { recursive: true })
    }
    // Ensure directories exist
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true })
    }
  }

  /**
   * Returns the server URL or throws an actionable error if not configured.
   * Call this at startup for commands that require a server connection.
   */
  public requireServerUrl(): string {
    if (!this.serverUrl) {
      console.error('Error: JOYFUL_SERVER_URL is not configured.')
      console.error('')
      console.error('Joyful requires an explicit server URL to connect to.')
      console.error('Set it via environment variable:')
      console.error('  export JOYFUL_SERVER_URL=https://your-server.example.com')
      console.error('')
      console.error('Or add it to your ~/.joyful/config file.')
      process.exit(1)
    }
    return this.serverUrl
  }
}

export const configuration: Configuration = new Configuration()
