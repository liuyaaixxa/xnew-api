import React, { useMemo, useState, useEffect, useRef } from 'react';
import { SideSheet, Form, Button, Space, Banner } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../../../helpers';
import { CHANNEL_OPTIONS } from '../../../../constants/channel.constants';
import { getDeviceTokens } from '../../../../api/deviceToken';

const EditUserChannelModal = ({ visible, channel, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const isEdit = !!channel?.id;
  const formRef = useRef();

  const [deviceTokens, setDeviceTokens] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Load device tokens when modal opens
  useEffect(() => {
    if (visible) {
      loadDeviceTokens();
    }
  }, [visible]);

  const loadDeviceTokens = async () => {
    setLoadingDevices(true);
    try {
      const res = await getDeviceTokens();
      if (res.success && res.data) {
        const items = Array.isArray(res.data) ? res.data : res.data.items || [];
        setDeviceTokens(items);
      }
    } catch (err) {
      console.error('Failed to load device tokens:', err);
    }
    setLoadingDevices(false);
  };

  const initValues = useMemo(() => {
    if (isEdit) {
      return {
        name: channel.name || '',
        type: channel.type || 1,
        key: channel.key || '',
        base_url: channel.base_url || '',
        models: channel.models || '',
        test_model: channel.test_model || '',
        group: channel.group || 'default',
        remark: channel.remark || '',
        device_token_id: channel.device_token_id || undefined,
        device_name: channel.device_name || '',
        device_domain: channel.device_domain || '',
      };
    }
    return {
      name: '',
      type: 1,
      key: '',
      base_url: '',
      models: '',
      test_model: '',
      group: 'default',
      remark: '',
      device_token_id: undefined,
      device_name: '',
      device_domain: '',
    };
  }, [channel, isEdit]);

  const getUsername = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.username || '';
    } catch {
      return '';
    }
  };

  const handleDeviceSelect = (deviceId) => {
    if (!deviceId || !formRef.current) return;
    const device = deviceTokens.find((d) => d.id === deviceId);
    if (!device) return;

    const username = getUsername();
    const domain = device.domain || 'teniuapi.cloud';
    const deviceName = device.name || '';
    const baseUrl = `https://${username}-${deviceName}.${domain}`;

    formRef.current.formApi.setValue('base_url', baseUrl);
    formRef.current.formApi.setValue('device_name', deviceName);
    formRef.current.formApi.setValue('device_domain', domain);
  };

  const handleFetchModels = async () => {
    if (!formRef.current) return;
    const formApi = formRef.current.formApi;
    const baseUrl = formApi.getValue('base_url');
    const type = formApi.getValue('type');
    const key = formApi.getValue('key');

    if (!baseUrl) {
      showError(t('请先填写代理地址'));
      return;
    }

    setFetchingModels(true);
    try {
      const res = await API.post('/api/user-channel/fetch_models', {
        base_url: baseUrl,
        type: type || 1,
        key: key || '',
      });
      if (res.data.success && res.data.data) {
        const models = res.data.data;
        formApi.setValue('models', models.join(','));
        if (models.length > 0) {
          formApi.setValue('test_model', models[0]);
        }
        showSuccess(t('获取到 {{count}} 个模型', { count: models.length }));
      } else {
        showError(res.data.message || t('获取模型列表失败'));
      }
    } catch (err) {
      showError(err.message || t('获取模型列表失败'));
    }
    setFetchingModels(false);
  };

  const handleSubmit = async (values) => {
    try {
      let res;
      if (isEdit) {
        res = await API.put('/api/user-channel/', {
          ...values,
          id: channel.id,
        });
      } else {
        res = await API.post('/api/user-channel/', values);
      }
      const { success, message } = res.data;
      if (success) {
        showSuccess(isEdit ? t('渠道已更新') : t('渠道已创建'));
        onSuccess();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    }
  };

  const typeOptions = CHANNEL_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

  const deviceOptions = deviceTokens.map((d) => ({
    value: d.id,
    label: `${d.name} (${d.status === 1 ? t('已启用') : t('已禁用')})`,
  }));

  return (
    <SideSheet
      title={isEdit ? t('编辑个人渠道') : t('添加个人渠道')}
      visible={visible}
      onCancel={onClose}
      placement='right'
      width={500}
    >
      <Form
        ref={formRef}
        key={channel?.id || 'new'}
        initValues={initValues}
        onSubmit={handleSubmit}
        labelPosition='left'
        labelWidth={100}
      >
        <Form.Input
          field='name'
          label={t('渠道名称')}
          placeholder={t('请输入渠道名称')}
          rules={[{ required: true, message: t('渠道名称不能为空') }]}
        />
        <Form.Select
          field='device_token_id'
          label={t('关联设备')}
          placeholder={t('选择设备令牌自动填充代理地址')}
          optionList={deviceOptions}
          loading={loadingDevices}
          showClear
          onChange={handleDeviceSelect}
          style={{ width: '100%' }}
        />
        <Form.Input field='device_name' noLabel style={{ display: 'none' }} />
        <Form.Input field='device_domain' noLabel style={{ display: 'none' }} />
        {deviceTokens.length === 0 && !loadingDevices && (
          <Banner
            type='info'
            description={t('暂无设备令牌，请先在令牌管理页创建设备令牌')}
            style={{ marginBottom: 12 }}
          />
        )}
        <Form.Select
          field='type'
          label={t('渠道类型')}
          optionList={typeOptions}
          style={{ width: '100%' }}
        />
        <Form.TextArea
          field='key'
          label={t('密钥')}
          placeholder={
            isEdit
              ? t('留空则保持原密钥不变')
              : t('请输入渠道密钥')
          }
          rules={
            isEdit
              ? []
              : [{ required: true, message: t('渠道密钥不能为空') }]
          }
          autosize={{ minRows: 2, maxRows: 4 }}
        />
        <Form.Input
          field='base_url'
          label={t('代理地址')}
          placeholder={t('可选，请输入自定义 Base URL')}
        />
        <Form.TextArea
          field='models'
          label={t('模型')}
          placeholder={t('请输入模型列表，用逗号分隔')}
          rules={[{ required: true, message: t('模型列表不能为空') }]}
          autosize={{ minRows: 2, maxRows: 4 }}
          extraText={
            <Space style={{ marginTop: 4 }}>
              <Button
                size='small'
                type='tertiary'
                onClick={handleFetchModels}
                loading={fetchingModels}
                disabled={fetchingModels}
              >
                {t('获取模型列表')}
              </Button>
            </Space>
          }
        />
        <Form.Input
          field='test_model'
          label={t('测试模型')}
          placeholder={t('可选，用于测试的模型名称')}
        />
        <Form.Input
          field='group'
          label={t('分组')}
          placeholder='default'
        />
        <Form.TextArea
          field='remark'
          label={t('备注')}
          placeholder={t('可选备注')}
          autosize={{ minRows: 1, maxRows: 3 }}
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>{t('取消')}</Button>
            <Button htmlType='submit' theme='solid' type='primary'>
              {isEdit ? t('更新') : t('创建')}
            </Button>
          </Space>
        </div>
      </Form>
    </SideSheet>
  );
};

export default EditUserChannelModal;
