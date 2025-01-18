// utils.ts
export function parseTimeToMinutes(timeString: string): number {
  if (!timeString) return 0;
  const [hh, mm] = timeString.split(':').map(Number);
  return hh * 60 + (mm || 0);
}

export function isValidEmail(str: string): boolean {
  return /.+@.+\..+/.test(str.trim());
}

export function getTimezoneOffsetInHours(tz: string): number {
  const dt = new Date();
  const localMillis = dt.getTime();
  const tzString = dt.toLocaleString('en-US', { timeZone: tz });
  const tzMillis = Date.parse(tzString);
  return (localMillis - tzMillis) / 3600000;
}

/**
 * Wykrywa Safari na iOS (iPhone/iPad).
 * @returns true, jeśli to Safari w systemie iOS.
 */
export function isIOSSafari(): boolean {
  const userAgent = navigator.userAgent;
  const iOS = /iP(hone|od|ad)/.test(userAgent);
  const webkit = /WebKit/.test(userAgent);
  // CriOS = Chrome on iOS; FxiOS = Firefox on iOS
  return iOS && webkit && !/CriOS|FxiOS/.test(userAgent);
}
