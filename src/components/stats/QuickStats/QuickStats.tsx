import React from 'react';

interface QuickStatsProps {
  stats: any;
  language: 'bg' | 'en';
}

export const QuickStats: React.FC<QuickStatsProps> = ({ language }) => {
  return (
    <div className="quick-stats">
      <h3>{language === 'bg' ? 'Бързи статистики' : 'Quick Stats'}</h3>
      <p>{language === 'bg' ? 'Компонент за статистики - placeholder' : 'Stats component placeholder'}</p>
    </div>
  );
};
