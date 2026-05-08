import React from 'react';
import { useTranslation } from 'react-i18next';
import LegalPageLayout from '../../components/layout/LegalPageLayout';

const LandingAbout = () => {
  const { t } = useTranslation();

  return (
    <LegalPageLayout
      title={t('关于我们')}
      subtitle={t('Teniu.AI — 让每一份算力都有价值')}
    >
      <div className='lp-legal-section'>
        <h2>{t('我们的使命')}</h2>
        <p>
          {t('Teniu.AI 致力于构建去中心化的智能算力共享网络，让全球用户能够轻松共享和使用闲置的计算资源。我们相信，通过连接世界各地的算力节点，可以大幅降低 AI 推理和计算的成本，让先进的人工智能技术惠及每一个人。')}
        </p>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('团队介绍')}</h2>
        <p>
          {t('我们的团队由来自顶尖互联网公司的资深工程师和技术专家组成，核心成员拥有超过 10 年的云计算、分布式系统和人工智能领域的研发经验。团队成员曾就职于国内外知名科技企业，参与过大规模分布式系统、容器编排平台、机器学习基础设施等核心项目的设计与开发。')}
        </p>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('核心技术')}</h2>
        <div className='lp-legal-card-grid'>
          <div className='lp-legal-card'>
            <div className='lp-legal-card-icon'>
              <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#00ff88' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <rect x='2' y='2' width='20' height='8' rx='2' ry='2'/>
                <rect x='2' y='14' width='20' height='8' rx='2' ry='2'/>
                <line x1='6' y1='6' x2='6.01' y2='6'/>
                <line x1='6' y1='18' x2='6.01' y2='18'/>
              </svg>
            </div>
            <h3>{t('分布式计算')}</h3>
            <p>{t('基于自研的智能调度算法，实现跨区域算力节点的高效协同，确保任务的低延迟和高可用性。')}</p>
          </div>
          <div className='lp-legal-card'>
            <div className='lp-legal-card-icon'>
              <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#00a8ff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/>
              </svg>
            </div>
            <h3>{t('安全加密')}</h3>
            <p>{t('采用端到端加密和零信任网络架构，保障数据传输和计算过程中的安全性与隐私保护。')}</p>
          </div>
          <div className='lp-legal-card'>
            <div className='lp-legal-card-icon'>
              <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#8b5cf6' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='22 12 18 12 15 21 9 3 6 12 2 12'/>
              </svg>
            </div>
            <h3>{t('智能网关')}</h3>
            <p>{t('轻量级客户端一键部署，自动发现本地服务并安全暴露到云端，支持 Ollama、vLLM 等主流框架。')}</p>
          </div>
          <div className='lp-legal-card'>
            <div className='lp-legal-card-icon'>
              <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#00ff88' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='12' cy='12' r='10'/>
                <line x1='2' y1='12' x2='22' y2='12'/>
                <path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/>
              </svg>
            </div>
            <h3>{t('全球网络')}</h3>
            <p>{t('分布在全球多个区域的接入节点，实现就近接入和智能路由，提供稳定流畅的使用体验。')}</p>
          </div>
        </div>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('我们的价值观')}</h2>
        <div className='lp-legal-card-grid'>
          <div className='lp-legal-card'>
            <h3>{t('开放共享')}</h3>
            <p>{t('我们相信技术的力量在于共享。通过开放的生态，让每一份闲置算力都能发挥价值。')}</p>
          </div>
          <div className='lp-legal-card'>
            <h3>{t('用户至上')}</h3>
            <p>{t('始终以用户需求为核心，持续优化产品体验，让技术真正服务于人。')}</p>
          </div>
          <div className='lp-legal-card'>
            <h3>{t('持续创新')}</h3>
            <p>{t('保持对前沿技术的敏锐嗅觉，不断探索分布式计算和 AI 的新可能。')}</p>
          </div>
        </div>
      </div>

      <div className='lp-legal-contact'>
        <h2>{t('联系我们')}</h2>
        <p>{t('如有任何问题或合作意向，欢迎联系我们')}</p>
        <p>
          <a href='mailto:support@teniuapi.online'>support@teniuapi.online</a>
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default LandingAbout;
