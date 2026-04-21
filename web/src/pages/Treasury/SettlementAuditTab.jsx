import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  Button,
  Table,
  Tag,
  Toast,
  Select,
  Modal,
  Input,
  Tooltip,
  Banner,
} from '@douyinfe/semi-ui';
import { Check, X, Send } from 'lucide-react';
import { API, showError } from '../../helpers';

const { Text } = Typography;
const { TextArea } = Input;

const statusMap = {
  0: { color: 'blue', key: '新建' },
  1: { color: 'orange', key: '审核中' },
  2: { color: 'cyan', key: '结算中' },
  3: { color: 'green', key: '结算完成' },
  4: { color: 'red', key: '驳回' },
};

export default function SettlementAuditTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  // Reject modal
  const [rejectModal, setRejectModal] = useState({ visible: false, orderId: null, reason: '' });

  const fetchOrders = useCallback(async (p = 1, status = statusFilter) => {
    setLoading(true);
    try {
      let url = `/api/treasury/settlements?p=${p}&page_size=10`;
      if (status !== '') {
        url += `&status=${status}`;
      }
      const res = await API.get(url);
      const { success, data } = res.data;
      if (success) {
        setOrders(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (_e) {
      showError(t('获取结算单列表失败'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    fetchOrders(1, statusFilter);
  }, [statusFilter]);

  const handleApprove = async (id) => {
    try {
      const res = await API.post(`/api/treasury/settlement/${id}/approve`);
      const { success, message } = res.data;
      if (success) {
        Toast.success(t('审核通过'));
        fetchOrders(page, statusFilter);
      } else {
        showError(message);
      }
    } catch (_e) {
      showError(t('操作失败'));
    }
  };

  const handleReject = async () => {
    const { orderId, reason } = rejectModal;
    try {
      const res = await API.post(`/api/treasury/settlement/${orderId}/reject`, { reason });
      const { success, message } = res.data;
      if (success) {
        Toast.success(t('已驳回'));
        setRejectModal({ visible: false, orderId: null, reason: '' });
        fetchOrders(page, statusFilter);
      } else {
        showError(message);
      }
    } catch (_e) {
      showError(t('操作失败'));
    }
  };

  const handleSettle = async (record) => {
    Modal.confirm({
      title: t('确认转入积分'),
      content: (
        <div style={{ lineHeight: 2 }}>
          <div><Text type='secondary'>{t('结算单号')}：</Text><Text style={{ fontFamily: 'monospace' }}>{record.order_no}</Text></div>
          <div><Text type='secondary'>{t('用户')}：</Text><Text strong>{record.username}</Text></div>
          <div><Text type='secondary'>{t('总 Token')}：</Text><Text strong>{record.total_tokens?.toLocaleString()}</Text></div>
          <div><Text type='secondary'>{t('积分收益')}：</Text><Text strong style={{ color: 'var(--semi-color-success)', fontSize: 16 }}>{record.total_points?.toFixed(4)} SOL</Text></div>
          <div><Text type='secondary'>{t('积分账号')}：</Text><Text style={{ fontFamily: 'monospace', fontSize: 13 }}>{record.solana_address || t('未创建')}</Text></div>
          <Banner type='warning' description={t('此操作不可撤销，积分将从国库转入用户钱包。')} style={{ marginTop: 12 }} />
        </div>
      ),
      onOk: async () => {
        try {
          const res = await API.post(`/api/treasury/settlement/${record.id}/settle`);
          const { success, message } = res.data;
          if (success) {
            Toast.success(t('积分已转入'));
            fetchOrders(page, statusFilter);
          } else {
            showError(message);
          }
        } catch (_e) {
          showError(t('操作失败'));
        }
      },
    });
  };

  const handlePageChange = (p) => {
    setPage(p);
    fetchOrders(p, statusFilter);
  };

  const columns = [
    {
      title: t('结算单号'),
      dataIndex: 'order_no',
      key: 'order_no',
      render: (v) => <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</Text>,
    },
    {
      title: t('用户'),
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: t('总 Token'),
      dataIndex: 'total_tokens',
      key: 'total_tokens',
      render: (v) => v?.toLocaleString() || '0',
    },
    {
      title: t('积分收益') + ' (SOL)',
      dataIndex: 'total_points',
      key: 'total_points',
      render: (v) => <Text strong>{v?.toFixed(4) || '0.0000'}</Text>,
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      render: (v) => {
        const info = statusMap[v] || { color: 'grey', key: '未知' };
        return <Tag color={info.color}>{t(info.key)}</Tag>;
      },
    },
    {
      title: t('审核人'),
      dataIndex: 'reviewer_name',
      key: 'reviewer_name',
      render: (v) => v || '—',
    },
    {
      title: t('审核意见'),
      dataIndex: 'review_message',
      key: 'review_message',
      render: (v) => v ? <Text type='danger' size='small'>{v}</Text> : '—',
    },
    {
      title: t('创建时间'),
      dataIndex: 'created_time',
      key: 'created_time',
      render: (v) => v ? new Date(v * 1000).toLocaleString() : '—',
    },
    {
      title: t('操作'),
      key: 'action',
      width: 140,
      render: (_t, record) => {
        if (record.status === 1) {
          // Reviewing → approve or reject
          return (
            <div style={{ display: 'flex', gap: 4 }}>
              <Tooltip content={t('通过')}>
                <Button
                  icon={<Check size={14} />}
                  size='small'
                  theme='light'
                  type='primary'
                  onClick={() => handleApprove(record.id)}
                />
              </Tooltip>
              <Tooltip content={t('驳回')}>
                <Button
                  icon={<X size={14} />}
                  size='small'
                  theme='light'
                  type='danger'
                  onClick={() => setRejectModal({ visible: true, orderId: record.id, reason: '' })}
                />
              </Tooltip>
            </div>
          );
        }
        if (record.status === 2) {
          // Settling → transfer points
          return (
            <Tooltip content={t('转入积分')}>
              <Button
                icon={<Send size={14} />}
                size='small'
                theme='solid'
                type='primary'
                onClick={() => handleSettle(record)}
              />
            </Tooltip>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Select
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          style={{ width: 160 }}
          size='small'
        >
          <Select.Option value=''>{t('全部状态')}</Select.Option>
          <Select.Option value='1'>{t('审核中')}</Select.Option>
          <Select.Option value='2'>{t('结算中')}</Select.Option>
          <Select.Option value='3'>{t('结算完成')}</Select.Option>
          <Select.Option value='4'>{t('驳回')}</Select.Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey='id'
        loading={loading}
        pagination={{
          currentPage: page,
          pageSize: 10,
          total,
          onPageChange: handlePageChange,
        }}
      />

      {/* Reject Modal */}
      <Modal
        title={t('驳回结算单')}
        visible={rejectModal.visible}
        onCancel={() => setRejectModal({ visible: false, orderId: null, reason: '' })}
        onOk={handleReject}
        okText={t('确认驳回')}
        cancelText={t('取消')}
      >
        <TextArea
          placeholder={t('请输入驳回原因')}
          value={rejectModal.reason}
          onChange={(v) => setRejectModal((prev) => ({ ...prev, reason: v }))}
          rows={3}
        />
      </Modal>
    </div>
  );
}
