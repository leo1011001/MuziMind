import React from 'react';
import '../UI.css';

interface LanguageToggleProps {
  value?: 'bg' | 'en';
  onChange?: (lang: 'bg' | 'en') => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ 
  value = 'bg', 
  onChange 
}) => {
  const handleToggle = (lang: 'bg' | 'en') => {
    if (onChange) {
      onChange(lang);
    }
  };

  return (
    <div className="language-toggle">
      <button
        className={`lang-option ${value === 'bg' ? 'active' : ''}`}
        onClick={() => handleToggle('bg')}
        type="button"
      >
        BG
      </button>
      <button
        className={`lang-option ${value === 'en' ? 'active' : ''}`}
        onClick={() => handleToggle('en')}
        type="button"
      >
        EN
      </button>
    </div>
  );
};
