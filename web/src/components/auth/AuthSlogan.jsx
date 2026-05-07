import React from 'react';
import { useTranslation } from 'react-i18next';

const AuthSlogan = () => {
  const { t } = useTranslation();
  return (
    <div className='auth-slogan'>
      <div className='auth-slogan-line' />
      <h1 className='auth-slogan-headline'>
        {t('将闲置 GPU 转化为')}
        <br />
        <span className='auth-slogan-accent'>{t('稳定收益')}</span>
      </h1>
      <p className='auth-slogan-desc'>
        {t('Teniu.AI 是一个去中心化 GPU 共享网络，让您将闲置算力变现。支持 Ollama 本地模型和 LLM Token 共享。')}
      </p>
      <div className='auth-slogan-tags'>
        <span className='auth-slogan-tag'>{t('GPU 共享')}</span>
        <span className='auth-slogan-tag'>{t('Ollama')}</span>
        <span className='auth-slogan-tag'>{t('LLM Token')}</span>
        <span className='auth-slogan-tag'>{t('去中心化')}</span>
      </div>
    </div>
  );
};

export default AuthSlogan;
