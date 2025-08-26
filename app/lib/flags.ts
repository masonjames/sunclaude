export type FeatureFlags = {
  calendarBiDi: boolean;
  github: boolean;
  pwa: boolean;
  mobile: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    calendarBiDi: process.env.NEXT_PUBLIC_ENABLE_CALENDAR_BIDI === 'true',
    github: process.env.NEXT_PUBLIC_ENABLE_GITHUB === 'true',
    pwa: process.env.NEXT_PUBLIC_ENABLE_PWA === 'true',
    mobile: process.env.NEXT_PUBLIC_ENABLE_MOBILE === 'true',
  }
}

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatureFlags()[feature]
}