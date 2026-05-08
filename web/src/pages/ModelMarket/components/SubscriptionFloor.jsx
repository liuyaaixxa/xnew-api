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

import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserContext } from '../../../context/User';
import { usePublicSubscriptionPlans } from '../../../hooks/subscriptions/usePublicSubscriptionPlans';
import SubscriptionMarketCard from './SubscriptionMarketCard';
import SubscriptionDetailDrawer from './SubscriptionDetailDrawer';

// SubscriptionFloor — bottom-of-page section that lists publicly-available
// subscription plans. Receives `models` (already loaded by the parent
// ModelMarket page) so the drawer can resolve "included models" without
// triggering a duplicate /api/pricing fetch.
const SubscriptionFloor = ({ models = [], onSubscribe }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userState] = useContext(UserContext);
  const isLoggedIn = !!userState?.user;

  const { plans, loading } = usePublicSubscriptionPlans();
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hide the entire floor when no enabled plans exist; this keeps the page
  // clean in fresh installs and lets the admin enable plans on their own
  // schedule. Loading state also doesn't render any skeleton — the floor is
  // optional so a brief blank space below the model grid is fine.
  if (loading || plans.length === 0) {
    return null;
  }

  const openPlan = (plan) => {
    setSelected(plan);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const handleSubscribe = (plan) => {
    closeDrawer();
    onSubscribe?.(plan);
  };

  const handleLoginRedirect = () => {
    closeDrawer();
    navigate('/login');
  };

  return (
    <section className='mm-sub-floor'>
      <div className='mm-sub-floor__header'>
        <div>
          <h2 className='mm-sub-floor__title'>
            {t('订阅')}
            <span className='mm-sub-floor__title-accent'>{t('套餐')}</span>
          </h2>
          <p className='mm-sub-floor__subtitle'>
            {t('按月/按日订阅，解锁分组下的全部模型')}
          </p>
        </div>
        <span className='mm-sub-floor__pill'>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
            <path d='M13 2L4.5 14H11L9 22L19.5 10H13L15 2Z' />
          </svg>
          {plans.length} {t('个套餐可选')}
        </span>
      </div>

      <div className='mm-sub-grid'>
        {plans.map((plan, index) => (
          <SubscriptionMarketCard
            key={plan.id}
            plan={plan}
            recommended={index === 0 && plans.length > 1}
            onClick={openPlan}
          />
        ))}
      </div>

      <SubscriptionDetailDrawer
        open={drawerOpen}
        plan={selected}
        models={models}
        isLoggedIn={isLoggedIn}
        onClose={closeDrawer}
        onSubscribe={handleSubscribe}
        onLoginRedirect={handleLoginRedirect}
      />
    </section>
  );
};

export default SubscriptionFloor;
