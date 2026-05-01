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

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, InputNumber, Spin, Typography } from '@douyinfe/semi-ui';
import { API, showSuccess, showError } from '../../helpers';

const { Text } = Typography;

export default function SettingsTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commissionRate, setCommissionRate] = useState(30);
  const [minSettlement, setMinSettlement] = useState(100);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/option/');
      const { success, data } = res.data;
      if (success && Array.isArray(data)) {
        for (const item of data) {
          if (item.key === 'AffiliateCommissionRate') {
            setCommissionRate(parseInt(item.value, 10) || 30);
          } else if (item.key === 'AffiliateMinSettlement') {
            setMinSettlement(parseFloat(item.value) || 100);
          }
        }
      }
    } catch (e) {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put('/api/option/', {
        key: 'AffiliateCommissionRate',
        value: String(commissionRate),
      });
      await API.put('/api/option/', {
        key: 'AffiliateMinSettlement',
        value: String(minSettlement),
      });
      showSuccess(t('保存成功'));
    } catch (e) {
      showError(t('保存失败'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Card style={{ maxWidth: 520 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <Text strong>{t('佣金比例')}</Text>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <InputNumber
              value={commissionRate}
              onChange={(v) => setCommissionRate(v)}
              min={1}
              max={100}
              suffix="%"
              style={{ width: 160 }}
            />
            <Text type="tertiary" size="small">
              {t('邀请越多用户，等级越高，佣金比例越高')}
            </Text>
          </div>
        </div>
        <div>
          <Text strong>{t('最低结算金额')}</Text>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <InputNumber
              value={minSettlement}
              onChange={(v) => setMinSettlement(v)}
              min={0}
              step={0.01}
              prefix="¥"
              style={{ width: 160 }}
            />
            <Text type="tertiary" size="small">
              {t('收益满¥100即可结算')}
            </Text>
          </div>
        </div>
        <Button
          theme="solid"
          loading={saving}
          onClick={handleSave}
          style={{ width: 'fit-content', background: '#D97757' }}
        >
          {t('保存')}
        </Button>
      </div>
    </Card>
  );
}
