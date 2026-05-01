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
  SideSheet,
  Form,
  Select,
  Tag,
  TagInput,
  Banner,
} from '@douyinfe/semi-ui';
import { API } from '../../helpers';

const { Text } = Typography;

const BADGE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'new', label: 'NEW' },
  { value: 'hot', label: 'HOT' },
  { value: 'featured', label: '精选' },
];

const BADGE_COLORS = {
  new: 'blue',
  hot: 'red',
  featured: 'yellow',
};

export default function ModelCardManager() {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Edit side sheet
  const [editVisible, setEditVisible] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // Tag management for current model
  const [allTags, setAllTags] = useState([]);
  const [modelTags, setModelTags] = useState([]);

  const load = useCallback(async (currentPage = page, currentPageSize = pageSize) => {
    setLoading(true);
    try {
      const res = await API.get(
        `/api/models/?p=${currentPage}&page_size=${currentPageSize}`
      );
      const { success, data } = res.data;
      if (success) {
        setRecords(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1, pageSize);
  }, []);

  const openEdit = useCallback(async (model) => {
    setEditingModel(model);
    setFormData({
      display_name: model.display_name || '',
      badge: model.badge || '',
      description: model.description || '',
      icon: model.icon || '',
      sort_order: model.sort_order || 0,
    });

    // Load all tags and current model tags
    try {
      const [tagsRes, modelTagsRes] = await Promise.all([
        API.get('/api/model-tags/'),
        API.get(`/api/models/${model.id}/tags`),
      ]);
      if (tagsRes.data.success) {
        setAllTags(tagsRes.data.data || []);
      }
      if (modelTagsRes.data.success) {
        const tags = modelTagsRes.data.data || [];
        setModelTags(tags.map((t) => t.id));
      }
    } catch (e) {
      // ignore
    }

    setEditVisible(true);
  }, []);

  const saveCard = useCallback(async () => {
    setSaving(true);
    try {
      const body = {
        id: editingModel.id,
        model_name: editingModel.model_name,
        display_name: formData.display_name,
        badge: formData.badge,
        description: formData.description,
        icon: formData.icon,
        sort_order: formData.sort_order,
        vendor_id: editingModel.vendor_id,
        endpoints: editingModel.endpoints,
        status: editingModel.status,
        sync_official: editingModel.sync_official,
        name_rule: editingModel.name_rule,
        tags: editingModel.tags,
      };
      await API.put('/api/models/', body);

      // Save tags
      await API.put(`/api/models/${editingModel.id}/tags`, {
        tag_ids: modelTags,
      });

      setEditVisible(false);
      load(page, pageSize);
    } catch (e) {
      // handled by interceptor
    } finally {
      setSaving(false);
    }
  }, [editingModel, formData, modelTags, load, page, pageSize]);

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
      title: t('模型名称'),
      dataIndex: 'model_name',
      width: 200,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t('显示名称'),
      dataIndex: 'display_name',
      width: 160,
      render: (text) => text || <Text type="tertiary">—</Text>,
    },
    {
      title: t('徽章'),
      dataIndex: 'badge',
      width: 80,
      render: (badge) => {
        if (!badge) return <Text type="tertiary">—</Text>;
        return (
          <Tag color={BADGE_COLORS[badge] || 'light'}>
            {badge.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: t('排序权重'),
      dataIndex: 'sort_order',
      width: 90,
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      width: 70,
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'grey'}>
          {status === 1 ? t('启用') : t('禁用')}
        </Tag>
      ),
    },
    {
      title: t('操作'),
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button size="small" onClick={() => openEdit(record)}>
          {t('编辑')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Banner
        fullMode={false}
        type="info"
        description={t('在此管理模型的显示名称、徽章、排序权重和标签，这些信息将显示在模型市场页面。')}
        style={{ marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={records}
        loading={loading}
        pagination={{
          currentPage: page,
          pageSize,
          total,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
            load(p, ps);
          },
        }}
        empty={t('暂无数据')}
      />

      <SideSheet
        key={editingModel?.id || 'new'}
        title={t('更新模型卡片')}
        visible={editVisible}
        onCancel={() => setEditVisible(false)}
        width={480}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              theme="solid"
              loading={saving}
              onClick={saveCard}
            >
              {t('保存')}
            </Button>
            <Button onClick={() => setEditVisible(false)}>
              {t('取消')}
            </Button>
          </div>
        }
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Input
            field="display_name"
            label={t('显示名称')}
            initValue={formData.display_name || ''}
            onChange={(v) => handleFormChange('display_name', v)}
          />
          <Form.Select
            field="badge"
            label={t('徽章')}
            initValue={formData.badge || ''}
            onChange={(v) => handleFormChange('badge', v)}
          >
            {BADGE_OPTIONS.map((opt) => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Form.Select>
          <Form.TextArea
            field="description"
            label={t('描述')}
            initValue={formData.description || ''}
            onChange={(v) => handleFormChange('description', v)}
            maxCount={500}
          />
          <Form.Input
            field="icon"
            label={t('图标')}
            initValue={formData.icon || ''}
            onChange={(v) => handleFormChange('icon', v)}
          />
          <Form.InputNumber
            field="sort_order"
            label={t('排序权重')}
            initValue={formData.sort_order || 0}
            onChange={(v) => handleFormChange('sort_order', v)}
          />
          <div style={{ marginTop: 8 }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              {t('分配标签')}
            </Typography.Text>
            <TagInput
              value={modelTags.map((tid) => {
                const tag = allTags.find((t) => t.id === tid);
                return tag ? tag.name : String(tid);
              })}
              placeholder={t('输入标签并回车')}
              onTagClose={(tagName) => {
                const tag = allTags.find((t) => t.name === tagName);
                if (tag) {
                  setModelTags((prev) => prev.filter((id) => id !== tag.id));
                }
              }}
              onInputChange={() => {}}
            />
            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {allTags.map((tag) => (
                <Tag
                  key={tag.id}
                  color={modelTags.includes(tag.id) ? 'blue' : 'light'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setModelTags((prev) =>
                      prev.includes(tag.id)
                        ? prev.filter((id) => id !== tag.id)
                        : [...prev, tag.id]
                    );
                  }}
                >
                  {tag.name}
                </Tag>
              ))}
            </div>
          </div>
        </Form>
      </SideSheet>
    </div>
  );
}
