import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSystemName } from '../../helpers';
import './store.css';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function Store() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const systemName = getSystemName() || 'Teniu.AI';
  const observerRef = useRef(null);

  const trustStats = [
    { value: '40+', label: t('AI模型') },
    { value: '99.9%', label: t('运行SLA') },
    { value: '2K+', label: t('开发者') },
    { value: '50M+', label: t('日请求量') },
  ];

  const plans = [
    {
      name: t('入门版'), desc: t('适合原型开发和小型项目'),
      price: t('免费'), unit: t('/月'),
      features: [t('1万Tokens/月'), t('5个模型'), t('社区支持')],
      icon: '⚡', featured: false, cta: t('立即开始'), to: '/register',
    },
    {
      name: t('专业版'), desc: t('适合成长型团队和生产应用'),
      price: '$19', unit: t('/月'),
      features: [t('500万Tokens/月'), t('全部40+模型'), t('优先支持'), t('API密钥管理')],
      icon: '📦', featured: true, cta: t('免费试用'), to: '/register',
    },
    {
      name: t('团队版'), desc: t('与整个团队协作'),
      price: '$99', unit: t('/月'),
      features: [t('5000万Tokens/月'), t('10个团队席位'), t('用量分析'), t('SSO & RBAC')],
      icon: '👥', featured: false, cta: t('立即开始'), to: '/register',
    },
    {
      name: t('企业版'), desc: t('大规模定制解决方案'),
      price: t('定制'), unit: t('定价'),
      features: [t('无限Tokens'), t('专属支持'), t('SLA保障'), t('本地部署')],
      icon: '🏢', featured: false, cta: t('联系销售'), to: '/register',
    },
  ];

  const features = [
    { icon: '🖥', name: t('统一API格式'), desc: t('一个兼容OpenAI的API接入40+模型，无需修改代码即可切换供应商。') },
    { icon: '🔒', name: t('企业级安全'), desc: t('SOC 2合规，静态和传输加密，细粒度API密钥权限管理。') },
    { icon: '📡', name: t('自动故障转移'), desc: t('智能路由，跨供应商自动重试。零停机，始终可用。') },
    { icon: '💰', name: t('按量付费'), desc: t('仅为实际Token用量付费。无月度承诺，无隐藏费用，透明计费。') },
    { icon: '📊', name: t('实时监控'), desc: t('实时用量仪表盘，成本追踪，速率限制和异常告警。') },
    { icon: '🔧', name: t('自定义模型配置'), desc: t('精细调整模型参数，设置自定义速率限制，配置按模型定价规则。') },
  ];

  const testimonials = [
    { quote: t('"切换到Tenu.AI将我们的AI成本降低了60%。统一API意味着我们不再需要为每个模型供应商单独集成。"'), name: 'Marcus Chen', role: t('CTO, TechVentures'), avatar: 'M' },
    { quote: t('"自动故障转移功能在OpenAI宕机时拯救了我们。我们的用户甚至没有察觉。监控面板正是我们需要的。"'), name: 'Sarah Nakamura', role: t('首席工程师, DataFlow Inc'), avatar: 'S' },
    { quote: t('"我们评估了所有API网关。Tenu.AI的价格透明度和模型覆盖无与伦比。企业支持一流。"'), name: 'Alex Petrov', role: t('工程VP, ScaleAI'), avatar: 'A' },
  ];

  const footerCols = [
    { title: t('产品'), links: [t('模型'), t('定价'), t('文档'), t('更新日志')] },
    { title: t('公司'), links: [t('关于'), t('博客'), t('招聘'), t('联系我们')] },
    { title: t('资源'), links: [t('API参考'), t('SDK与工具'), t('服务状态'), t('社区')] },
    { title: t('法律'), links: [t('隐私'), t('条款'), t('GDPR'), t('安全')] },
  ];

  useEffect(() => {
    document.title = systemName + ' — ' + t('企业级AI API网关');
  }, [systemName, t]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 80);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.store-fade-in').forEach((el) => {
      observerRef.current.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [t]);

  return (
    <div className="store-page">
      {/* Hero */}
      <section className="store-hero">
        <div className="store-hero-content">
          <div className="store-badge">
            <span className="store-badge-dot" />
            {t('限时优惠 — 年度计划8折')}
          </div>
          <h1 className="store-hero-headline">
            {t('企业级AI API')}<br />{t('像你最爱的SaaS')}<br /><em>{t('一样定价')}</em>
          </h1>
          <p className="store-hero-sub">
            {t('通过一个统一API接入40+AI模型。按量付费，无限扩展，只为实际用量买单。')}
          </p>
          <div className="store-price-group">
            <span className="store-price-amount">$0.001</span>
            <span className="store-price-unit">/ 1K tokens</span>
          </div>
          <div className="store-stars">
            <span className="store-star">★</span><span className="store-star">★</span><span className="store-star">★</span><span className="store-star">★</span><span className="store-star-dim">★</span>
            <span className="store-rating-text">4.8 · 2,000+ {t('开发者')}</span>
          </div>
          <div className="store-cta-group">
            <button className="store-btn-primary-lg" onClick={() => navigate('/register')}>{t('免费试用')}</button>
            <button className="store-btn-outline-lg" onClick={() => navigate('/model-market')}>{t('查看定价')}</button>
          </div>
        </div>
        <div className="store-hero-visual">
          <div className="store-hero-visual-illustration">
            <div className="store-illust-circle c1" />
            <div className="store-illust-circle c2" />
            <div className="store-illust-circle c3" />
            <div className="store-illust-diamond" />
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <div className="store-trust-bar">
        {trustStats.map((s) => (
          <div className="store-trust-stat" key={s.label}>
            <span className="store-trust-value">{s.value}</span>
            <span className="store-trust-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Plans & Pricing */}
      <section className="store-section store-section-light">
        <div className="store-section-header">
          <div className="store-section-label">{t('方案与定价')}</div>
          <h2 className="store-section-title">{t('选择你的AI算力方案')}</h2>
          <p className="store-section-sub">{t('从初创到企业 — 用透明、按量付费的定价扩展你的AI能力。')}</p>
        </div>
        <div className="store-product-grid">
          {plans.map((plan) => (
            <div className={`store-product-card store-fade-in${plan.featured ? ' featured' : ''}`} key={plan.name}>
              <div className="store-card-image">
                <span className="store-card-image-icon">{plan.icon}</span>
              </div>
              <div className="store-card-body">
                <h3 className="store-card-name">{plan.name}</h3>
                <p className="store-card-desc">{plan.desc}</p>
                <div className="store-card-price">
                  <span className="store-card-price-amount">{plan.price}</span>
                  <span className="store-card-price-unit">{plan.unit}</span>
                </div>
                <div className="store-card-features">
                  {plan.features.map((f) => (
                    <div className="store-card-feat" key={f}><CheckIcon /> {f}</div>
                  ))}
                </div>
                <button
                  className={`store-card-cta${plan.featured ? ' primary' : ''}`}
                  onClick={() => navigate(plan.to)}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="store-section store-section-warm">
        <div className="store-section-header">
          <div className="store-section-label">{t('为什么选择Tenu.AI')}</div>
          <h2 className="store-section-title">{t('快速交付AI应用所需的一切')}</h2>
          <p className="store-section-sub">{t('一次集成，无限可能。专注构建 — 我们处理其余。')}</p>
        </div>
        <div className="store-features-grid">
          {features.map((f) => (
            <div className="store-feature-card store-fade-in" key={f.name}>
              <div className="store-feature-icon"><span style={{ fontSize: 22 }}>{f.icon}</span></div>
              <h4 className="store-feature-name">{f.name}</h4>
              <p className="store-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="store-section store-section-light">
        <div className="store-section-header">
          <div className="store-section-label">{t('用户评价')}</div>
          <h2 className="store-section-title">{t('深受全球开发者信赖')}</h2>
        </div>
        <div className="store-testimonials-grid">
          {testimonials.map((tItem) => (
            <div className="store-testimonial-card store-fade-in" key={tItem.name}>
              <div className="store-stars">
                <span className="store-star">★</span><span className="store-star">★</span><span className="store-star">★</span><span className="store-star">★</span><span className="store-star">★</span>
              </div>
              <p className="store-testimonial-quote">{tItem.quote}</p>
              <div className="store-testimonial-author">
                <div className="store-testimonial-avatar">{tItem.avatar}</div>
                <div>
                  <div className="store-testimonial-name">{tItem.name}</div>
                  <div className="store-testimonial-role">{tItem.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="store-cta-section">
        <div className="store-section-label">{t('立即开始')}</div>
        <h2 className="store-section-title">{t('准备好加速你的AI了吗？')}</h2>
        <p className="store-section-sub">{t('已有2,000+开发者在Tenu.AI上构建。免费起步，随时扩展。')}</p>
        <div className="store-cta-group">
          <button className="store-btn-primary-lg" onClick={() => navigate('/register')}>{t('免费开始 — 无需信用卡')}</button>
          <button className="store-btn-outline-lg" style={{ borderColor: 'var(--store-border-light)', color: 'var(--store-text-muted)' }}>{t('联系销售')}</button>
        </div>
        <div className="store-guarantee">
          <ShieldIcon />
          {t('30天退款保证 · 无锁定 · 随时取消')}
        </div>
      </section>

      {/* Footer */}
      <footer className="store-footer">
        <div className="store-footer-grid">
          <div className="store-footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>⚡</span>
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.5px', color: 'var(--store-text)' }}>Tenu.AI</span>
            </div>
            <p className="store-footer-tagline">{t('企业级AI API网关 — 一次集成，无限AI可能。')}</p>
          </div>
          {footerCols.map((col) => (
            <div key={col.title}>
              <div className="store-footer-col-title">{col.title}</div>
              <div className="store-footer-col">
                {col.links.map((link) => <a href="#" key={link} onClick={(e) => e.preventDefault()}>{link}</a>)}
              </div>
            </div>
          ))}
        </div>
        <div className="store-footer-bottom">
          <span className="store-footer-copy">&copy; 2026 Teniu.AI. {t('版权所有')}</span>
          <div className="store-payment-badges">
            <span>VISA</span><span>MASTERCARD</span><span>USDT</span><span>ALIPAY</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
