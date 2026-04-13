import { useEffect, useState, useRef } from 'react';
import {
  Banner,
  Button,
  Form,
  Row,
  Col,
  Spin,
} from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../../helpers';
import { useTranslation } from 'react-i18next';

export default function SettingsPaymentGatewayOpenfort(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    OpenfortApiKey: '',
    OpenfortPublishableKey: '',
    OpenfortWalletSecret: '',
    OpenfortShieldPublishableKey: '',
    OpenfortShieldSecretKey: '',
    OpenfortEncryptionShare: '',
  });
  const formApiRef = useRef(null);

  useEffect(() => {
    if (props.options && formApiRef.current) {
      const currentInputs = {
        OpenfortApiKey: props.options.OpenfortApiKey || '',
        OpenfortPublishableKey: props.options.OpenfortPublishableKey || '',
        OpenfortWalletSecret: props.options.OpenfortWalletSecret || '',
        OpenfortShieldPublishableKey: props.options.OpenfortShieldPublishableKey || '',
        OpenfortShieldSecretKey: props.options.OpenfortShieldSecretKey || '',
        OpenfortEncryptionShare: props.options.OpenfortEncryptionShare || '',
      };
      setInputs(currentInputs);
      formApiRef.current.setValues(currentInputs);
    }
  }, [props.options]);

  const handleFormChange = (values) => {
    setInputs(values);
  };

  const submitOpenfortSetting = async () => {
    setLoading(true);
    try {
      const options = [];

      if (inputs.OpenfortApiKey !== '') {
        options.push({ key: 'OpenfortApiKey', value: inputs.OpenfortApiKey });
      }
      if (inputs.OpenfortPublishableKey !== '') {
        options.push({ key: 'OpenfortPublishableKey', value: inputs.OpenfortPublishableKey });
      }
      if (inputs.OpenfortWalletSecret !== '') {
        options.push({ key: 'OpenfortWalletSecret', value: inputs.OpenfortWalletSecret });
      }
      if (inputs.OpenfortShieldPublishableKey !== '') {
        options.push({ key: 'OpenfortShieldPublishableKey', value: inputs.OpenfortShieldPublishableKey });
      }
      if (inputs.OpenfortShieldSecretKey !== '') {
        options.push({ key: 'OpenfortShieldSecretKey', value: inputs.OpenfortShieldSecretKey });
      }
      if (inputs.OpenfortEncryptionShare !== '') {
        options.push({ key: 'OpenfortEncryptionShare', value: inputs.OpenfortEncryptionShare });
      }

      const requestQueue = options.map((opt) =>
        API.put('/api/option/', {
          key: opt.key,
          value: opt.value,
        }),
      );

      const results = await Promise.all(requestQueue);

      const errorResults = results.filter((res) => !res.data.success);
      if (errorResults.length > 0) {
        errorResults.forEach((res) => {
          showError(res.data.message);
        });
      } else {
        showSuccess(t('更新成功'));
        props.refresh?.();
      }
    } catch (error) {
      showError(t('更新失败'));
    }
    setLoading(false);
  };

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        onValueChange={handleFormChange}
        getFormApi={(api) => (formApiRef.current = api)}
      >
        <Form.Section text={t('Openfort 加密钱包设置')}>
          <Banner
            type='info'
            description={t('配置 Openfort 后，用户注册时将自动创建 Solana 钱包。请前往 Openfort 控制台获取以下密钥。')}
          />
          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='OpenfortApiKey'
                label={t('API 密钥') + ' (sk_...)'}
                placeholder={t('Openfort Secret Key，敏感信息不显示')}
                type='password'
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='OpenfortPublishableKey'
                label={t('Publishable Key') + ' (pk_...)'}
                placeholder={t('Openfort Publishable Key，敏感信息不显示')}
                type='password'
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='OpenfortWalletSecret'
                label={t('Wallet Secret') + ' (MIG...)'}
                placeholder={t('Wallet Secret (ECDSA P-256)，敏感信息不显示')}
                type='password'
              />
            </Col>
          </Row>
          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }} style={{ marginTop: 16 }}>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='OpenfortEncryptionShare'
                label={t('加密分片') + ' (Encryption Share)'}
                placeholder={t('Encryption Share，敏感信息不显示')}
                type='password'
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='OpenfortShieldPublishableKey'
                label={t('Shield 公钥') + ' (Shield Publishable)'}
                placeholder={t('Shield Publishable Key，敏感信息不显示')}
                type='password'
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='OpenfortShieldSecretKey'
                label={t('Shield 私钥') + ' (Shield Secret)'}
                placeholder={t('Shield Secret Key，敏感信息不显示')}
                type='password'
              />
            </Col>
          </Row>
          <Button onClick={submitOpenfortSetting}>{t('更新 Openfort 设置')}</Button>
        </Form.Section>
      </Form>
    </Spin>
  );
}
