/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useContext, useEffect, useState } from 'react';
import { API, showError } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';
import './landing.css';

const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const isMobile = useIsMobile();

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);

      if (data.startsWith('https://')) {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
            iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
          };
        }
      }
    } else {
      showError(message);
      setHomePageContent('加载首页内容失败...');
    }
    setHomePageContentLoaded(true);
  };

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeVisible(true);
          }
        } catch (error) {
          console.error('获取公告失败:', error);
        }
      }
    };
    checkNoticeAndShow();
  }, []);

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  const docsLink = statusState?.status?.docs_link || '';

  return (
    <div className='w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <div className='landing-page'>
          {/* Header */}
          <header className='lp-header'>
            <div className='lp-header-content'>
              <div className='lp-logo'>Teniu Cloud</div>
              <nav className='lp-nav'>
                <a href='#features'>{t('功能特性')}</a>
                <a href='#how-it-works'>{t('使用流程')}</a>
                <a href='#pricing'>{t('价格方案')}</a>
                <Link to='/login' className='lp-nav-btn'>{t('开始使用')}</Link>
              </nav>
            </div>
          </header>

          {/* Hero */}
          <section className='lp-hero'>
            <div className='lp-hero-bg' />
            <div className='lp-hero-content'>
              <div className='lp-hero-badge'>
                <span>Global DePIN AI Network</span>
              </div>
              <h1>
                {t('将闲置 GPU')}{' '}
                <span className='lp-highlight'>{t('转化为')}</span>
                <br />
                {t('稳定收益')}
              </h1>
              <p className='lp-hero-desc'>
                {t('Teniu Cloud 是一个去中心化 GPU 共享网络，让您将闲置算力变现。支持 Ollama 本地模型和 LLM Token 共享。')}
              </p>
              <div className='lp-hero-stats'>
                <div>
                  <div className='lp-stat-value'>10K+</div>
                  <div className='lp-stat-label'>{t('活跃节点')}</div>
                </div>
                <div>
                  <div className='lp-stat-value'>$2.5M+</div>
                  <div className='lp-stat-label'>{t('已分发奖励')}</div>
                </div>
                <div>
                  <div className='lp-stat-value'>99.9%</div>
                  <div className='lp-stat-label'>{t('在线率')}</div>
                </div>
              </div>
              <div className='lp-hero-buttons'>
                <Link to='/register' className='lp-btn lp-btn-primary'>
                  <span>{t('立即开始赚取')}</span>
                  <span>&rarr;</span>
                </Link>
                {docsLink && (
                  <a href={docsLink} target='_blank' rel='noreferrer' className='lp-btn lp-btn-secondary'>
                    {t('查看文档')}
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Features */}
          <section className='lp-features' id='features'>
            <div className='lp-section-header'>
              <div className='lp-section-tag'>Features</div>
              <h2 className='lp-section-title'>{t('为什么选择 Teniu Cloud？')}</h2>
              <p className='lp-section-desc'>{t('最强大的去中心化 GPU 共享平台，帮助您轻松将闲置资源变现。')}</p>
            </div>
            <div className='lp-features-grid'>
              <div className='lp-feature-card'>
                <div className='lp-feature-icon'>&#9889;</div>
                <h3>{t('一键部署')}</h3>
                <p>{t('仅需 5 分钟即可安装配置，自动检测环境并优化设置，获得最佳性能。')}</p>
              </div>
              <div className='lp-feature-card'>
                <div className='lp-feature-icon'>&#128274;</div>
                <h3>{t('安全可靠')}</h3>
                <p>{t('企业级安全架构，加密传输与隔离保护，确保数据安全。')}</p>
              </div>
              <div className='lp-feature-card'>
                <div className='lp-feature-icon'>&#128176;</div>
                <h3>{t('实时结算')}</h3>
                <p>{t('智能合约自动结算，实时查看收益，支持多种提现方式。')}</p>
              </div>
              <div className='lp-feature-card'>
                <div className='lp-feature-icon'>&#127760;</div>
                <h3>{t('全球网络')}</h3>
                <p>{t('节点遍布全球，确保低延迟和高可用性，提供最佳用户体验。')}</p>
              </div>
              <div className='lp-feature-card'>
                <div className='lp-feature-icon'>&#129302;</div>
                <h3>{t('Ollama 支持')}</h3>
                <p>{t('原生支持 Ollama 本地模型，轻松共享您的 AI 模型并赚取额外收益。')}</p>
              </div>
              <div className='lp-feature-card'>
                <div className='lp-feature-icon'>&#128202;</div>
                <h3>{t('智能调度')}</h3>
                <p>{t('智能任务调度系统，自动匹配最优节点，最大化效率和收益。')}</p>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className='lp-how-it-works' id='how-it-works'>
            <div className='lp-section-header'>
              <div className='lp-section-tag'>How It Works</div>
              <h2 className='lp-section-title'>{t('简单 3 步，开始赚取')}</h2>
              <p className='lp-section-desc'>{t('流程简单，即刻开始赚取收益。')}</p>
            </div>
            <div className='lp-steps'>
              <div className='lp-step'>
                <div className='lp-step-number'>01</div>
                <div className='lp-step-content'>
                  <h3>{t('注册账户')}</h3>
                  <p>{t('创建您的 Teniu Cloud 账户并完成身份验证，开启您的赚取之旅。')}</p>
                </div>
              </div>
              <div className='lp-step'>
                <div className='lp-step-number'>02</div>
                <div className='lp-step-content'>
                  <h3>{t('连接设备')}</h3>
                  <p>{t('下载安装我们的轻量级客户端，自动检测您的 GPU 配置并优化设置。')}</p>
                </div>
              </div>
              <div className='lp-step'>
                <div className='lp-step-number'>03</div>
                <div className='lp-step-content'>
                  <h3>{t('开始赚取')}</h3>
                  <p>{t('您的设备将自动接收计算任务，实时监控收益，随时提现。')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className='lp-pricing' id='pricing'>
            <div className='lp-section-header'>
              <div className='lp-section-tag'>Pricing</div>
              <h2 className='lp-section-title'>{t('灵活的价格方案')}</h2>
              <p className='lp-section-desc'>{t('选择最适合您的方案，随时升级。')}</p>
            </div>
            <div className='lp-pricing-cards'>
              <div className='lp-pricing-card'>
                <h3>{t('免费版')}</h3>
                <div className='lp-pricing-value'><span className='lp-currency'>$</span>0</div>
                <div className='lp-pricing-period'>{t('永久免费')}</div>
                <ul className='lp-pricing-features'>
                  <li>{t('1 个 GPU 节点')}</li>
                  <li>{t('基础收益分成')}</li>
                  <li>{t('社区支持')}</li>
                  <li>{t('标准结算')}</li>
                </ul>
                <Link to='/register' className='lp-btn lp-btn-secondary'>{t('开始使用')}</Link>
              </div>
              <div className='lp-pricing-card lp-featured'>
                <h3>Pro</h3>
                <div className='lp-pricing-value'><span className='lp-currency'>$</span>29</div>
                <div className='lp-pricing-period'>{t('每月')}</div>
                <ul className='lp-pricing-features'>
                  <li>{t('无限 GPU 节点')}</li>
                  <li>{t('优先任务分配')}</li>
                  <li>{t('7×24 优先支持')}</li>
                  <li>{t('实时结算')}</li>
                  <li>{t('高级数据分析')}</li>
                </ul>
                <Link to='/register' className='lp-btn lp-btn-primary'>{t('选择 Pro')}</Link>
              </div>
              <div className='lp-pricing-card'>
                <h3>{t('企业版')}</h3>
                <div className='lp-pricing-value'>{t('定制')}</div>
                <div className='lp-pricing-period'>{t('专属方案')}</div>
                <ul className='lp-pricing-features'>
                  <li>{t('专属基础设施')}</li>
                  <li>{t('定制集成')}</li>
                  <li>{t('SLA 保障')}</li>
                  <li>{t('专属客户经理')}</li>
                </ul>
                <Link to='/register' className='lp-btn lp-btn-secondary'>{t('联系销售')}</Link>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className='lp-cta'>
            <div className='lp-cta-box'>
              <h2>{t('准备好开始赚取了吗？')}</h2>
              <p>{t('加入数千名已通过 Teniu Cloud 赚取收益的用户，今天就开始您的旅程！')}</p>
              <Link to='/register' className='lp-btn lp-btn-primary'>
                <span>{t('立即开始')}</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </section>

          {/* Footer */}
          <footer className='lp-footer'>
            <div className='lp-footer-content'>
              <div className='lp-footer-links'>
                <Link to='/about'>{t('关于我们')}</Link>
                {docsLink && <a href={docsLink} target='_blank' rel='noreferrer'>{t('文档')}</a>}
                <Link to='/privacy'>{t('隐私政策')}</Link>
                <Link to='/tos'>{t('服务条款')}</Link>
              </div>
              <p className='lp-footer-copy'>&copy; 2025 Teniu Cloud. All rights reserved.</p>
            </div>
          </footer>
        </div>
      ) : (
        <div className='overflow-x-hidden w-full'>
          {homePageContent.startsWith('https://') ? (
            <iframe
              src={homePageContent}
              className='w-full h-screen border-none'
            />
          ) : (
            <div
              className='mt-[60px]'
              dangerouslySetInnerHTML={{ __html: homePageContent }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
