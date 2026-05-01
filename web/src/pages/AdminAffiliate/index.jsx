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

import React, { useState } from 'react';
import { Tabs, TabPane } from '@douyinfe/semi-ui';
import { Users, FileText, Settings, Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isRoot } from '../../helpers';

import AffiliateListTab from './AffiliateListTab';
import SettlementTab from './SettlementTab';
import SettingsTab from './SettingsTab';
import PromotionTab from './PromotionTab';

export default function AdminAffiliate() {
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState('affiliates');

  const panes = [
    {
      itemKey: 'affiliates',
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={16} />
          {t('推广者列表')}
        </span>
      ),
      content: <AffiliateListTab />,
    },
    {
      itemKey: 'settlements',
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={16} />
          {t('结算管理')}
        </span>
      ),
      content: <SettlementTab />,
    },
    {
      itemKey: 'promotions',
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Megaphone size={16} />
          {t('活动管理')}
        </span>
      ),
      content: <PromotionTab />,
    },
  ];

  if (isRoot()) {
    panes.push({
      itemKey: 'settings',
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Settings size={16} />
          {t('参数设置')}
        </span>
      ),
      content: <SettingsTab />,
    });
  }

  return (
    <div className="mt-[60px] px-2">
      <Tabs type="line" activeKey={activeKey} onChange={setActiveKey}>
        {panes.map((pane) => (
          <TabPane itemKey={pane.itemKey} tab={pane.tab} key={pane.itemKey}>
            {activeKey === pane.itemKey && pane.content}
          </TabPane>
        ))}
      </Tabs>
    </div>
  );
}
