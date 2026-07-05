import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { getThemeSetting, setThemeSetting } from '../utils/theme.js';

export function ThemeToggle({ style }) {
  const [themeSetting, setThemeSettingState] = useState(getThemeSetting());
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  useEffect(() => {
    const handleThemeChange = () => {
      setThemeSettingState(getThemeSetting());
    };
    window.addEventListener('stayzen-theme-change', handleThemeChange);
    return () => window.removeEventListener('stayzen-theme-change', handleThemeChange);
  }, []);

  const handleSelectTheme = (newTheme) => {
    setThemeSetting(newTheme);
    setThemeDropdownOpen(false);
  };

  return (
    <div style={{ position: 'relative', ...style }}>
      <button 
        type="button"
        className="icon-button" 
        onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
        title={`Theme: ${themeSetting}`}
        style={{ display: 'grid', placeItems: 'center', height: '34px', width: '34px', borderRadius: '50%', cursor: 'pointer' }}
      >
        {themeSetting === 'light' && <Sun size={19} />}
        {themeSetting === 'dark' && <Moon size={19} />}
        {themeSetting === 'system' && <Monitor size={19} />}
      </button>
      {themeDropdownOpen && (
        <>
          <div 
            onClick={() => setThemeDropdownOpen(false)} 
            style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
          />
          <div 
            className="card"
            style={{
              position: 'absolute',
              right: 0,
              top: '42px',
              width: '130px',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              zIndex: 100,
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              borderRadius: '10px',
              animation: 'dropdown-slide 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <button 
              type="button"
              onClick={() => handleSelectTheme('light')}
              className="dropdown-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                border: 0,
                background: themeSetting === 'light' ? 'var(--sidebar-hover-bg)' : 'transparent',
                color: themeSetting === 'light' ? 'var(--green)' : 'var(--text-primary)',
                fontWeight: themeSetting === 'light' ? '600' : '500',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background-color 0.15s, color 0.15s'
              }}
            >
              <Sun size={14} /> Light
            </button>
            <button 
              type="button"
              onClick={() => handleSelectTheme('dark')}
              className="dropdown-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                border: 0,
                background: themeSetting === 'dark' ? 'var(--sidebar-hover-bg)' : 'transparent',
                color: themeSetting === 'dark' ? 'var(--green)' : 'var(--text-primary)',
                fontWeight: themeSetting === 'dark' ? '600' : '500',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background-color 0.15s, color 0.15s'
              }}
            >
              <Moon size={14} /> Dark
            </button>
            <button 
              type="button"
              onClick={() => handleSelectTheme('system')}
              className="dropdown-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                border: 0,
                background: themeSetting === 'system' ? 'var(--sidebar-hover-bg)' : 'transparent',
                color: themeSetting === 'system' ? 'var(--green)' : 'var(--text-primary)',
                fontWeight: themeSetting === 'system' ? '600' : '500',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background-color 0.15s, color 0.15s'
              }}
            >
              <Monitor size={14} /> System
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ThemeToggle;
