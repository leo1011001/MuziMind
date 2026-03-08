import React, { useState } from 'react';
import './UIComponents.css';

interface LanguageToggleProps {
  value?: 'bg' | 'en';
  onChange?: (lang: 'bg' | 'en') => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ 
  value = 'bg', 
  onChange 
}) => {
  const [showBoth, setShowBoth] = useState(false);

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
      <button
        className="lang-both-toggle"
        onClick={() => setShowBoth(!showBoth)}
        type="button"
      >
        {showBoth ? 'Hide Both' : 'Show Both'}
      </button>
      {showBoth && (
        <div className="lang-both-display">
          <div className="lang-both-bg">
            <span>BG:</span> <span>Твоето музикално пътешествие продължава тук...</span>
          </div>
          <div className="lang-both-en">
            <span>EN:</span> <span>Your musical journey continues here...</span>
          </div>
        </div>
      )}
    </div>
  );
};