import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../../pages/Home/landing.css';

const LegalPageLayout = ({ title, subtitle, children }) => {
  const { t } = useTranslation();

  return (
    <div className='lp-legal-page'>
      <nav className='lp-legal-nav'>
        <Link to='/' className='lp-legal-nav-brand'>
          Teniu Cloud
        </Link>
        <Link to='/' className='lp-legal-nav-back'>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='15 18 9 12 15 6' />
          </svg>
          {t('返回首页')}
        </Link>
      </nav>
      <div className='lp-legal-container'>
        <h1 className='lp-legal-title'>{title}</h1>
        {subtitle && <p className='lp-legal-subtitle'>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
};

export default LegalPageLayout;
