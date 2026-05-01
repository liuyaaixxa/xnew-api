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
import { Table, Switch, Button, Modal, Form, Spin } from '@douyinfe/semi-ui';
import { Megaphone } from 'lucide-react';
import { API, showSuccess, showError } from '../../helpers';

export default function PromotionTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState([]);
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const formRef = React.useRef();

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/user/affiliate-promotions');
      if (res.data.success && Array.isArray(res.data.data)) {
        setPromotions(res.data.data);
      }
    } catch (e) {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleToggle = useCallback(async (record, checked) => {
    try {
      await API.put(`/api/user/affiliate-promotions/${record.id}`, {
        name: record.name,
        description: record.description,
        color: record.color,
        sort_order: record.sort_order,
        enabled: checked,
      });
      showSuccess(checked ? t('已上架') : t('已下架'));
      fetchPromotions();
    } catch (e) {
      showError(t('操作失败'));
    }
  }, [t, fetchPromotions]);

  const handleEdit = useCallback((record) => {
    setEditing(record);
    setEditVisible(true);
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.setValues({
          name: record.name,
          description: record.description,
          color: record.color,
          sort_order: record.sort_order,
        });
      }
    }, 0);
  }, []);

  const handleSave = useCallback(async () => {
    const values = formRef.current?.getValues();
    if (!values) return;
    setSaving(true);
    try {
      await API.put(`/api/user/affiliate-promotions/${editing.id}`, {
        name: values.name,
        description: values.description,
        color: values.color,
        sort_order: values.sort_order || 0,
        enabled: editing.enabled,
      });
      showSuccess(t('保存成功'));
      setEditVisible(false);
      fetchPromotions();
    } catch (e) {
      showError(t('保存失败'));
    } finally {
      setSaving(false);
    }
  }, [editing, t, fetchPromotions]);

  const columns = [
    {
      title: t('活动名称'),
      dataIndex: 'name',
      render: (text, record) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-block', width: 18, height: 18, borderRadius: 4,
            background: record.color || '#333',
            border: '1px solid var(--semi-color-border)',
          }} />
          <span style={{ fontWeight: 600 }}>{text}</span>
        </span>
      ),
    },
    { title: t('描述'), dataIndex: 'description', width: 220 },
    {
      title: t('路径'), dataIndex: 'route_path', width: 160,
      render: (text) => <code style={{ fontSize: 12, color: 'var(--semi-color-tertiary)' }}>{text}</code>,
    },
    { title: t('排序'), dataIndex: 'sort_order', width: 70, align: 'center' },
    {
      title: t('状态'), dataIndex: 'enabled', width: 90, align: 'center',
      render: (_text, record) => (
        <Switch
          checked={record.enabled}
          onChange={(checked) => handleToggle(record, checked)}
          size="small"
        />
      ),
    },
    {
      title: t('操作'), width: 80, align: 'center',
      render: (_, record) => (
        <Button size="small" theme="light" onClick={() => handleEdit(record)}>
          {t('编辑')}
        </Button>
      ),
    },
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>;
  }

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Megaphone size={18} style={{ color: 'var(--semi-color-primary)' }} />
        <span style={{ color: 'var(--semi-color-tertiary)', fontSize: 13 }}>
          {t('控制台→推广联盟 中展示的推广活动。关闭的活动将不在用户端显示。')}
        </span>
      </div>
      <Table
        columns={columns}
        dataSource={promotions}
        rowKey="id"
        pagination={false}
        size="small"
      />
      <Modal
        title={t('编辑活动')}
        visible={editVisible}
        onOk={handleSave}
        onCancel={() => setEditVisible(false)}
        confirmLoading={saving}
      >
        <Form ref={formRef} labelPosition="top" style={{ marginTop: 16 }}>
          <Form.Input field="name" label={t('活动名称')} rules={[{ required: true }]} />
          <Form.Input field="description" label={t('描述')} />
          <Form.Input field="color" label={t('预览颜色')} placeholder="#0d0d1a" />
          <Form.InputNumber field="sort_order" label={t('排序权重')} min={0} />
        </Form>
      </Modal>
    </>
  );
}
