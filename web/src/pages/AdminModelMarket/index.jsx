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
import { IdCard, Tags } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isRoot } from '../../helpers';

import ModelCardManager from './ModelCardManager';
import TagManager from './TagManager';

export default function ModelMarketAdmin() {
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState('cards');

  const panes = [
    {
      itemKey: 'cards',
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IdCard size={16} />
          {t('模型卡片管理')}
        </span>
      ),
      content: <ModelCardManager />,
    },
  ];

  if (isRoot()) {
    panes.push({
      itemKey: 'tags',
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tags size={16} />
          {t('标签管理')}
        </span>
      ),
      content: <TagManager />,
    });
  }

  return (
    <div style={{ padding: 16 }}>
      <Tabs activeKey={activeKey} onChange={setActiveKey}>
        {panes.map((pane) => (
          <TabPane itemKey={pane.itemKey} tab={pane.tab} key={pane.itemKey}>
            {pane.content}
          </TabPane>
        ))}
      </Tabs>
    </div>
  );
}
