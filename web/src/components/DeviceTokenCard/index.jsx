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

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Typography,
  Space,
  Popconfirm,
  Tag,
  Toast,
} from '@douyinfe/semi-ui';
import {
  IconPlus,
  IconDelete,
  IconLink,
} from '@douyinfe/semi-icons';
import CardPro from '../common/ui/CardPro';
import CardTable from '../common/ui/CardTable';
import {
  showError,
  showSuccess,
  timestamp2string,
  copy,
} from '../../helpers';
import {
  getDeviceTokens,
  deleteDeviceToken,
  getDeviceTokenKey,
} from '../../api/deviceToken';
import AddTokenModal from './AddTokenModal';
import './style.scss';

const { Text } = Typography;

const DeviceTokenCard = () => {
  const { t } = useTranslation();

  // State
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newToken, setNewToken] = useState(null);

  // Load device tokens
  const loadTokens = async () => {
    setLoading(true);
    try {
      const { success, message, data } = await getDeviceTokens();
      if (success) {
        // Handle paginated response - data contains items array
        const items = Array.isArray(data) ? data : (data?.items || []);
        setTokens(items);
      } else {
        showError(t(message));
      }
    } catch (error) {
      showError(error.message);
    }
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    loadTokens();
  }, []);

  // Handle delete
  const handleDelete = async (id) => {
    try {
      const { success, message } = await deleteDeviceToken(id);
      if (success) {
        showSuccess(t('设备令牌已删除'));
        await loadTokens();
      } else {
        showError(t(message));
      }
    } catch (error) {
      showError(error.message);
    }
  };

  // Handle copy token
  const handleCopyToken = async (tokenMask) => {
    if (await copy(tokenMask)) {
      showSuccess(t('已复制到剪贴板'));
    } else {
      Toast.error(t('无法复制到剪贴板，请手动复制'));
    }
  };

  // Handle add success
  const handleAddSuccess = async (token) => {
    setShowAddModal(false);
    loadTokens();
    // Fetch plaintext token for copy
    try {
      const { success, data } = await getDeviceTokenKey(token.id);
      if (success && data?.token) {
        setNewToken({ ...token, plaintext_token: data.token });
        return;
      }
    } catch (e) {
      // fallback to masked token
    }
    setNewToken(token);
  };

  // Close new token display
  const handleCloseNewToken = () => {
    setNewToken(null);
  };

  // Column definitions
  const columns = [
    {
      title: t('ID'),
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: t('设备名称'),
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text) => <Text strong>{text || '-'}</Text>,
    },
    {
      title: t('令牌'),
      dataIndex: 'token_mask',
      key: 'token_mask',
      width: 180,
      render: (text, record) => (
        <Space>
          <Text type="secondary">{text || '-'}</Text>
          <Button
            size="small"
            theme="borderless"
            icon={<IconLink />}
            onClick={() => handleCopyToken(text)}
          />
        </Space>
      ),
    },
    {
      title: t('域名'),
      dataIndex: 'domain',
      key: 'domain',
      width: 150,
      render: (text) => <Text>{text || '-'}</Text>,
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => {
        const statusMap = {
          1: { color: 'green', text: t('启用') },
          2: { color: 'red', text: t('禁用') },
        };
        const { color, text: statusText } = statusMap[status] || statusMap[1];
        return <Tag color={color}>{statusText}</Tag>;
      },
    },
    {
      title: t('创建时间'),
      dataIndex: 'created_time',
      key: 'created_time',
      width: 150,
      render: (time) => timestamp2string(time),
    },
    {
      title: t('操作'),
      dataIndex: 'operate',
      key: 'operate',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Popconfirm
          title={t('确定删除此设备令牌？')}
          content={t('此操作不可撤销')}
          onConfirm={() => handleDelete(record.id)}
          position="left"
        >
          <Button
            type="danger"
            theme="borderless"
            size="small"
            icon={<IconDelete />}
          />
        </Popconfirm>
      ),
    },
  ];

  // Description area content
  const descriptionArea = (
    <div className="device-token-header">
      <div className="device-token-title">
        <Text heading="5" className="font-semibold">
          {t('设备令牌管理')}
        </Text>
        <Text type="tertiary" size="small">
          {t('用于设备认证的令牌，支持家庭节点连接')}
        </Text>
      </div>
      <Button
        theme="solid"
        type="primary"
        icon={<IconPlus />}
        onClick={() => setShowAddModal(true)}
      >
        {t('添加设备令牌')}
      </Button>
    </div>
  );

  return (
    <>
      {/* New token display modal */}
      {newToken && (
        <AddTokenModal
          visible={true}
          onClose={handleCloseNewToken}
          newToken={newToken}
          t={t}
        />
      )}

      {/* Add token modal */}
      <AddTokenModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
        t={t}
      />

      {/* Main card */}
      <CardPro
        type="type1"
        descriptionArea={descriptionArea}
        t={t}
        className="device-token-card"
      >
        <CardTable
          columns={columns}
          dataSource={tokens}
          loading={loading}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          empty={
            <div className="device-token-empty">
              <Text type="tertiary">{t('暂无设备令牌')}</Text>
            </div>
          }
          size="middle"
        />
      </CardPro>
    </>
  );
};

export default DeviceTokenCard;