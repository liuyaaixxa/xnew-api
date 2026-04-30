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
import { Table, Tag, Button, Space, Modal, TextArea, Typography, Empty } from '@douyinfe/semi-ui';
import { API, showSuccess, showError } from '../../helpers';

const { Text } = Typography;

const STATUS_CONFIG = {
  pending: { color: 'orange', labelKey: '待处理' },
  approved: { color: 'green', labelKey: '已通过' },
  rejected: { color: 'red', labelKey: '已拒绝' },
};

const STATUS_TABS = [
  { key: '', labelKey: '全部' },
  { key: 'pending', labelKey: '待处理' },
  { key: 'approved', labelKey: '已通过' },
  { key: 'rejected', labelKey: '已拒绝' },
];

export default function SettlementTab() {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async (currentPage = page, currentPageSize = pageSize, status = statusFilter) => {
    setLoading(true);
    try {
      const qs = `p=${currentPage}&page_size=${currentPageSize}` +
        (status ? `&status=${status}` : '');
      const res = await API.get(`/api/user/affiliate/settlements?${qs}`);
      const { success, data } = res.data;
      if (success) {
        setRecords(data.items || []);
        setTotal(data.total || 0);
        setPage(data.page || currentPage);
      }
    } catch (e) {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    load(1, pageSize, statusFilter);
  }, []);

  const handleStatusChange = (key) => {
    setStatusFilter(key);
    setPage(1);
    load(1, pageSize, key);
  };

  const handleApprove = async (id) => {
    try {
      const res = await API.post('/api/user/affiliate/settlement/approve', { id, remark: '' });
      if (res.data.success) {
        showSuccess(t('结算已批准'));
        load(page, pageSize, statusFilter);
      } else {
        showError(res.data.message || t('操作失败'));
      }
    } catch (e) {
      showError(t('操作失败'));
    }
  };

  const confirmApprove = (record) => {
    Modal.confirm({
      title: t('确认通过结算'),
      content: (
        <div style={{ lineHeight: 2 }}>
          <div>{t('结算ID')}: {record.id}</div>
          <div>{t('用户名')}: <Text strong>{record.user_name}</Text></div>
          <div>{t('金额')}: ¥{(record.amount || 0).toFixed(2)}</div>
          <div style={{ marginTop: 12, color: '#f59e0b', fontSize: 13 }}>
            {t('通过后将立即为用户增加对应额度，此操作不可撤销')}
          </div>
        </div>
      ),
      onOk: () => handleApprove(record.id),
    });
  };

  const confirmReject = (record) => {
    let reason = '';
    Modal.confirm({
      title: t('确认拒绝结算'),
      content: (
        <div>
          <div style={{ marginBottom: 8 }}>
            {t('结算ID')}: {record.id} — {record.user_name}
          </div>
          <div style={{ marginBottom: 4 }}>{t('请输入拒绝原因')}:</div>
          <TextArea
            rows={3}
            placeholder={t('请输入拒绝原因')}
            onChange={(v) => { reason = v; }}
          />
        </div>
      ),
      onOk: () => handleReject(record.id, reason),
    });
  };

  const handleReject = async (id, remark) => {
    try {
      const res = await API.post('/api/user/affiliate/settlement/reject', { id, remark });
      if (res.data.success) {
        showSuccess(t('结算已拒绝'));
        load(page, pageSize, statusFilter);
      } else {
        showError(res.data.message || t('操作失败'));
      }
    } catch (e) {
      showError(t('操作失败'));
    }
  };

  const columns = [
    {
      title: t('结算ID'),
      dataIndex: 'id',
      width: 80,
    },
    {
      title: t('用户名'),
      dataIndex: 'user_name',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: t('推广码'),
      dataIndex: 'aff_code',
      width: 110,
      render: (text) => (
        <Text copyable={{ content: text }}>{text || '-'}</Text>
      ),
    },
    {
      title: t('金额'),
      dataIndex: 'amount',
      width: 110,
      render: (text) => (
        <Text style={{ color: 'var(--semi-color-success)', fontWeight: 600 }}>
          ¥{(text || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: t('申请时间'),
      dataIndex: 'apply_time',
      width: 170,
      render: (text) => {
        if (!text) return '-';
        return new Date(text * 1000).toLocaleString();
      },
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      width: 90,
      render: (text) => {
        const cfg = STATUS_CONFIG[text] || { color: 'grey', labelKey: text };
        return <Tag color={cfg.color}>{t(cfg.labelKey)}</Tag>;
      },
    },
    {
      title: t('备注'),
      dataIndex: 'remark',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: t('操作'),
      key: 'action',
      width: 140,
      render: (_, record) => {
        if (record.status !== 'pending') {
          return <Text type="tertiary">-</Text>;
        }
        return (
          <Space>
            <Button
              theme="solid"
              size="small"
              style={{ background: '#D97757' }}
              onClick={() => confirmApprove(record)}
            >
              {t('通过')}
            </Button>
            <Button
              theme="outline"
              type="danger"
              size="small"
              onClick={() => confirmReject(record)}
            >
              {t('拒绝')}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.key}
              theme={statusFilter === tab.key ? 'solid' : 'outline'}
              size="small"
              onClick={() => handleStatusChange(tab.key)}
              style={statusFilter === tab.key ? { background: '#D97757' } : undefined}
            >
              {t(tab.labelKey)}
            </Button>
          ))}
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={loading}
        pagination={{
          currentPage: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOpts: [10, 20, 50, 100],
          onPageChange: (p) => { setPage(p); load(p, pageSize, statusFilter); },
          onPageSizeChange: (s) => { setPageSize(s); setPage(1); load(1, s, statusFilter); },
        }}
        empty={<Empty description={t('暂无结算记录')} />}
      />
    </div>
  );
}
