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

import React, { useEffect, useState } from 'react';
import { API, showError } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';
import NeuralBg from './NeuralBg';
import './home-v2.css';

const HomeV2 = () => {
  const { t, i18n } = useTranslation();
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

  // Scroll-reveal: observe .hv2-reveal elements
  useEffect(() => {
    // Small delay to ensure DOM is fully painted after React render
    const timer = setTimeout(() => {
      const els = document.querySelectorAll('.hv2-reveal, .hv2-reveal-stagger');
      if (!els.length) return;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('hv2-visible');
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0, rootMargin: '0px 0px -20px 0px' }
      );
      els.forEach((el) => io.observe(el));
      return () => io.disconnect();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // NOTE: dangerouslySetInnerHTML below is used for admin-configured homepage
  // content from the backend API — same pattern as the original index.jsx.

  return (
    <div className='w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <div className='hv2'>
          {/* ── Header ── */}
          <header className='hv2-header'>
            <div className='hv2-header-inner'>
              <span className='hv2-logo'>Teniu Cloud</span>
              <nav className='hv2-nav'>
                <a href='#features' className='hv2-nav-link'>{t('功能特性')}</a>
                <a href='#how-it-works' className='hv2-nav-link'>{t('使用流程')}</a>
                <a href='#download' className='hv2-nav-link'>{t('下载客户端')}</a>
                <a href='#pricing' className='hv2-nav-link'>{t('价格方案')}</a>
                <Link to='/login' className='hv2-nav-signin'>{t('登录')}</Link>
                <Link to='/register' className='hv2-nav-cta'>{t('开始使用')}</Link>
              </nav>
            </div>
          </header>

          {/* ── Hero ── */}
          <section className='hv2-hero'>
            <NeuralBg nodeCount={isMobile ? 30 : 60} />
            {/* GPU image — bottom-left corner, 1/3 visible */}
            <div className='hv2-gpu-corner'>
              <img src='/fQNA8cT7s.jpeg' alt='' />
            </div>
            <div className='hv2-hero-content hv2-reveal'>
              <h1>
                {t('将闲置 LLM Token / GPU')}
                <br />
                <span className='hv2-hl'>{t('转化为')}</span>{t('稳定收益')}
              </h1>
              <p className='hv2-hero-desc'>
                {t('Teniu Cloud 是一个去中心化 GPU 共享网络，让您将闲置算力变现。支持 Ollama 本地模型和 LLM Token 共享。')}
              </p>
              <div className='hv2-hero-btns'>
                <Link to='/register' className='hv2-btn hv2-btn-dark'>
                  <span>{t('立即共享赚钱')}</span>
                  <span>&rarr;</span>
                </Link>
                <Link to='/pricing' className='hv2-btn hv2-btn-outline'>
                  {t('使用便宜Token')}
                </Link>
              </div>
              <div className='hv2-stats'>
                <div>
                  <div className='hv2-stat-val'>10K+</div>
                  <div className='hv2-stat-lbl'>{t('活跃节点')}</div>
                </div>
                <div>
                  <div className='hv2-stat-val'>$2.5M+</div>
                  <div className='hv2-stat-lbl'>{t('已分发奖励')}</div>
                </div>
                <div>
                  <div className='hv2-stat-val'>99.9%</div>
                  <div className='hv2-stat-lbl'>{t('在线率')}</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Features ── */}
          <section className='hv2-section hv2-section--subtle' id='features'>
            <div className='hv2-section-inner'>
              <div className='hv2-section-head hv2-reveal'>
                <div className='hv2-section-tag'>Features</div>
                <h2 className='hv2-section-title'>{t('为什么选择 Teniu Cloud？')}</h2>
                <p className='hv2-section-desc'>{t('最强大的去中心化 GPU 共享平台，帮助您轻松将闲置资源变现。')}</p>
              </div>
              <div className='hv2-features-grid hv2-reveal-stagger'>
                <div className='hv2-feature'>
                  <div className='hv2-feature-icon'>&#9889;</div>
                  <h3>{t('一键部署')}</h3>
                  <p>{t('仅需 5 分钟即可安装配置，自动检测环境并优化设置，获得最佳性能。')}</p>
                </div>
                <div className='hv2-feature'>
                  <div className='hv2-feature-icon'>&#128274;</div>
                  <h3>{t('安全可靠')}</h3>
                  <p>{t('企业级安全架构，加密传输与隔离保护，确保数据安全。')}</p>
                </div>
                <div className='hv2-feature'>
                  <div className='hv2-feature-icon'>&#128176;</div>
                  <h3>{t('实时结算')}</h3>
                  <p>{t('智能合约自动结算，实时查看收益，支持多种提现方式。')}</p>
                </div>
                <div className='hv2-feature'>
                  <div className='hv2-feature-icon'>&#127760;</div>
                  <h3>{t('全球网络')}</h3>
                  <p>{t('节点遍布全球，确保低延迟和高可用性，提供最佳用户体验。')}</p>
                </div>
                <div className='hv2-feature'>
                  <div className='hv2-feature-icon'>&#129302;</div>
                  <h3>{t('Ollama 支持')}</h3>
                  <p>{t('原生支持 Ollama 本地模型，轻松共享您的 AI 模型并赚取额外收益。')}</p>
                </div>
                <div className='hv2-feature'>
                  <div className='hv2-feature-icon'>&#128202;</div>
                  <h3>{t('智能调度')}</h3>
                  <p>{t('智能任务调度系统，自动匹配最优节点，最大化效率和收益。')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── How to Use LLM Token ── */}
          <section className='hv2-section hv2-section--white' id='use-token'>
            <div className='hv2-section-inner'>
              <div className='hv2-section-head hv2-reveal'>
                <div className='hv2-section-tag'>LLM Token</div>
                <h2 className='hv2-section-title'>{t('如何使用大模型 Token')}</h2>
                <p className='hv2-section-desc'>{t('通过 Teniu Cloud 以极低成本使用主流大模型 API，兼容 OpenAI 格式，即开即用。')}</p>
              </div>
              <div className='hv2-steps hv2-reveal-stagger'>
                <div className='hv2-step'>
                  <div className='hv2-step-num'>01</div>
                  <h3>{t('注册并获取 API Key')}</h3>
                  <p>{t('创建账户后，在控制台一键生成 API Key，支持多种鉴权方式。')}</p>
                </div>
                <div className='hv2-step'>
                  <div className='hv2-step-num'>02</div>
                  <h3>{t('选择模型与充值')}</h3>
                  <p>{t('浏览模型广场，选择 GPT-4o、Claude、Gemini 等主流模型，按需充值额度。')}</p>
                </div>
                <div className='hv2-step'>
                  <div className='hv2-step-num'>03</div>
                  <h3>{t('替换 API 地址调用')}</h3>
                  <p>{t('将 API Base URL 替换为 Teniu Cloud 地址，无需修改代码即可无缝切换，享受低价 Token。')}</p>
                </div>
              </div>
              <div className='hv2-token-cta hv2-reveal'>
                <Link to='/pricing' className='hv2-btn hv2-btn-dark'>
                  <span>{t('查看模型价格')}</span>
                  <span>&rarr;</span>
                </Link>
                <Link to='/docs' className='hv2-btn hv2-btn-outline'>
                  {t('接入文档')}
                </Link>
              </div>
            </div>
          </section>

          {/* ── How It Works ── */}
          <section className='hv2-section hv2-section--white' id='how-it-works'>
            <div className='hv2-section-inner'>
              <div className='hv2-section-head hv2-reveal'>
                <div className='hv2-section-tag'>How It Works</div>
                <h2 className='hv2-section-title'>{t('简单 3 步，开始赚取')}</h2>
                <p className='hv2-section-desc'>{t('流程简单，即刻开始赚取收益。')}</p>
              </div>
              <div className='hv2-steps hv2-reveal-stagger'>
                <div className='hv2-step'>
                  <div className='hv2-step-num'>01</div>
                  <h3>{t('注册账户')}</h3>
                  <p>{t('创建您的 Teniu Cloud 账户并完成身份验证，开启您的赚取之旅。')}</p>
                </div>
                <div className='hv2-step'>
                  <div className='hv2-step-num'>02</div>
                  <h3>{t('连接设备')}</h3>
                  <p>{t('下载安装我们的轻量级客户端，自动检测您的 GPU 配置并优化设置。')}</p>
                </div>
                <div className='hv2-step'>
                  <div className='hv2-step-num'>03</div>
                  <h3>{t('开始赚取')}</h3>
                  <p>{t('您的设备将自动接收计算任务，实时监控收益，随时提现。')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Download ── */}
          <section className='hv2-section hv2-section--subtle' id='download'>
            <div className='hv2-section-inner'>
              <div className='hv2-section-head hv2-reveal'>
                <div className='hv2-section-tag'>Download</div>
                <h2 className='hv2-section-title'>{t('下载 Teniu Link 节点客户端')}</h2>
                <p className='hv2-section-desc'>{t('选择您的操作系统，一键安装即可加入 Teniu Cloud 网络。')}</p>
              </div>
              <div className='hv2-dl-grid hv2-reveal-stagger'>
                <div className='hv2-dl-card'>
                  <div className='hv2-dl-icon'>
                    <svg viewBox='0 0 24 24' fill='currentColor' width='28' height='28'>
                      <path d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z' />
                    </svg>
                  </div>
                  <h3>macOS</h3>
                  <p>{t('适用于 macOS 10.15+')}</p>
                  <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-arm64.dmg' target='_blank' rel='noreferrer' className='hv2-dl-main-btn'>DMG · ARM64</a>
                  <div className='hv2-dl-links'>
                    <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-x64.dmg' target='_blank' rel='noreferrer' className='hv2-dl-link'>DMG · x64</a>
                    <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-arm64.AppImage' target='_blank' rel='noreferrer' className='hv2-dl-link'>AppImage · ARM64</a>
                    <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-x86_64.AppImage' target='_blank' rel='noreferrer' className='hv2-dl-link'>AppImage · x64</a>
                  </div>
                </div>
                <div className='hv2-dl-card'>
                  <div className='hv2-dl-icon'>
                    <svg viewBox='0 0 24 24' fill='currentColor' width='28' height='28'>
                      <path d='M3 12V6.5l8-1.1V12H3zm0 .5h8v6.6l-8-1.1V12.5zM12 12.5h9V3l-9 1.2v8.3zm0 .5v6.3L21 21v-8H12z' />
                    </svg>
                  </div>
                  <h3>Windows</h3>
                  <p>{t('适用于 Windows 10+')}</p>
                  <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-x64-setup.exe' target='_blank' rel='noreferrer' className='hv2-dl-main-btn'>Setup · x64</a>
                  <div className='hv2-dl-links'>
                    <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-x64-portable.exe' target='_blank' rel='noreferrer' className='hv2-dl-link'>Portable · x64</a>
                    <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-arm64-setup.exe' target='_blank' rel='noreferrer' className='hv2-dl-link'>Setup · ARM64</a>
                    <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-arm64-portable.exe' target='_blank' rel='noreferrer' className='hv2-dl-link'>Portable · ARM64</a>
                  </div>
                </div>
                <div className='hv2-dl-card'>
                  <div className='hv2-dl-icon'>
                    <svg viewBox='0 0 24 24' fill='currentColor' width='28' height='28'>
                      <path d='M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 0 0-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.368 1.884 1.43.868.134 1.703-.272 2.191-.574.3-.18.599-.382.8-.6.404-.433.6-.985.71-1.388.037-.134.064-.198.084-.328.104.003.2 0 .295-.023a4.002 4.002 0 0 0 1.37-.726c.226-.186.39-.396.525-.55.202-.229.347-.466.462-.633.222-.32.395-.642.504-.857.058-.122.086-.198.116-.268a1.63 1.63 0 0 0-.12-.122l-.04-.036c-.168-.158-.375-.322-.57-.505-.088-.083-.163-.168-.276-.31-.095-.134-.222-.289-.36-.489-.135-.2-.29-.43-.398-.53-.072-.076-.206-.131-.368-.195-.162-.064-.37-.135-.573-.246-.202-.11-.412-.24-.586-.406-.37-.336-.585-.72-.8-1.123-.072-.138-.16-.273-.193-.398-.033-.126-.07-.253-.057-.38.07-.535.085-1.065-.136-1.535-.165-.36-.47-.563-.79-.845-.063-.058-.14-.126-.11-.2.06-.177.039-.388-.003-.6-.049-.256-.113-.383-.163-.622-.042-.174-.075-.374-.048-.546.032-.246.1-.408.158-.484l.008-.01c.054-.033.108-.073.165-.12a.674.674 0 0 0 .145-.135 1.127 1.127 0 0 0 .21-.468c.056-.301.023-.634-.07-.933-.117-.38-.32-.676-.48-.93-.076-.134-.143-.247-.197-.37-.046-.101-.083-.21-.064-.348.036-.296-.068-.588-.21-.776-.137-.188-.303-.298-.426-.382a1.453 1.453 0 0 0-.096-.059c.017-.258-.028-.455-.113-.613-.084-.163-.197-.263-.282-.334-.17-.138-.37-.224-.565-.283a4.356 4.356 0 0 0-.459-.111c-.212-.04-.381-.063-.469-.098-.036-.017-.028-.036-.012-.094.013-.054.04-.126.032-.227-.008-.1-.041-.232-.12-.357a.984.984 0 0 0-.381-.37c-.146-.083-.32-.128-.488-.144a2.558 2.558 0 0 0-.637.025c-.14.023-.27.055-.368.077-.097.024-.155.04-.184.03-.057-.013-.068-.023-.147-.074-.078-.05-.189-.133-.364-.198a1.564 1.564 0 0 0-.505-.1 2.017 2.017 0 0 0-.698.09c-.175.054-.315.127-.395.178-.013.008-.023.013-.035.02-.14-.073-.294-.113-.46-.134z' />
                    </svg>
                  </div>
                  <h3>Linux</h3>
                  <p>{t('支持 Ubuntu、Debian、CentOS 等')}</p>
                  <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-amd64.deb' target='_blank' rel='noreferrer' className='hv2-dl-main-btn'>DEB · amd64</a>
                  <div className='hv2-dl-links'>
                    <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-arm64.deb' target='_blank' rel='noreferrer' className='hv2-dl-link'>DEB · arm64</a>
                    <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-aarch64.deb' target='_blank' rel='noreferrer' className='hv2-dl-link'>DEB · aarch64</a>
                    <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-x86_64.rpm' target='_blank' rel='noreferrer' className='hv2-dl-link'>RPM · x86_64</a>
                  </div>
                </div>
              </div>
              <div className='hv2-dl-universal'>
                <a href='https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0/Teniulink-Node-0.1.0-x64.zip' target='_blank' rel='noreferrer' className='hv2-dl-zip'>
                  {t('通用版本下载')} (ZIP · x64)
                </a>
              </div>
            </div>
          </section>

          {/* ── Pricing (dark section for depth) ── */}
          <section className='hv2-section hv2-section--dark' id='pricing'>
            <div className='hv2-section-inner'>
              <div className='hv2-section-head hv2-reveal'>
                <div className='hv2-section-tag'>Pricing</div>
                <h2 className='hv2-section-title'>{t('共享入驻套餐')}</h2>
                <p className='hv2-section-desc'>{t('选择最适合您的方案，随时升级。')}</p>
              </div>
              <div className='hv2-pricing-grid hv2-reveal-stagger'>
                <div className='hv2-price-card'>
                  <h3>{t('免费套餐')}</h3>
                  <div className='hv2-price-val'><span className='hv2-currency'>$</span>0</div>
                  <div className='hv2-price-period'>{t('永久免费')}</div>
                  <ul className='hv2-price-list'>
                    <li>{t('1 个 GPU 节点')}</li>
                    <li>{t('1 个设备令牌')}</li>
                    <li>{t('社区支持')}</li>
                  </ul>
                  <Link to='/register' className='hv2-btn hv2-btn-outline' style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>{t('开始使用')}</Link>
                </div>
                <div className='hv2-price-card'>
                  <h3>{t('基础套餐版')}</h3>
                  <div className='hv2-price-val'><span className='hv2-currency'>$</span>5</div>
                  <div className='hv2-price-period'>{t('每月')}</div>
                  <ul className='hv2-price-list'>
                    <li>{t('1 个 GPU 节点')}</li>
                    <li>{t('1 个设备令牌')}</li>
                    <li>{t('发布 5 个共享模型')}</li>
                    <li>{t('社区支持')}</li>
                  </ul>
                  <Link to='/register' className='hv2-btn hv2-btn-outline' style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>{t('开始使用')}</Link>
                </div>
                <div className='hv2-price-card hv2-price-card--featured'>
                  <h3>{t('高级套餐版')}</h3>
                  <div className='hv2-price-val'><span className='hv2-currency'>$</span>50</div>
                  <div className='hv2-price-period' style={{ color: 'rgba(255,255,255,0.7)' }}>{t('每月')}</div>
                  <ul className='hv2-price-list'>
                    <li>{t('10 个 GPU 节点')}</li>
                    <li>{t('100 个设备令牌')}</li>
                    <li>{t('不限共享模型')}</li>
                    <li>{t('7×24 优先支持')}</li>
                    <li>{t('高级数据分析')}</li>
                  </ul>
                  <Link to='/register' className='hv2-btn hv2-btn-white' style={{ width: '100%', justifyContent: 'center' }}>{t('选择高级套餐')}</Link>
                </div>
                <div className='hv2-price-card'>
                  <h3>{t('企业版')}</h3>
                  <div className='hv2-price-val'>{t('定制')}</div>
                  <div className='hv2-price-period'>{t('专属方案')}</div>
                  <ul className='hv2-price-list'>
                    <li>{t('专属基础算力中心')}</li>
                    <li>{t('OSS 集成')}</li>
                    <li>{t('SLA 服务保障')}</li>
                    <li>{t('专属客户经理')}</li>
                  </ul>
                  <Link to='/register' className='hv2-btn hv2-btn-outline' style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>{t('联系销售')}</Link>
                </div>
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className='hv2-cta'>
            <div className='hv2-cta-inner hv2-reveal hv2-reveal--scale'>
              <h2>{t('准备好开始赚取了吗？')}</h2>
              <p>{t('加入数千名已通过 Teniu Cloud 赚取收益的用户，今天就开始您的旅程！')}</p>
              <Link to='/register' className='hv2-btn hv2-btn-white'>
                <span>{t('立即开始')}</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </section>

          {/* ── Footer ── */}
          <footer className='hv2-footer hv2-reveal'>
            <div className='hv2-footer-inner'>
              <div className='hv2-footer-links'>
                <Link to='/docs'>{t('文档')}</Link>
                <Link to='/about'>{t('关于我们')}</Link>
                <Link to='/privacy'>{t('隐私政策')}</Link>
                <Link to='/tos'>{t('服务条款')}</Link>
              </div>
              <p className='hv2-footer-copy'>&copy; 2026 Teniu Cloud. All rights reserved.</p>
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

export default HomeV2;
