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
import {
  Typography,
  Card,
  Button,
  Table,
  Modal,
  Select,
  Tag,
  Toast,
  Spin,
  Empty,
} from '@douyinfe/semi-ui';
import { Wallet, TrendingUp, Clock, Banknote, ArrowRightCircle, RefreshCw, AlertCircle, CheckCircle2, XCircle, Circle } from 'lucide-react';
const { Text, Title } = Typography;

const WithdrawalCard = ({ t, renderQuota, userState }) => {
  const [stats, setStats] = useState({
    withdrawable: 0,
    withdrawn: 0,
    pending: 0,
    min_amount: 500000,
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('wechat');
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const pageSize = 10;

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/user/withdrawal/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('获取提现统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/user/withdrawal/records?page=${page}&page_size=${pageSize}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data.records);
        setTotalRecords(data.data.total);
      }
    } catch (error) {
      console.error('获取提现记录失败:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecords();
  }, [page]);

  const handleWithdrawal = async () => {
    try {
      const res = await fetch('/api/user/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: selectedChannel }),
      });
      const data = await res.json();
      if (data.success) {
        Toast.success(t('提现申请已提交'));
        setWithdrawalModalVisible(false);
        fetchStats();
        fetchRecords();
      } else {
        Toast.error(data.message || t('提现申请失败'));
      }
    } catch (error) {
      Toast.error(t('提现申请失败'));
    }
  };

  const canWithdraw = stats.withdrawable >= stats.min_amount;

  const statusMap = {
    0: { text: t('新建'), color: 'grey', icon: <Circle size={12} /> },
    1: { text: t('提现中'), color: 'orange', icon: <Clock size={12} /> },
    2: { text: t('成功'), color: 'green', icon: <CheckCircle2 size={12} /> },
    3: { text: t('失败'), color: 'red', icon: <XCircle size={12} /> },
  };

  const channelMap = {
    wechat: t('微信'),
    alipay: t('支付宝'),
  };

  const columns = [
    {
      title: t('ID'),
      dataIndex: 'id',
      width: 60,
    },
    {
      title: t('提现金额'),
      dataIndex: 'amount',
      render: (text) => <Text strong>{renderQuota(text)}</Text>,
    },
    {
      title: t('实际金额'),
      dataIndex: 'actual_amount',
      render: (text) => renderQuota(text),
    },
    {
      title: t('提现渠道'),
      dataIndex: 'channel',
      width: 90,
      render: (text) => (
        <Text className='text-slate-600 dark:text-slate-400'>
          {channelMap[text] || text}
        </Text>
      ),
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      width: 90,
      render: (text) => {
        const status = statusMap[text] || { text: t('未知'), color: 'grey', icon: <Circle size={12} /> };
        return (
          <Tag
            color={status.color}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '6px',
              fontWeight: 500,
            }}
          >
            {status.icon}
            {status.text}
          </Tag>
        );
      },
    },
    {
      title: t('创建时间'),
      dataIndex: 'created_at',
      render: (text) => (
        <Text className='text-slate-500 dark:text-slate-400' size='small'>
          {new Date(text * 1000).toLocaleString()}
        </Text>
      ),
    },
  ];

  return (
    <Card className='!rounded-2xl border-0' bodyStyle={{ padding: '28px 32px' }}>
      {/* 卡片头部 */}
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-4'>
          <div
            className='flex items-center justify-center w-11 h-11 rounded-xl'
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            }}
          >
            <Banknote size={20} color='#fff' />
          </div>
          <div>
            <Text className='text-lg font-semibold text-slate-900 dark:text-slate-100'>
              {t('提现管理')}
            </Text>
            <div className='text-sm text-slate-500 dark:text-slate-400'>
              {t('个人渠道收益提现')}
            </div>
          </div>
        </div>
        <Button
          icon={<RefreshCw size={14} />}
          size='small'
          theme='borderless'
          onClick={() => { fetchStats(); fetchRecords(); }}
        >
          {t('刷新')}
        </Button>
      </div>

      {loading ? (
        <div className='flex justify-center py-16'>
          <Spin size='large' />
        </div>
      ) : (
        <>
          {/* 统计数据卡片 */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8'>
            {/* 可提现 */}
            <div
              className='relative overflow-hidden rounded-xl p-5'
              style={{
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              }}
            >
              <div className='flex items-start justify-between'>
                <div>
                  <div className='flex items-center gap-1.5 mb-2.5'>
                    <div className='w-6 h-6 rounded-md bg-white/70 flex items-center justify-center'>
                      <Wallet size={13} color='#10b981' />
                    </div>
                    <Text className='text-xs text-emerald-700'>{t('可提现')}</Text>
                  </div>
                  <div className='text-xl font-bold text-emerald-800 tracking-tight'>
                    {renderQuota(stats.withdrawable)}
                  </div>
                </div>
              </div>
            </div>

            {/* 提现中 */}
            <div
              className='relative overflow-hidden rounded-xl p-5'
              style={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
              }}
            >
              <div className='flex items-start justify-between'>
                <div>
                  <div className='flex items-center gap-1.5 mb-2.5'>
                    <div className='w-6 h-6 rounded-md bg-white/70 flex items-center justify-center'>
                      <Clock size={13} color='#f97316' />
                    </div>
                    <Text className='text-xs text-orange-700'>{t('提现中')}</Text>
                  </div>
                  <div className='text-xl font-bold text-orange-800 tracking-tight'>
                    {renderQuota(stats.pending)}
                  </div>
                </div>
              </div>
            </div>

            {/* 已提现 */}
            <div
              className='relative overflow-hidden rounded-xl p-5'
              style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              }}
            >
              <div className='flex items-start justify-between'>
                <div>
                  <div className='flex items-center gap-1.5 mb-2.5'>
                    <div className='w-6 h-6 rounded-md bg-white/70 flex items-center justify-center'>
                      <TrendingUp size={13} color='#3b82f6' />
                    </div>
                    <Text className='text-xs text-blue-700'>{t('已提现')}</Text>
                  </div>
                  <div className='text-xl font-bold text-blue-800 tracking-tight'>
                    {renderQuota(stats.withdrawn)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 提现提示 + 按钮 */}
          <div
            className='rounded-xl p-4 mb-8 flex items-center justify-between'
            style={{
              background: canWithdraw
                ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)'
                : 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
              border: canWithdraw
                ? '1px solid rgba(16, 185, 129, 0.15)'
                : '1px solid rgba(234, 179, 8, 0.2)',
            }}
          >
            <div className='flex items-center gap-3'>
              <div
                className='w-8 h-8 rounded-lg flex items-center justify-center'
                style={{
                  background: canWithdraw
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(234, 179, 8, 0.1)',
                }}
              >
                {canWithdraw ? (
                  <CheckCircle2 size={16} color='#059669' />
                ) : (
                  <AlertCircle size={16} color='#ca8a04' />
                )}
              </div>
              <Text
                className='text-sm'
                style={{ color: canWithdraw ? '#065f46' : '#854d0e' }}
              >
                {canWithdraw
                  ? t('满足提现条件，可点击提现')
                  : t(`最低提现额度: ${renderQuota(stats.min_amount)}`)}
              </Text>
            </div>
            <Button
              theme='solid'
              size='default'
              disabled={!canWithdraw}
              onClick={() => setWithdrawalModalVisible(true)}
              icon={<ArrowRightCircle size={15} />}
              style={{
                background: canWithdraw
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : undefined,
                borderRadius: '10px',
                boxShadow: canWithdraw
                  ? '0 2px 10px rgba(16, 185, 129, 0.35)'
                  : 'none',
              }}
            >
              {t('去提现')}
            </Button>
          </div>

          {/* 提现记录列表 */}
          <div className='flex items-center justify-between mb-4'>
            <Title heading={5} className='!mb-0'>{t('提现记录')}</Title>
          </div>
          {recordsLoading ? (
            <div className='flex justify-center py-8'>
              <Spin />
            </div>
          ) : records.length === 0 ? (
            <div className='py-12'>
              <Empty description={t('暂无提现记录')} />
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={records}
              pagination={{
                currentPage: page,
                pageSize: pageSize,
                total: totalRecords,
                onPageChange: (p) => setPage(p),
                showSizeChanger: false,
              }}
              rowKey='id'
              className='withdrawal-table'
            />
          )}
        </>
      )}

      {/* 提现确认弹窗 */}
      <Modal
        title={
          <div className='flex items-center gap-2'>
            <div
              className='w-8 h-8 rounded-lg flex items-center justify-center'
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
              }}
            >
              <Banknote size={14} color='#fff' />
            </div>
            <span>{t('申请提现')}</span>
          </div>
        }
        visible={withdrawalModalVisible}
        onCancel={() => setWithdrawalModalVisible(false)}
        footer={
          <div className='flex gap-3 justify-end'>
            <Button
              theme='borderless'
              onClick={() => setWithdrawalModalVisible(false)}
            >
              {t('取消')}
            </Button>
            <Button
              type='primary'
              theme='solid'
              onClick={handleWithdrawal}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
              }}
            >
              {t('确认提现')}
            </Button>
          </div>
        }
        centered
        width={420}
      >
        <div className='py-6 space-y-5'>
          <div className='rounded-xl p-5' style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
            <Text className='text-sm text-emerald-700'>{t('可提现金额')}</Text>
            <div className='text-2xl font-bold text-emerald-800 mt-1 tracking-tight'>
              {renderQuota(stats.withdrawable)}
            </div>
          </div>
          <div>
            <Text className='text-sm text-slate-600 dark:text-slate-400 mb-2 block'>
              {t('选择提现渠道')}
            </Text>
            <Select
              value={selectedChannel}
              onChange={(value) => setSelectedChannel(value)}
              style={{ width: '100%' }}
              size='large'
            >
              <Select.Option value='wechat'>{t('微信')}</Select.Option>
              <Select.Option value='alipay'>{t('支付宝')}</Select.Option>
            </Select>
          </div>
          <div
            className='rounded-lg p-3 flex items-center gap-2'
            style={{ background: 'rgba(100, 116, 139, 0.06)' }}
          >
            <AlertCircle size={14} color='#94a3b8' />
            <Text className='text-xs text-slate-500'>
              {t('提现申请提交后，将在1-3个工作日内处理')}
            </Text>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default WithdrawalCard;