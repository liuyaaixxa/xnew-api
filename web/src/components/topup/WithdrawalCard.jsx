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
  Avatar,
  Typography,
  Card,
  Button,
  Table,
  Modal,
  Select,
  Space,
  Toast,
  Spin,
  Empty,
} from '@douyinfe/semi-ui';
import { Wallet, TrendingUp, Clock, Banknote, ArrowRightCircle, RefreshCw } from 'lucide-react';
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
    0: { text: t('新建'), color: 'grey' },
    1: { text: t('提现中'), color: 'orange' },
    2: { text: t('成功'), color: 'green' },
    3: { text: t('失败'), color: 'red' },
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
      render: (text) => renderQuota(text),
    },
    {
      title: t('实际金额'),
      dataIndex: 'actual_amount',
      render: (text) => renderQuota(text),
    },
    {
      title: t('提现渠道'),
      dataIndex: 'channel',
      render: (text) => channelMap[text] || text,
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      render: (text) => {
        const status = statusMap[text] || { text: t('未知'), color: 'grey' };
        return <Text type={status.color}>{status.text}</Text>;
      },
    },
    {
      title: t('创建时间'),
      dataIndex: 'created_at',
      render: (text) => new Date(text * 1000).toLocaleString(),
    },
  ];

  return (
    <Card className="!rounded-2xl shadow-sm border-0">
      {/* 卡片头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Avatar size="small" color="green" className="mr-3 shadow-md">
            <Banknote size={16} />
          </Avatar>
          <div>
            <Typography.Text className="text-lg font-medium">
              {t('提现管理')}
            </Typography.Text>
            <div className="text-xs">{t('个人渠道收益提现')}</div>
          </div>
        </div>
        <Button
          icon={<RefreshCw size={14} />}
          size="small"
          onClick={() => { fetchStats(); fetchRecords(); }}
        >
          {t('刷新')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* 统计数据卡片 */}
          <Card
            className="!rounded-xl w-full mb-4"
            cover={
              <div
                className="relative h-24"
                style={{
                  backgroundImage: `linear-gradient(135deg, #10b981 0%, #059669 100%)`,
                }}
              >
                <div className="relative z-10 h-full flex flex-col justify-between p-4">
                  <div className="flex justify-between items-center">
                    <Text strong style={{ color: 'white', fontSize: '16px' }}>
                      {t('提现总览')}
                    </Text>
                    <Button
                      type="primary"
                      theme="solid"
                      size="small"
                      disabled={!canWithdraw}
                      onClick={() => setWithdrawalModalVisible(true)}
                      className="!rounded-lg"
                      style={{
                        backgroundColor: canWithdraw ? '#fff' : 'rgba(255,255,255,0.3)',
                        color: canWithdraw ? '#059669' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <ArrowRightCircle size={12} className="mr-1" />
                      {t('去提现')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-2">
                    {/* 可提现 */}
                    <div className="text-center">
                      <div className="text-xl font-bold" style={{ color: 'white' }}>
                        {renderQuota(stats.withdrawable)}
                      </div>
                      <div className="flex items-center justify-center text-xs">
                        <Wallet size={12} className="mr-1" style={{ color: 'rgba(255,255,255,0.8)' }} />
                        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{t('可提现')}</Text>
                      </div>
                    </div>

                    {/* 提现中 */}
                    <div className="text-center">
                      <div className="text-xl font-bold" style={{ color: 'white' }}>
                        {renderQuota(stats.pending)}
                      </div>
                      <div className="flex items-center justify-center text-xs">
                        <Clock size={12} className="mr-1" style={{ color: 'rgba(255,255,255,0.8)' }} />
                        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{t('提现中')}</Text>
                      </div>
                    </div>

                    {/* 已提现 */}
                    <div className="text-center">
                      <div className="text-xl font-bold" style={{ color: 'white' }}>
                        {renderQuota(stats.withdrawn)}
                      </div>
                      <div className="flex items-center justify-center text-xs">
                        <TrendingUp size={12} className="mr-1" style={{ color: 'rgba(255,255,255,0.8)' }} />
                        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{t('已提现')}</Text>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          >
            <div className="text-center text-sm text-gray-500">
              {canWithdraw
                ? t('满足提现条件，可点击提现')
                : t(`最低提现额度: ${renderQuota(stats.min_amount)}`)}
            </div>
          </Card>

          {/* 提现记录列表 */}
          <Title heading={5} className="mb-2">{t('提现记录')}</Title>
          {recordsLoading ? (
            <div className="flex justify-center py-4">
              <Spin />
            </div>
          ) : records.length === 0 ? (
            <Empty description={t('暂无提现记录')} />
          ) : (
            <Table
              columns={columns}
              dataSource={records}
              pagination={{
                currentPage: page,
                pageSize: pageSize,
                total: totalRecords,
                onPageChange: (p) => setPage(p),
              }}
              rowKey="id"
            />
          )}
        </>
      )}

      {/* 提现确认弹窗 */}
      <Modal
        title={t('申请提现')}
        visible={withdrawalModalVisible}
        onCancel={() => setWithdrawalModalVisible(false)}
        footer={
          <Space>
            <Button onClick={() => setWithdrawalModalVisible(false)}>{t('取消')}</Button>
            <Button type="primary" onClick={handleWithdrawal}>{t('确认提现')}</Button>
          </Space>
        }
      >
        <div className="py-4">
          <div className="mb-4">
            <Text>{t('可提现金额')}: </Text>
            <Text strong>{renderQuota(stats.withdrawable)}</Text>
          </div>
          <div className="mb-4">
            <Text>{t('选择提现渠道')}: </Text>
            <Select
              value={selectedChannel}
              onChange={(value) => setSelectedChannel(value)}
              style={{ width: 200 }}
            >
              <Select.Option value="wechat">{t('微信')}</Select.Option>
              <Select.Option value="alipay">{t('支付宝')}</Select.Option>
            </Select>
          </div>
          <div className="text-xs text-gray-500">
            {t('提现申请提交后，将在1-3个工作日内处理')}
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default WithdrawalCard;