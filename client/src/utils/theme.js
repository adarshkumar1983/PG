/**
 * Theme manager helper for StayZen (Apple premium native dark/light mode experience)
 */

export function getThemeSetting() {
  return localStorage.getItem('stayzen-theme') || 'system';
}

export function getActiveTheme() {
  const setting = getThemeSetting();
  if (setting === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return setting;
}

export function applyTheme(setting) {
  const root = document.documentElement;
  const isDark = setting === 'dark' || (setting === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
    
    // Apple premium dark mode browser accent colors
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute('content', '#121314');
  } else {
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
    
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute('content', '#0b4438');
  }
}

export function setThemeSetting(setting) {
  localStorage.setItem('stayzen-theme', setting);
  applyTheme(setting);
  // Dispatch a custom event to notify other components of the change
  window.dispatchEvent(new Event('stayzen-theme-change'));
}
