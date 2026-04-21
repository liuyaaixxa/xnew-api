import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Typography,
  Button,
  Spin,
  Table,
  Tag,
  Toast,
  Empty,
  Modal,
} from '@douyinfe/semi-ui';
import { Calculator, Send } from 'lucide-react';
import { API, showError } from '../../helpers';

const { Title, Text } = Typography;

const statusMap = {
  0: { color: 'blue', key: '新建' },
  1: { color: 'orange', key: '审核中' },
  2: { color: 'cyan', key: '结算中' },
  3: { color: 'green', key: '结算完成' },
  4: { color: 'red', key: '驳回' },
};

export default function SettlementTab() {
  const { t } = useTranslation();

  // Pending stats
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingData, setPendingData] = useState(null);
  const [applying, setApplying] = useState(false);

  // Orders
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await API.get('/api/user/settlement/pending');
      const { success, data } = res.data;
      if (success) {
        setPendingData(data);
      }
    } catch (_e) {
      showError(t('获取待结算信息失败'));
    } finally {
      setPendingLoading(false);
    }
  }, [t]);

  const fetchOrders = useCallback(async (page = 1) => {
    setOrdersLoading(true);
    try {
      const res = await API.get(`/api/user/settlement/orders?p=${page}&page_size=10`);
      const { success, data } = res.data;
      if (success) {
        setOrders(data.items || []);
        setOrdersTotal(data.total || 0);
      }
    } catch (_e) {
      showError(t('获取结算单列表失败'));
    } finally {
      setOrdersLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchPending();
    fetchOrders(1);
  }, [fetchPending, fetchOrders]);

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await API.post('/api/user/settlement/apply');
      const { success, message } = res.data;
      if (success) {
        Toast.success(t('结算申请已提交'));
        fetchPending();
        fetchOrders(1);
      } else {
        showError(message);
      }
    } catch (_e) {
      showError(t('申请结算失败'));
    } finally {
      setApplying(false);
    }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: t('确认删除'),
      content: t('确定要删除此结算单吗？'),
      onOk: async () => {
        try {
          const res = await API.delete(`/api/user/settlement/order/${id}`);
          const { success, message } = res.data;
          if (success) {
            Toast.success(t('结算单已删除'));
            fetchOrders(ordersPage);
          } else {
            showError(message);
          }
        } catch (_e) {
          showError(t('删除失败'));
        }
      },
    });
  };

  const handlePageChange = (page) => {
    setOrdersPage(page);
    fetchOrders(page);
  };

  // Pending stats table columns
  const pendingColumns = [
    {
      title: t('模型名称'),
      dataIndex: 'model_name',
      key: 'model_name',
    },
    {
      title: t('输入 Token'),
      dataIndex: 'prompt_tokens',
      key: 'prompt_tokens',
      render: (v) => v?.toLocaleString() || '0',
    },
    {
      title: t('输出 Token'),
      dataIndex: 'completion_tokens',
      key: 'completion_tokens',
      render: (v) => v?.toLocaleString() || '0',
    },
    {
      title: t('总 Token'),
      dataIndex: 'total_tokens',
      key: 'total_tokens',
      render: (v) => <Text strong>{v?.toLocaleString() || '0'}</Text>,
    },
    {
      title: t('积分收益') + ' (SOL)',
      dataIndex: 'points',
      key: 'points',
      render: (v) => <Text type='success'>{v?.toFixed(4) || '0.0000'}</Text>,
    },
  ];

  // Order table columns
  const orderColumns = [
    {
      title: t('结算单号'),
      dataIndex: 'order_no',
      key: 'order_no',
      render: (v) => <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</Text>,
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
      render: (_t, record) => {
        if (record.status === 0) {
          return (
            <Button size='small' type='danger' theme='light' onClick={() => handleDelete(record.id)}>
              {t('删除')}
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 960 }}>
      {/* Pending Settlement */}
      <Title heading={5} style={{ marginBottom: 16 }}>
        <Calculator size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        {t('待结算')}
      </Title>

      {pendingLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : !pendingData || !pendingData.stats || pendingData.stats.length === 0 ? (
        <Card style={{ marginBottom: 24 }}>
          <Empty title={t('暂无待结算的 Token 消耗')} style={{ padding: 24 }} />
        </Card>
      ) : (
        <Card style={{ marginBottom: 24 }}>
          <Table
            columns={pendingColumns}
            dataSource={pendingData.stats}
            rowKey='model_name'
            pagination={false}
            size='small'
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
            padding: '12px 0',
            borderTop: '1px solid var(--semi-color-border)',
          }}>
            <div>
              <Text type='secondary'>{t('合计')}: </Text>
              <Text strong style={{ fontSize: 18 }}>
                {pendingData.total_tokens?.toLocaleString()} Token
              </Text>
              <Text type='secondary' style={{ marginLeft: 16 }}>{t('积分收益')}: </Text>
              <Text strong style={{ fontSize: 18, color: 'var(--semi-color-success)' }}>
                {pendingData.total_points?.toFixed(4)} SOL
              </Text>
              <Text type='tertiary' size='small' style={{ marginLeft: 8 }}>
                ({t('汇率')}: {pendingData.rate?.toLocaleString()} Token = 1 SOL)
              </Text>
            </div>
            <Button
              icon={<Send size={14} />}
              type='primary'
              theme='solid'
              loading={applying}
              onClick={handleApply}
            >
              {t('申请结算')}
            </Button>
          </div>
        </Card>
      )}

      {/* Historical Orders */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title heading={5} style={{ margin: 0 }}>
          {t('结算记录')}
        </Title>
        {pendingData && (
          <div>
            <Text type='secondary'>{t('历史累计收益')}: </Text>
            <Text strong style={{ color: 'var(--semi-color-success)' }}>
              {pendingData.historical_points?.toFixed(4) || '0.0000'} SOL
            </Text>
          </div>
        )}
      </div>

      <Table
        columns={orderColumns}
        dataSource={orders}
        rowKey='id'
        loading={ordersLoading}
        pagination={{
          currentPage: ordersPage,
          pageSize: 10,
          total: ordersTotal,
          onPageChange: handlePageChange,
        }}
        empty={<Empty title={t('暂无结算记录')} />}
      />
    </div>
  );
}
