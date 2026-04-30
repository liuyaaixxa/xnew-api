/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Tag,
  Typography,
  Input,
  Toast,
  Empty,
  Button,
  Modal,
} from '@douyinfe/semi-ui';
import { IconSearch } from '@douyinfe/semi-icons';
import { Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API, timestamp2string } from '../../helpers';

const { Text } = Typography;

const STATUS_CONFIG = {
  success: { color: 'green', key: '成功' },
  completed: { color: 'green', key: '已完成' },
  pending: { color: 'orange', key: '待支付' },
  pending_review: { color: 'orange', key: '审核中' },
  rejected: { color: 'red', key: '已拒绝' },
  refunded: { color: 'red', key: '已退款' },
  failed: { color: 'red', key: '失败' },
  expired: { color: 'red', key: '已过期' },
};

const PAYMENT_METHOD_MAP = {
  stripe: 'Stripe',
  creem: 'Creem',
  waffo: 'Waffo',
  alipay: '支付宝',
  wxpay: '微信',
};

export default function AllOrdersTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');

  const load = useCallback(
    async (currentPage = page, currentPageSize = pageSize, kw = keyword) => {
      setLoading(true);
      try {
        const qs =
          `p=${currentPage}&page_size=${currentPageSize}` +
          (kw ? `&keyword=${encodeURIComponent(kw)}` : '');
        const res = await API.get(`/api/user/topup?${qs}`);
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
    [page, pageSize, keyword, t],
  );

  useEffect(() => {
    load(page, pageSize, keyword);
  }, [page, pageSize, keyword, load]);

  // Manual completion is kept here because the old TopupHistoryModal's
  // admin-only button lived alongside the listing — moving it here keeps
  // the capability available without cluttering the user-facing modal.
  const handleAdminComplete = async (tradeNo) => {
    try {
      const res = await API.post('/api/user/topup/complete', {
        trade_no: tradeNo,
      });
      const { success, message } = res.data;
      if (success) {
        Toast.success({ content: t('补单成功') });
        await load(page, pageSize, keyword);
      } else {
        Toast.error({ content: message || t('补单失败') });
      }
    } catch (e) {
      Toast.error({ content: t('补单失败') });
    }
  };

  const confirmAdminComplete = (tradeNo) => {
    Modal.confirm({
      title: t('确认补单'),
      content: t('是否将该订单标记为成功并为用户入账？'),
      onOk: () => handleAdminComplete(tradeNo),
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
      width: 120,
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
      width: 110,
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
      render: (ts) => timestamp2string(ts),
    },
    {
      title: t('操作'),
      key: 'action',
      width: 100,
      render: (_, record) => {
        if (record.status === 'pending') {
          return (
            <Button
              size='small'
              type='primary'
              theme='outline'
              onClick={() => confirmAdminComplete(record.trade_no)}
            >
              {t('补单')}
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Input
          prefix={<IconSearch />}
          placeholder={t('按订单号搜索')}
          value={keyword}
          onChange={(v) => {
            setPage(1);
            setKeyword(v);
          }}
          showClear
          style={{ maxWidth: 360 }}
        />
      </div>
      <Table
        columns={columns}
        dataSource={records}
        loading={loading}
        rowKey='id'
        empty={<Empty description={t('暂无订单')} />}
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
