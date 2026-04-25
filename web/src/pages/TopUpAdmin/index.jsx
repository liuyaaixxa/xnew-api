/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/

import React, { useState } from 'react';
import { Tabs, TabPane } from '@douyinfe/semi-ui';
import { FileText, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import PendingReviewTab from './PendingReviewTab';
import AllOrdersTab from './AllOrdersTab';

export default function TopUpAdmin() {
  const { t } = useTranslation();
  // Default to "pending review" because that's the admin's daily work item.
  // Switching to the full orders tab is a deliberate second click.
  const [activeKey, setActiveKey] = useState('review');

  const panes = [
    {
      itemKey: 'review',
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={16} />
          {t('充值审核')}
        </span>
      ),
      content: <PendingReviewTab />,
    },
    {
      itemKey: 'all',
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={16} />
          {t('全部订单')}
        </span>
      ),
      content: <AllOrdersTab />,
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <Tabs
        type='line'
        activeKey={activeKey}
        onChange={setActiveKey}
      >
        {panes.map((p) => (
          <TabPane itemKey={p.itemKey} tab={p.tab} key={p.itemKey}>
            {activeKey === p.itemKey && p.content}
          </TabPane>
        ))}
      </Tabs>
    </div>
  );
}
