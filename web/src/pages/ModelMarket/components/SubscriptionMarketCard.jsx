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

import React from 'react';
import { useTranslation } from 'react-i18next';
import { renderQuota } from '../../../helpers/render';
import { getCurrencyConfig } from '../../../helpers/render';
import {
  formatSubscriptionDuration,
} from '../../../helpers/subscriptionFormat';

// SubscriptionMarketCard — single subscription card on the model market floor.
// Style follows the warm-color tokens defined in model-market.css.
const SubscriptionMarketCard = ({ plan, recommended = false, onClick }) => {
  const { t } = useTranslation();
  const { symbol, rate } = getCurrencyConfig();
  const price = Number(plan?.price_amount || 0);
  const convertedPrice = price * rate;
  const displayPrice = convertedPrice.toFixed(
    Number.isInteger(convertedPrice) ? 0 : 2,
  );
  const duration = formatSubscriptionDuration(plan, t);
  const totalAmount = Number(plan?.total_amount || 0);
  const totalLabel =
    totalAmount > 0 ? renderQuota(totalAmount) : t('不限');

  return (
    <div
      className={`mm-sub-card ${recommended ? 'mm-sub-card--recommended' : ''}`}
      onClick={() => onClick?.(plan)}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.(plan);
      }}
    >
      {recommended && (
        <span className='mm-sub-card__tag'>★ {t('推荐')}</span>
      )}
      <div className='mm-sub-card__title'>{plan?.title || t('订阅套餐')}</div>
      {plan?.subtitle && (
        <div className='mm-sub-card__subtitle'>{plan.subtitle}</div>
      )}

      <div className='mm-sub-card__price-row'>
        <span className='mm-sub-card__price-symbol'>{symbol}</span>
        <span className='mm-sub-card__price-amount'>{displayPrice}</span>
        <span className='mm-sub-card__price-period'>/ {duration}</span>
      </div>

      <ul className='mm-sub-card__benefits'>
        <li>
          <span className='mm-sub-card__dot' />
          {t('有效期')}：{duration}
        </li>
        <li>
          <span className='mm-sub-card__dot' />
          {t('总额度')}：{totalLabel}
        </li>
        {plan?.upgrade_group && (
          <li>
            <span className='mm-sub-card__dot' />
            {t('升级分组')}：{plan.upgrade_group}
          </li>
        )}
      </ul>

      <button type='button' className='mm-sub-card__cta'>
        {t('查看详情')}
      </button>
    </div>
  );
};

export default SubscriptionMarketCard;
