/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Modal,
  Table,
  Tag,
  Toast,
  Typography,
  Input,
  Empty,
  Space,
  Banner,
} from '@douyinfe/semi-ui';
import { Coins, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API, timestamp2string } from '../../helpers';

const { Text } = Typography;
const { TextArea } = Input;

// Status-to-badge mapping kept intentionally small. We only expect
// pending_review rows here, but falling back to the raw value keeps
// the UI honest if a row leaks in from another status.
const STATUS_CONFIG = {
  pending_review: { color: 'orange', key: '审核中' },
};

const PAYMENT_METHOD_MAP = {
  stripe: 'Stripe',
  creem: 'Creem',
  waffo: 'Waffo',
  alipay: '支付宝',
  wxpay: '微信',
};

export default function PendingReviewTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadRecords = useCallback(
    async (currentPage = page, currentPageSize = pageSize) => {
      setLoading(true);
      try {
        const res = await API.get(
          `/api/user/topup/pending-review?p=${currentPage}&page_size=${currentPageSize}`,
        );
        const { success, message, data } = res.data;
        if (success) {
          setRecords(data.items || []);
          setTotal(data.total || 0);
        } else {
          Toast.error({ content: message || t('加载失败') });
        }
      } catch (e) {
        Toast.error({ content: t('加载失败') });
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, t],
  );

  useEffect(() => {
    loadRecords(page, pageSize);
  }, [page, pageSize, loadRecords]);

  // Approve handler: hits the admin endpoint, surfaces server-side
  // transition errors (e.g. CAS failure on concurrent approval) via Toast.
  const handleApprove = async (tradeNo) => {
    try {
      const res = await API.post('/api/user/topup/approve', {
        trade_no: tradeNo,
      });
      const { success, message } = res.data;
      if (success) {
        Toast.success({ content: t('审核通过，已入账') });
        await loadRecords(page, pageSize);
      } else {
        Toast.error({ content: message || t('审核失败') });
      }
    } catch (e) {
      Toast.error({ content: t('审核失败') });
    }
  };

  const confirmApprove = (record) => {
    Modal.confirm({
      title: t('确认审核通过'),
      content: (
        <div>
          <div>
            {t('用户')}: <Text strong>{record.user_id}</Text>
          </div>
          <div>
            {t('订单号')}:{' '}
            <Text copyable style={{ marginLeft: 4 }}>
              {record.trade_no}
            </Text>
          </div>
          <div>
            {t('金额')}:{' '}
            <Text type='danger'>
              ${Number(record.money || 0).toFixed(2)}
            </Text>
          </div>
          <div style={{ marginTop: 12, color: '#f59e0b' }}>
            {t('通过后将立即给用户账户加上对应额度，此操作不可撤销。')}
          </div>
        </div>
      ),
      onOk: () => handleApprove(record.trade_no),
    });
  };

  const handleReject = async (tradeNo, reason) => {
    try {
      const res = await API.post('/api/user/topup/reject', {
        trade_no: tradeNo,
        reason: reason || '',
      });
      const { success, message } = res.data;
      if (success) {
        Toast.success({ content: t('已拒绝') });
        await loadRecords(page, pageSize);
      } else {
        Toast.error({ content: message || t('操作失败') });
      }
    } catch (e) {
      Toast.error({ content: t('操作失败') });
    }
  };

  const confirmReject = (record) => {
    // Mutate a plain variable via onChange — Semi's Modal.confirm doesn't
    // accept controlled children easily, so this ref-style capture keeps
    // the UX simple without useState inside the modal body.
    let reason = '';
    Modal.confirm({
      title: t('拒绝充值审核'),
      content: (
        <div>
          <div style={{ marginBottom: 8 }}>
            {t('订单号')}:{' '}
            <Text copyable>{record.trade_no}</Text>
          </div>
          <div style={{ marginBottom: 8 }}>
            {t('金额')}:{' '}
            <Text type='danger'>
              ${Number(record.money || 0).toFixed(2)}
            </Text>
          </div>
          <div style={{ marginBottom: 4 }}>
            {t('请输入拒绝原因（会写入用户可见日志）：')}
          </div>
          <TextArea
            rows={3}
            placeholder={t('例如：金额异常，疑似伪造回调')}
            onChange={(v) => {
              reason = v;
            }}
          />
        </div>
      ),
      onOk: () => handleReject(record.trade_no, reason),
    });
  };

  const columns = [
    {
      title: t('订单号'),
      dataIndex: 'trade_no',
      key: 'trade_no',
      render: (text) => <Text copyable>{text}</Text>,
    },
    {
      title: t('用户 ID'),
      dataIndex: 'user_id',
      key: 'user_id',
      width: 100,
    },
    {
      title: t('支付方式'),
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 120,
      render: (pm) => {
        const name = PAYMENT_METHOD_MAP[pm];
        return <Text>{name ? t(name) : pm || '-'}</Text>;
      },
    },
    {
      title: t('充值额度'),
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (amount) => (
        <span className='flex items-center gap-1'>
          <Coins size={16} />
          <Text>{amount}</Text>
        </span>
      ),
    },
    {
      title: t('支付金额'),
      dataIndex: 'money',
      key: 'money',
      width: 120,
      render: (money) => (
        <Text type='danger'>${Number(money || 0).toFixed(2)}</Text>
      ),
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const cfg = STATUS_CONFIG[status] || { color: 'grey', key: status };
        return <Tag color={cfg.color}>{t(cfg.key)}</Tag>;
      },
    },
    {
      title: t('创建时间'),
      dataIndex: 'create_time',
      key: 'create_time',
      width: 180,
      render: (t) => timestamp2string(t),
    },
    {
      title: t('操作'),
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            size='small'
            type='primary'
            theme='solid'
            onClick={() => confirmApprove(record)}
          >
            {t('通过')}
          </Button>
          <Button
            size='small'
            type='danger'
            theme='outline'
            onClick={() => confirmReject(record)}
          >
            {t('拒绝')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Banner
        type='info'
        description={t(
          '大额充值订单默认不自动到账，需管理员审核后才会为用户加上额度。阈值可在「系统设置 → 支付设置 → 回调安全设置」调整。',
        )}
        bordered
        closeIcon={null}
        style={{ marginBottom: 16 }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text strong>
          {t('待审核订单')} ({total})
        </Text>
        <Button
          icon={<RefreshCw size={14} />}
          size='small'
          onClick={() => loadRecords(page, pageSize)}
        >
          {t('刷新')}
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={records}
        loading={loading}
        rowKey='id'
        empty={<Empty description={t('暂无待审核订单')} />}
        pagination={{
          currentPage: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOpts: [10, 20, 50, 100],
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }}
        size='small'
      />
    </div>
  );
}
