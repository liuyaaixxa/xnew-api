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

import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { renderQuota } from '../../../helpers/render';
import { getCurrencyConfig } from '../../../helpers/render';
import {
  formatSubscriptionDuration,
  formatSubscriptionResetPeriod,
} from '../../../helpers/subscriptionFormat';

// SubscriptionDetailDrawer — right-slide drawer showing full plan details:
// price summary, included models (auto-resolved from plan.upgrade_group),
// benefit list and a fixed bottom CTA. Anonymous users see "登录后订阅" that
// routes to /login; logged-in users trigger onSubscribe so the parent can open
// the existing SubscriptionPurchaseModal.
const SubscriptionDetailDrawer = ({
  open,
  plan,
  models = [],
  isLoggedIn = false,
  onClose,
  onSubscribe,
  onLoginRedirect,
}) => {
  const { t } = useTranslation();

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on ESC.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const includedModels = useMemo(() => {
    if (!plan?.upgrade_group) return [];
    return (models || []).filter((m) =>
      Array.isArray(m?.enable_groups) && m.enable_groups.includes(plan.upgrade_group),
    );
  }, [models, plan?.upgrade_group]);

  if (!plan) return null;

  const { symbol, rate } = getCurrencyConfig();
  const price = Number(plan.price_amount || 0);
  const displayPrice = (price * rate).toFixed(
    Number.isInteger(price * rate) ? 0 : 2,
  );
  const duration = formatSubscriptionDuration(plan, t);
  const resetPeriod = formatSubscriptionResetPeriod(plan, t);
  const totalAmount = Number(plan.total_amount || 0);
  const totalLabel = totalAmount > 0 ? renderQuota(totalAmount) : t('不限');

  const handleCta = () => {
    if (!isLoggedIn) {
      onLoginRedirect?.();
    } else {
      onSubscribe?.(plan);
    }
  };

  return (
    <>
      <div
        className={`mm-drawer-mask ${open ? 'mm-drawer-mask--open' : ''}`}
        onClick={onClose}
      />
      <div
        className={`mm-drawer ${open ? 'mm-drawer--open' : ''}`}
        role='dialog'
        aria-modal='true'
        aria-labelledby='mm-drawer-title'
      >
        <div className='mm-drawer__header'>
          <div className='mm-drawer__header-text'>
            <h3 id='mm-drawer-title' className='mm-drawer__title'>
              {plan.title || t('订阅套餐')}
            </h3>
            {plan.subtitle && (
              <p className='mm-drawer__desc'>{plan.subtitle}</p>
            )}
          </div>
          <button
            type='button'
            className='mm-drawer__close'
            onClick={onClose}
            aria-label={t('关闭')}
          >
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        </div>

        <div className='mm-drawer__body'>
          <div className='mm-drawer__price-card'>
            <div className='mm-drawer__price-row'>
              <span className='mm-drawer__price-symbol'>{symbol}</span>
              <span className='mm-drawer__price-amount'>{displayPrice}</span>
              <span className='mm-drawer__price-period'>/ {duration}</span>
            </div>
            <div className='mm-drawer__summary'>
              <div className='mm-drawer__summary-row'>
                <div className='mm-drawer__summary-label'>{t('有效期')}</div>
                <div className='mm-drawer__summary-value'>{duration}</div>
              </div>
              <div className='mm-drawer__summary-row'>
                <div className='mm-drawer__summary-label'>{t('总额度')}</div>
                <div className='mm-drawer__summary-value'>{totalLabel}</div>
              </div>
              {plan.upgrade_group && (
                <div className='mm-drawer__summary-row'>
                  <div className='mm-drawer__summary-label'>{t('升级分组')}</div>
                  <div className='mm-drawer__summary-value'>{plan.upgrade_group}</div>
                </div>
              )}
              <div className='mm-drawer__summary-row'>
                <div className='mm-drawer__summary-label'>{t('额度重置')}</div>
                <div className='mm-drawer__summary-value'>{resetPeriod}</div>
              </div>
            </div>
          </div>

          {plan.upgrade_group && (
            <div className='mm-drawer__section'>
              <h4 className='mm-drawer__section-title'>
                {t('包含模型')}{' '}
                <span className='mm-drawer__section-count'>
                  · {includedModels.length} {t('个')}
                </span>
              </h4>
              {includedModels.length > 0 ? (
                <div className='mm-drawer__pills'>
                  {includedModels.map((m) => (
                    <span key={m.model_name} className='mm-drawer__pill'>
                      <span className='mm-drawer__pill-dot' />
                      {m.model_name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className='mm-drawer__empty'>{t('暂无模型信息')}</p>
              )}
            </div>
          )}

          <div className='mm-drawer__section'>
            <h4 className='mm-drawer__section-title'>{t('专属权益')}</h4>
            <ul className='mm-drawer__benefit-list'>
              <li>
                <CheckIcon />
                <span>{t('订阅期内享受指定分组下全部模型权益')}</span>
              </li>
              <li>
                <CheckIcon />
                <span>{t('支持 OpenAI / Claude / Gemini 三种 API 格式')}</span>
              </li>
              <li>
                <CheckIcon />
                <span>{t('可随时在控制台切换订阅或钱包计费')}</span>
              </li>
            </ul>
          </div>

          <div className='mm-drawer__section'>
            <h4 className='mm-drawer__section-title'>{t('计费说明')}</h4>
            <p className='mm-drawer__paragraph'>
              {t('订阅与钱包余额相互独立，可在控制台 → 钱包 设置「优先订阅」/「优先钱包」。订阅到期后自动失效，不会自动续费。')}
            </p>
          </div>
        </div>

        <div className='mm-drawer__footer'>
          {!isLoggedIn && (
            <p className='mm-drawer__login-hint'>{t('登录后可订阅此套餐')}</p>
          )}
          <button
            type='button'
            className='mm-drawer__btn-subscribe'
            onClick={handleCta}
          >
            {isLoggedIn ? t('立即订阅') : t('登录后订阅')}
          </button>
        </div>
      </div>
    </>
  );
};

const CheckIcon = () => (
  <svg
    className='mm-drawer__check'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.5'
  >
    <polyline points='20 6 9 17 4 12' />
  </svg>
);

export default SubscriptionDetailDrawer;
