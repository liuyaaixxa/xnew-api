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
import {
  Table,
  Typography,
  Button,
  Modal,
  Form,
  Popconfirm,
} from '@douyinfe/semi-ui';
import { API, showSuccess, showError } from '../../helpers';

const { Text } = Typography;

export default function TagManager() {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [formData, setFormData] = useState({ name: '', name_i18n: '', sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/model-tags/');
      const { success, data } = res.data;
      if (success) setRecords(data || []);
    } catch (e) {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingTag(null);
    setFormData({ name: '', name_i18n: '', sort_order: 0 });
    setModalVisible(true);
  };

  const openEdit = (tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      name_i18n: tag.name_i18n || '',
      sort_order: tag.sort_order || 0,
    });
    setModalVisible(true);
  };

  const saveTag = useCallback(async () => {
    if (!formData.name.trim()) {
      showError(t('标签名称不能为空'));
      return;
    }
    setSaving(true);
    try {
      if (editingTag) {
        await API.put(`/api/model-tags/${editingTag.id}`, formData);
        showSuccess(t('标签已更新'));
      } else {
        await API.post('/api/model-tags/', formData);
        showSuccess(t('标签已创建'));
      }
      setModalVisible(false);
      load();
    } catch (e) {
      showError(e?.response?.data?.message || t('操作失败'));
    } finally {
      setSaving(false);
    }
  }, [editingTag, formData, load, t]);

  const deleteTag = useCallback(async (id) => {
    try {
      await API.delete(`/api/model-tags/${id}`);
      showSuccess(t('标签已删除'));
      load();
    } catch (e) {
      showError(e?.response?.data?.message || t('删除失败'));
    }
  }, [load, t]);

  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: t('标签名称'),
      dataIndex: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'i18n',
      dataIndex: 'name_i18n',
      width: 160,
      render: (text) => text || <Text type="tertiary">—</Text>,
    },
    {
      title: t('模型数量'),
      dataIndex: 'model_count',
      width: 90,
      render: (count) => (
        <Text style={{ color: count > 0 ? 'var(--semi-color-primary)' : undefined }}>
          {count || 0}
        </Text>
      ),
    },
    {
      title: t('排序权重'),
      dataIndex: 'sort_order',
      width: 90,
    },
    {
      title: t('操作'),
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="small" onClick={() => openEdit(record)}>
            {t('编辑')}
          </Button>
          <Popconfirm
            title={t('确认删除此标签')}
            content={t('删除标签不会删除模型，仅解除关联。')}
            onConfirm={() => deleteTag(record.id)}
          >
            <Button size="small" type="danger">
              {t('删除')}
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button theme="solid" onClick={openCreate}>
          {t('创建标签')}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={records}
        loading={loading}
        empty={t('暂无标签')}
      />

      <Modal
        key={editingTag?.id || 'new'}
        title={editingTag ? t('编辑标签') : t('创建标签')}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={saveTag}
        confirmLoading={saving}
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Input
            field="name"
            label={t('标签名称')}
            initValue={formData.name}
            onChange={(v) => handleFormChange('name', v)}
            placeholder="Chat"
            required
          />
          <Form.Input
            field="name_i18n"
            label="i18n"
            initValue={formData.name_i18n}
            onChange={(v) => handleFormChange('name_i18n', v)}
            placeholder={t('可选，多语言显示用')}
          />
          <Form.InputNumber
            field="sort_order"
            label={t('排序权重')}
            initValue={formData.sort_order}
            onChange={(v) => handleFormChange('sort_order', v)}
          />
        </Form>
      </Modal>
    </div>
  );
}
