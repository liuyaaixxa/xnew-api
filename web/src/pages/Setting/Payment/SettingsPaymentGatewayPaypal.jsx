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

import React, { useEffect, useState, useRef } from 'react';
import {
  Banner,
  Button,
  Form,
  Row,
  Col,
  Typography,
  Spin,
  Input,
  Space,
  Switch,
  InputNumber,
} from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../../helpers';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

export default function SettingsPaymentGatewayPaypal(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    PayPalClientId: '',
    PayPalClientSecret: '',
    PayPalSandbox: false,
    PayPalMinTopUp: 1,
  });
  const [originInputs, setOriginInputs] = useState({});
  const formApiRef = useRef(null);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/option/');
      if (res.data.success) {
        const options = res.data.data;
        setInputs({
          PayPalClientId: options.PayPalClientId || '',
          PayPalClientSecret: options.PayPalClientSecret || '',
          PayPalSandbox: options.PayPalSandbox === 'true',
          PayPalMinTopUp: parseInt(options.PayPalMinTopUp) || 1,
        });
        setOriginInputs({
          PayPalClientId: options.PayPalClientId || '',
          PayPalClientSecret: options.PayPalClientSecret || '',
          PayPalSandbox: options.PayPalSandbox === 'true',
          PayPalMinTopUp: parseInt(options.PayPalMinTopUp) || 1,
        });
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(t('加载配置失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const updateOption = async (key, value) => {
    try {
      const res = await API.put('/api/option/', {
        key: key,
        value: value,
      });
      if (res.data.success) {
        showSuccess(t('更新成功'));
        return true;
      } else {
        showError(res.data.message);
        return false;
      }
    } catch (error) {
      showError(t('更新失败'));
      return false;
    }
  };

  const onSubmit = async () => {
    setLoading(true);
    try {
      const successArray = await Promise.all([
        updateOption('PayPalClientId', inputs.PayPalClientId),
        updateOption('PayPalClientSecret', inputs.PayPalClientSecret),
        updateOption('PayPalSandbox', inputs.PayPalSandbox.toString()),
        updateOption('PayPalMinTopUp', inputs.PayPalMinTopUp.toString()),
      ]);
      if (successArray.every((v) => v)) {
        showSuccess(t('所有配置已保存'));
        setOriginInputs(inputs);
      }
    } catch (error) {
      showError(t('保存失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        getFormApi={(api) => (formApiRef.current = api)}
        onSubmit={onSubmit}
        labelPosition="left"
        labelAlign="right"
        style={{ marginTop: 10 }}
      >
        <Banner
          type="info"
          description={t('PayPal 支付需要配置 Client ID 和 Client Secret，可从 PayPal Developer 平台获取')}
          closeIcon={null}
          style={{ marginBottom: 16 }}
        />

        <Row>
          <Col span={12}>
            <Form.Input
              field="PayPalClientId"
              label={t('Client ID')}
              placeholder={t('PayPal 应用 Client ID')}
              onChange={(value) => handleInputChange('PayPalClientId', value)}
              value={inputs.PayPalClientId}
            />
          </Col>
          <Col span={12}>
            <Form.Input
              field="PayPalClientSecret"
              label={t('Client Secret')}
              placeholder={t('PayPal 应用 Client Secret')}
              onChange={(value) => handleInputChange('PayPalClientSecret', value)}
              value={inputs.PayPalClientSecret}
              mode="password"
            />
          </Col>
        </Row>

        <Row>
          <Col span={12}>
            <Form.Switch
              field="PayPalSandbox"
              label={t('沙箱模式')}
              checkedText={t('沙箱')}
              uncheckedText={t('生产')}
              onChange={(value) => handleInputChange('PayPalSandbox', value)}
              value={inputs.PayPalSandbox}
            />
          </Col>
          <Col span={12}>
            <Form.InputNumber
              field="PayPalMinTopUp"
              label={t('最小充值金额 ($)')}
              min={1}
              onChange={(value) => handleInputChange('PayPalMinTopUp', value)}
              value={inputs.PayPalMinTopUp}
            />
          </Col>
        </Row>

        <Space style={{ marginTop: 16 }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            {t('保存配置')}
          </Button>
          <Button onClick={loadOptions}>{t('刷新')}</Button>
        </Space>
      </Form>
    </Spin>
  );
}