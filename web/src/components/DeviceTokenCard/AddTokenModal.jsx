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

import React, { useState, useRef } from 'react';
import {
  Modal,
  Form,
  Button,
  Space,
  Typography,
  Banner,
} from '@douyinfe/semi-ui';
import {
  IconSave,
  IconClose,
  IconCopy,
  IconKey,
} from '@douyinfe/semi-icons';
import PropTypes from 'prop-types';
import { createDeviceToken } from '../../api/deviceToken';
import { showError, showSuccess, copy } from '../../helpers';

const { Text, Title } = Typography;

const AddTokenModal = ({ visible, onClose, onSuccess, newToken, t = (key) => key }) => {
  const [loading, setLoading] = useState(false);
  const formApiRef = useRef(null);

  const isNewTokenMode = !!newToken;

  const getInitValues = () => ({
    name: '',
    domain: 'teniuapi.cloud',
    port: 11434,
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const { success, message, data } = await createDeviceToken({
        name: values.name || 'default',
        domain: values.domain || 'teniuapi.cloud',
        port: values.port || 11434,
      });

      if (success) {
        showSuccess(t('设备令牌创建成功'));
        if (onSuccess) {
          onSuccess(data);
        }
      } else {
        showError(t(message));
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = async (token) => {
    if (await copy(token)) {
      showSuccess(t('已复制到剪贴板'));
    }
  };

  // Display new token mode
  if (isNewTokenMode) {
    return (
      <Modal
        visible={visible}
        title={
          <Space>
            <IconKey style={{ color: 'var(--semi-color-success)' }} />
            <Title heading={5} className="m-0">
              {t('设备令牌创建成功')}
            </Title>
          </Space>
        }
        footer={
          <div className="flex justify-end">
            <Space>
              <Button
                theme="solid"
                type="primary"
                icon={<IconCopy />}
                onClick={() => handleCopyToken(newToken.plaintext_token || newToken.token_mask)}
              >
                {t('复制令牌')}
              </Button>
              <Button
                theme="light"
                onClick={onClose}
              >
                {t('关闭')}
              </Button>
            </Space>
          </div>
        }
        onCancel={onClose}
        width={500}
      >
        <div className="add-token-modal-content">
          <Banner
            type="success"
            description={t('设备令牌已成功创建，请妥善保存令牌信息。')}
            className="mb-4"
          />

          <div className="token-info-card">
            <div className="token-info-item">
              <Text type="tertiary" className="token-info-label">
                {t('令牌名称')}
              </Text>
              <Text strong>{newToken.name}</Text>
            </div>

            <div className="token-info-item">
              <Text type="tertiary" className="token-info-label">
                {t('域名')}
              </Text>
              <Text strong>{newToken.domain}</Text>
            </div>

            <div className="token-info-item">
              <Text type="tertiary" className="token-info-label">
                {t('令牌')}
              </Text>
              <Text strong className="token-value">
                {newToken.token_mask}
              </Text>
            </div>
          </div>

          <Banner
            type="warning"
            description={t('请立即复制并妥善保管此令牌，关闭后将无法再次查看完整令牌。')}
            className="mt-4"
          />
        </div>
      </Modal>
    );
  }

  // Create token mode
  return (
    <Modal
      visible={visible}
      title={
        <Space>
          <IconKey style={{ color: 'var(--semi-color-primary)' }} />
          <Title heading={5} className="m-0">
            {t('添加设备令牌')}
          </Title>
        </Space>
      }
      footer={null}
      onCancel={onClose}
      width={500}
    >
      <Form
        initValues={getInitValues()}
        getFormApi={(api) => (formApiRef.current = api)}
        onSubmit={handleSubmit}
      >
        {({ values }) => (
          <div className="add-token-modal-content">
            <Form.Input
              field="name"
              label={t('设备名称')}
              placeholder={t('请输入设备名称，如：my-device')}
              rules={[{ required: false }]}
              showClear
            />

            <Form.Input
              field="domain"
              label={t('域名')}
              placeholder={t('请输入 octelium 域名')}
              extraText={t('设备连接的 octelium 域名，默认为 teniuapi.cloud')}
              rules={[{ required: false }]}
              showClear
            />

            <Form.InputNumber
              field="port"
              label={t('服务端口')}
              placeholder={t('请输入本地服务端口')}
              extraText={t('设备本地服务端口，如 Ollama 默认端口 11434')}
              min={1}
              max={65535}
              rules={[{ required: false }]}
            />

            <div className="add-token-modal-footer">
              <Space>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={() => formApiRef.current?.submitForm()}
                  icon={<IconSave />}
                  loading={loading}
                >
                  {t('创建')}
                </Button>
                <Button
                  theme="light"
                  onClick={onClose}
                  icon={<IconClose />}
                >
                  {t('取消')}
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Form>
    </Modal>
  );
};

AddTokenModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  newToken: PropTypes.object,
  t: PropTypes.func,
};

export default AddTokenModal;
