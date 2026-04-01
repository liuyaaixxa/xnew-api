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
import { TabPane, Tabs } from '@douyinfe/semi-ui';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, Smartphone } from 'lucide-react';
import TokensTable from '../../components/table/tokens';
import DeviceTokenCard from '../../components/DeviceTokenCard';

const Token = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [tabActiveKey, setTabActiveKey] = useState('llm');

  const onChangeTab = (key) => {
    setTabActiveKey(key);
    navigate(`?tab=${key}`);
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setTabActiveKey(tab);
    }
  }, [location.search]);

  const panes = [
    {
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <KeyRound size={18} />
          {t('LLM令牌管理')}
        </span>
      ),
      content: <TokensTable />,
      itemKey: 'llm',
    },
    {
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Smartphone size={18} />
          {t('设备令牌管理')}
        </span>
      ),
      content: <DeviceTokenCard />,
      itemKey: 'device',
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <Tabs
        type='line'
        activeKey={tabActiveKey}
        onChange={(key) => onChangeTab(key)}
      >
        {panes.map((pane) => (
          <TabPane itemKey={pane.itemKey} tab={pane.tab} key={pane.itemKey}>
            {tabActiveKey === pane.itemKey && pane.content}
          </TabPane>
        ))}
      </Tabs>
    </div>
  );
};

export default Token;
