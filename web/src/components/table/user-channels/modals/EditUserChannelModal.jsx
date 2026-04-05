import React, { useMemo } from 'react';
import { SideSheet, Form, Button, Space } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../../../helpers';
import { CHANNEL_OPTIONS } from '../../../../constants/channel.constants';

const EditUserChannelModal = ({ visible, channel, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const isEdit = !!channel?.id;

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
    };
  }, [channel, isEdit]);

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

  return (
    <SideSheet
      title={isEdit ? t('编辑个人渠道') : t('添加个人渠道')}
      visible={visible}
      onCancel={onClose}
      placement='right'
      width={500}
    >
      <Form
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
