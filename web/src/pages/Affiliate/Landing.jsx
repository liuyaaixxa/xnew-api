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

import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Landing.css';

const TIERS = [
  { name: '铜牌', icon: '🥉', rate: '10%', referrals: '1 – 50 人', withdraw: '标准提现 (1-3工作日)', perks: '实时数据面板', cls: 'bronze' },
  { name: '银牌', icon: '🥈', rate: '15%', referrals: '51 – 150 人', withdraw: '快速提现 (24小时内)', perks: '优先客服 · 推广素材包', cls: 'silver' },
  { name: '金牌', icon: '🥇', rate: '20%', referrals: '151 – 200 人', withdraw: '即时提现', perks: 'VIP客服 · 联合品牌 · 季度奖励', cls: 'gold' },
  { name: '钻石合伙人', icon: '💎', rate: '30%', referrals: '200+ 人', withdraw: '即时提现', perks: '专属客户经理 · 年度分红 · 二级推广权', cls: 'diamond' },
];

const TESTIMONIALS = [
  {
    stars: '★★★★★',
    text: '在技术群里分享了邀请链接，没想到效果这么好。一个月邀请了30多个开发者，现在每月被动收入三千多。关键是这些用户一直在用，我的收入也跟着涨。',
    initial: '张',
    name: '张磊',
    role: '独立开发者 · 铜牌→银牌',
  },
  {
    stars: '★★★★★',
    text: '录了一期AI工具测评视频，挂上了推广链接。视频火了之后转化了200多用户。现在每个月五位数收入，终身30%佣金真的太香了，比我做广告收入还高。',
    initial: '李',
    name: '李敏华',
    role: '科技UP主 · 金牌推广者',
  },
  {
    stars: '★★★★★',
    text: '推荐给3个合作公司后，他们团队都在用Teniu.AI。佣金直接覆盖了我们自己团队的API成本，等于免费使用。这模式对企业用户太友好了。',
    initial: '王',
    name: '王建国',
    role: '创业公司CTO',
  },
];

export default function AffiliateLanding() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleJoinClick = useCallback(
    (e) => {
      e.preventDefault();
      const isLoggedIn = !!localStorage.getItem('user');
      if (isLoggedIn) {
        navigate('/console/affiliate');
      } else {
        navigate('/login?next=' + encodeURIComponent('/console/affiliate'));
      }
    },
    [navigate],
  );

  useEffect(() => {
    const elements = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [t]);

  return (
    <div className="aff-landing-page">
      {/* ═══ HERO ═══ */}
      <section className="aff-landing-hero">
        <div className="container">
          <div className="hero-grid">
            <div className="fade-in">
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                {t('推广联盟计划 · 终身佣金')}
              </div>
              <h1 className="hero-title">
                {t('分享AI算力')}<br />
                <em>{t('赚取')}</em><span className="gold">{t('最高终身30%')}</span><em>{t('收益')}</em>
              </h1>
              <p className="hero-sub">
                {t('邀请一位好友使用Teniu.AI，好友每次购买Token你都能获得佣金回报。建圈子，管收益，轻松拥有被动收入。')}
              </p>
              <div className="hero-stats-row">
                <div className="hero-stat-item">
                  <span className="hero-stat-icon">👥</span>
                  <div>
                    <div className="hero-stat-val">3,200+</div>
                    <div className="hero-stat-lbl">{t('活跃推广者')}</div>
                  </div>
                </div>
                <div className="hero-stat-item">
                  <span className="hero-stat-icon">💰</span>
                  <div>
                    <div className="hero-stat-val">$2.4M+</div>
                    <div className="hero-stat-lbl">{t('累计分佣')}</div>
                  </div>
                </div>
              </div>
              <div className="btn-group">
                <a href="/console/affiliate" className="btn-primary" onClick={handleJoinClick}>{t('立即加入推广联盟')} →</a>
                <a href="#flow" className="btn-outline">{t('了解运作方式')}</a>
              </div>
            </div>

            {/* Tree Visualization */}
            <div className="tree-viz fade-in">
              <div className="tv-level-lbl">👤 {t('你 (推广者 A)')}</div>
              <div className="tv-level">
                <div className="tv-node root">A</div>
              </div>
              <div className="tv-level-lbl" style={{ marginTop: 16 }}>⬇ {t('直接邀请的用户')}</div>
              <div className="tv-level">
                <div className="tv-node user">B1</div>
                <div className="tv-node user">B2</div>
                <div className="tv-node user">B3</div>
              </div>
              <div className="tv-level-lbl" style={{ marginTop: 16 }}>📊 {t('收益汇总')}</div>
              <div className="tv-earn-grid">
                <div className="tv-earn-cell">
                  <div className="tv-earn-val">$450</div>
                  <div className="tv-earn-lbl">B1 {t('消费')}$1,500</div>
                </div>
                <div className="tv-earn-cell">
                  <div className="tv-earn-val">$180</div>
                  <div className="tv-earn-lbl">B2 {t('消费')}$600</div>
                </div>
                <div className="tv-earn-cell">
                  <div className="tv-earn-val">$90</div>
                  <div className="tv-earn-lbl">B3 {t('消费')}$300</div>
                </div>
              </div>
              <div className="tv-total">{t('本月总收益')}: $720</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="aff-landing-section" id="flow">
        <div className="container">
          <div className="section-label fade-in">{t('推广流程')}</div>
          <h2 className="section-title fade-in">{t('三分钟建立你的收益管道')}</h2>
          <p className="section-sub fade-in">{t('只需三步，开启终身被动收入。')}</p>
          <div className="steps-row fade-in">
            <div className="step-block">
              <div className="step-icon si1">🔗</div>
              <h3 className="step-title">{t('获取专属链接')}</h3>
              <p className="step-desc">{t('注册后在推广中心生成你的专属邀请链接和二维码海报，分享到微信、微博、知乎、GitHub等任何平台。')}</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-block">
              <div className="step-icon si2">👥</div>
              <h3 className="step-title">{t('好友注册消费')}</h3>
              <p className="step-desc">{t('好友通过你的链接注册Teniu.AI，开始使用AI模型。我们提供OpenAI、Claude等40+顶级模型服务。')}</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-block">
              <div className="step-icon si3">💎</div>
              <h3 className="step-title">{t('坐享持续收益')}</h3>
              <p className="step-desc">{t('好友每次充值购买Token，你自动获得30%佣金。实时到账，随时提现。只要好友持续使用，你就持续赚钱。')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMMISSION FLOW ═══ */}
      <section className="aff-landing-section section-warm">
        <div className="container">
          <div className="section-label fade-in">{t('佣金演示')}</div>
          <h2 className="section-title fade-in">{t('你的佣金比例，越推越高')}</h2>
          <p className="section-sub fade-in">{t('从10%起步，根据邀请人数逐步升级。')}</p>
          <div className="commission-flow fade-in">
            <div className="cf-rate-scale">
              {[
                { rate: '10%', referrals: t('1-50人'), cls: 'bronze', icon: '🥉' },
                { rate: '15%', referrals: t('51-150人'), cls: 'silver', icon: '🥈' },
                { rate: '20%', referrals: t('151-200人'), cls: 'gold', icon: '🥇' },
                { rate: '30%', referrals: t('200+人'), cls: 'diamond', icon: '💎' },
              ].map((item, i) => (
                <React.Fragment key={item.cls}>
                  {i > 0 && <div className="cf-rate-arrow">→</div>}
                  <div className={`cf-rate-block ${item.cls}`}>
                    <div className="cf-rate-icon">{item.icon}</div>
                    <div className="cf-rate-val">{item.rate}</div>
                    <div className="cf-rate-lbl">{item.referrals}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div className="cf-row">
              <div className="cf-user a">👤 {t('用户A (推广者)')}</div>
              <div className="cf-arrow-wrap">
                <div className="cf-arrow">{t('邀请')}</div>
                <div className="cf-arrow-label">{t('分享专属链接')}</div>
              </div>
              <div className="cf-user b">👤 {t('用户B (被邀请者)')}</div>
            </div>
            <div className="cf-middle">
              <div>{t('用户B 购买了')} <strong>$1,000</strong> {t('的AI Token')}</div>
              <div className="cf-middle-sub">{t('根据当前等级比例自动计算佣金')}</div>
            </div>
            <div className="cf-result-grid">
              <div className="cf-result-item">
                <div className="cf-result-tier">🥉 {t('铜牌')}</div>
                <div className="cf-result-val">$100</div>
                <div className="cf-result-pct">10%</div>
              </div>
              <div className="cf-result-item">
                <div className="cf-result-tier">🥈 {t('银牌')}</div>
                <div className="cf-result-val">$150</div>
                <div className="cf-result-pct">15%</div>
              </div>
              <div className="cf-result-item">
                <div className="cf-result-tier">🥇 {t('金牌')}</div>
                <div className="cf-result-val">$200</div>
                <div className="cf-result-pct">20%</div>
              </div>
              <div className="cf-result-item highlight">
                <div className="cf-result-tier">💎 {t('钻石')}</div>
                <div className="cf-result-val">$300</div>
                <div className="cf-result-pct">30%</div>
              </div>
            </div>
            <div className="cf-footnote">
              💡 {t('用户B下个月再消费$1,000 → 用户A 再获得对应佣金 → 终身循环')}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BENEFITS ═══ */}
      <section className="aff-landing-section">
        <div className="container">
          <div className="section-label fade-in">{t('为什么选择我们')}</div>
          <h2 className="section-title fade-in">{t('推广联盟的独特优势')}</h2>
          <p className="section-sub fade-in">{t('不仅佣金高，我们更关注推广者的长期收益和体验。')}</p>
          <div className="benefit-grid fade-in">
            <div className="benefit-card">
              <div className="benefit-icon">🔁</div>
              <h3 className="benefit-title">{t('终身绑定 · 永久收益')}</h3>
              <p className="benefit-desc">{t('邀请关系一旦建立，永久有效。只要被邀请用户持续使用服务，你就持续获得佣金。没有时间限制，真正的"睡后收入"。')}</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">📈</div>
              <h3 className="benefit-title">{t('实时数据 · 透明分账')}</h3>
              <p className="benefit-desc">{t('推广中心实时展示每位被邀请用户的消费明细和佣金收入。每一笔佣金都可追溯，公开透明，绝不克扣。')}</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🎯</div>
              <h3 className="benefit-title">{t('精准追踪 · 30天归因')}</h3>
              <p className="benefit-desc">{t('用户点击推广链接后，30天内注册都算你的邀请。强大的归因系统确保你不会错过任何一次转化。')}</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">💳</div>
              <h3 className="benefit-title">{t('灵活提现 · 低门槛')}</h3>
              <p className="benefit-desc">{t('收益满$100即可提现，支持支付宝、微信、银行卡和USDT。资金安全有保障，到账快。')}</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🎨</div>
              <h3 className="benefit-title">{t('推广素材 · 我们提供')}</h3>
              <p className="benefit-desc">{t('免费提供海报模板、宣传文案、产品截图、视频素材等全套推广物料。你只需专注推广，其他交给我们。')}</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🏆</div>
              <h3 className="benefit-title">{t('阶梯奖励 · 越推越赚')}</h3>
              <p className="benefit-desc">{t('邀请越多活跃用户，佣金比例越高。从10%起步，最高可达30%。还有季度奖励、年度分红等你来拿。')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TIER TABLE ═══ */}
      <section className="aff-landing-section section-warm">
        <div className="container">
          <div className="section-label fade-in">{t('等级体系')}</div>
          <h2 className="section-title fade-in">{t('越推广，越赚钱')}</h2>
          <p className="section-sub fade-in">{t('随着你邀请的活跃用户增长，佣金比例和权益同步升级。')}</p>
          <div className="tier-table fade-in">
            <table>
              <thead>
                <tr>
                  <th>{t('等级')}</th>
                  <th>{t('活跃邀请数')}</th>
                  <th>{t('佣金比例')}</th>
                  <th>{t('提现方式')}</th>
                  <th>{t('额外权益')}</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((tier) => (
                  <tr key={tier.cls}>
                    <td><span className={`tier-badge ${tier.cls}`}>{tier.icon} {t(tier.name)}</span></td>
                    <td>{t(tier.referrals)}</td>
                    <td><strong>{t(tier.rate)}</strong></td>
                    <td>{t(tier.withdraw)}</td>
                    <td>{t(tier.perks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="aff-landing-section">
        <div className="container">
          <div className="section-label fade-in">{t('真实案例')}</div>
          <h2 className="section-title fade-in">{t('听听推广者怎么说')}</h2>
          <p className="section-sub fade-in" />
          <div className="testimonial-grid fade-in">
            {TESTIMONIALS.map((tm, i) => (
              <div className="testimonial-card" key={i}>
                <div className="testimonial-stars">{tm.stars}</div>
                <p className="testimonial-text">{t(tm.text)}</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{tm.initial}</div>
                  <div>
                    <div className="testimonial-name">{t(tm.name)}</div>
                    <div className="testimonial-role">{t(tm.role)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="aff-landing-cta-section">
        <div className="container">
          <div className="cta-bottom fade-in">
            <div className="section-label cta-label">{t('免费加入')}</div>
            <h2 className="section-title cta-title">{t('开始建立你的AI收益管道')}</h2>
            <p className="section-sub cta-sub">{t('已有 3,200+ 推广者通过 Teniu.AI 获得被动收入。零成本加入，最高终身30%佣金。')}</p>
            <div className="btn-group" style={{ justifyContent: 'center', marginTop: 36 }}>
              <a href="/console/affiliate" className="btn-primary btn-cta" onClick={handleJoinClick}>🚀 {t('免费加入推广联盟')}</a>
            </div>
            <p className="cta-footnote">{t('无需任何费用 · 3分钟完成设置 · 最高终身30%佣金')}</p>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="footer-bar">
        &copy; 2026 Teniu.AI · {t('推广联盟计划')} · {t('诚信推广，共建生态')}
      </footer>
    </div>
  );
}
