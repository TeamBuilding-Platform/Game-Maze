import pkg from '../../package.json' with { type: 'json' }

export const APP_CONFIG = {
  version: pkg.version,
}

export const APP_VERSION = APP_CONFIG.version
