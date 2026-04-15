import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  Typography,
  Spin,
  Banner,
  Tag,
  Button,
  Table,
  Modal,
  InputNumber,
  Select,
  Toast,
  SideSheet,
  Empty,
  Tooltip,
  TabPane,
  Tabs,
} from '@douyinfe/semi-ui';
import { Landmark, Copy, RefreshCw, Send, FileText, ClipboardList, Calculator } from 'lucide-react';
import { API, showError } from '../../helpers';
import SettlementAuditTab from './SettlementAuditTab';

const { Title, Text, Paragraph } = Typography;

function TreasuryContent() {
  const { t } = useTranslation();

  // Treasury card state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [treasury, setTreasury] = useState(null);

  // User accounts table state
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [walletFilter, setWalletFilter] = useState('all');

  // Transfer modal state
  const [transferModal, setTransferModal] = useState({
    visible: false,
    user: null,
    amount: 0,
    loading: false,
  });

  // Transaction drawer state
  const [txDrawer, setTxDrawer] = useState({
    visible: false,
    user: null,
    loading: false,
    transactions: [],
  });

  // Operation log drawer state
  const [logDrawer, setLogDrawer] = useState({
    visible: false,
    user: null,
    loading: false,
    logs: [],
  });

  const fetchTreasury = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await API.get('/api/treasury/');
      const { success, data, message } = res.data;
      if (success) {
        setTreasury(data);
      } else {
        showError(message || t('获取国库信息失败'));
      }
    } catch (e) {
      showError(t('获取国库信息失败'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  const fetchUsers = useCallback(async (page = 1, filter = walletFilter) => {
    setUsersLoading(true);
    try {
      const res = await API.get(`/api/treasury/users?p=${page}&page_size=10&wallet_status=${filter}`);
      const { success, data, message } = res.data;
      if (success) {
        setUsers(data.items || []);
        setUsersTotal(data.total || 0);
      } else {
        showError(message || t('获取用户列表失败'));
      }
    } catch (e) {
      showError(t('获取用户列表失败'));
    } finally {
      setUsersLoading(false);
    }
  }, [walletFilter, t]);

  useEffect(() => {
    fetchTreasury();
  }, [fetchTreasury]);

  useEffect(() => {
    if (treasury) {
      fetchUsers(1, walletFilter);
    }
  }, [treasury, walletFilter]);

  const copyAddress = () => {
    if (treasury?.address) {
      navigator.clipboard.writeText(treasury.address);
      Toast.success(t('已复制到剪贴板'));
    }
  };

  const handleFilterChange = (value) => {
    setWalletFilter(value);
    setUsersPage(1);
  };

  const handlePageChange = (page) => {
    setUsersPage(page);
    fetchUsers(page, walletFilter);
  };

  const handleRefreshUsers = () => {
    fetchUsers(usersPage, walletFilter);
  };

  const openTransferModal = (user) => {
    setTransferModal({
      visible: true,
      user,
      amount: 0,
      loading: false,
    });
  };

  const closeTransferModal = () => {
    setTransferModal({
      visible: false,
      user: null,
      amount: 0,
      loading: false,
    });
  };

  const openTxDrawer = async (user) => {
    setTxDrawer({ visible: true, user, loading: true, transactions: [] });
    try {
      const res = await API.get(`/api/treasury/transactions?address=${user.solana_address}`);
      const { success, data } = res.data;
      if (success) {
        setTxDrawer((prev) => ({ ...prev, loading: false, transactions: data || [] }));
      } else {
        setTxDrawer((prev) => ({ ...prev, loading: false }));
      }
    } catch (_e) {
      setTxDrawer((prev) => ({ ...prev, loading: false }));
    }
  };

  const closeTxDrawer = () => {
    setTxDrawer({ visible: false, user: null, loading: false, transactions: [] });
  };

  const openLogDrawer = async (user) => {
    setLogDrawer({ visible: true, user, loading: true, logs: [] });
    try {
      const res = await API.get(`/api/treasury/logs?user_id=${user.id}`);
      const { success, data } = res.data;
      if (success) {
        setLogDrawer((prev) => ({ ...prev, loading: false, logs: data || [] }));
      } else {
        setLogDrawer((prev) => ({ ...prev, loading: false }));
      }
    } catch (_e) {
      setLogDrawer((prev) => ({ ...prev, loading: false }));
    }
  };

  const closeLogDrawer = () => {
    setLogDrawer({ visible: false, user: null, loading: false, logs: [] });
  };

  const handleTransfer = async () => {
    if (!transferModal.user || !transferModal.amount) return;

    setTransferModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await API.post('/api/treasury/transfer', {
        user_id: transferModal.user.id,
        amount: transferModal.amount,
      });
      const { success, message } = res.data;
      if (success) {
        Toast.success(t('转账成功'));
        closeTransferModal();
        fetchUsers(usersPage, walletFilter);
        fetchTreasury(true);
      } else {
        showError(message || t('转账失败'));
        setTransferModal((prev) => ({ ...prev, loading: false }));
      }
    } catch (e) {
      showError(t('转账失败'));
      setTransferModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const truncateAddress = (address) => {
    if (!address || address.length <= 12) return address || '';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const columns = [
    {
      title: t('用户名'),
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: t('用户ID'),
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: t('钱包地址'),
      dataIndex: 'solana_address',
      key: 'solana_address',
      render: (text) =>
        text ? (
          <Text style={{ fontFamily: 'monospace', fontSize: 13 }}>{text}</Text>
        ) : (
          <Text type='tertiary'>—</Text>
        ),
    },
    {
      title: t('钱包余额'),
      key: 'balance',
      render: (_text, record) =>
        record.solana_address ? (
          <Text>{Number(record.balance).toFixed(4)} SOL</Text>
        ) : (
          <Text type='tertiary'>—</Text>
        ),
    },
    {
      title: t('创建时间'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) =>
        text ? (
          <Text size='small'>{new Date(text * 1000).toLocaleString()}</Text>
        ) : (
          <Text type='tertiary'>—</Text>
        ),
    },
    {
      title: t('操作'),
      key: 'action',
      width: 120,
      render: (_text, record) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Tooltip content={t('转入')}>
            <Button
              icon={<Send size={14} />}
              size='small'
              theme='light'
              type='primary'
              disabled={!record.solana_address}
              onClick={() => openTransferModal(record)}
            />
          </Tooltip>
          <Tooltip content={t('交易明细')}>
            <Button
              icon={<FileText size={14} />}
              size='small'
              theme='light'
              disabled={!record.solana_address}
              onClick={() => openTxDrawer(record)}
            />
          </Tooltip>
          <Tooltip content={t('操作日志')}>
            <Button
              icon={<ClipboardList size={14} />}
              size='small'
              theme='light'
              onClick={() => openLogDrawer(record)}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className='' style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size='large' />
      </div>
    );
  }

  if (!treasury) {
    return (
      <div className='' style={{ padding: '24px' }}>
        <Banner
          type='warning'
          description={t('国库地址未配置，请在系统设置中配置 Openfort 国库地址')}
        />
      </div>
    );
  }

  const clusterLabel = {
    devnet: 'Devnet',
    testnet: 'Testnet',
    'mainnet-beta': 'Mainnet',
    mainnet: 'Mainnet',
  }[treasury.cluster] || treasury.cluster;

  const clusterColor = treasury.cluster === 'mainnet' || treasury.cluster === 'mainnet-beta'
    ? 'green'
    : 'orange';

  return (
    <div className='' style={{ padding: '24px' }}>
      {/* Treasury Card */}
      <div style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <Title heading={4} style={{ margin: 0 }}>
            <Landmark size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            {t('积分管理')}
          </Title>
          <Button
            icon={<RefreshCw size={14} />}
            loading={refreshing}
            onClick={() => fetchTreasury(true)}
            theme='borderless'
            type='tertiary'
          >
            {t('刷新')}
          </Button>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Text type='secondary' size='small'>{t('国库地址')}</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Paragraph
                copyable={false}
                style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  wordBreak: 'break-all',
                  margin: 0,
                  flex: 1,
                }}
              >
                {treasury.address}
              </Paragraph>
              <Button
                icon={<Copy size={14} />}
                size='small'
                theme='borderless'
                onClick={copyAddress}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text type='secondary' size='small'>{t('国库余额')}</Text>
            <div style={{ marginTop: 4 }}>
              <Text strong style={{ fontSize: 28 }}>
                {treasury.balance.toFixed(4)}
              </Text>
              <Text type='secondary' style={{ marginLeft: 8, fontSize: 16 }}>SOL</Text>
            </div>
          </div>

          <div>
            <Text type='secondary' size='small'>{t('Solana 集群')}</Text>
            <div style={{ marginTop: 4 }}>
              <Tag color={clusterColor}>{clusterLabel}</Tag>
            </div>
          </div>
        </Card>
      </div>

      {/* User Accounts Section */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title heading={5} style={{ margin: 0 }}>
              {t('用户区块链账号')}
            </Title>
            <Button
              icon={<RefreshCw size={14} />}
              loading={usersLoading}
              onClick={handleRefreshUsers}
              theme='borderless'
              type='tertiary'
              size='small'
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Select
              value={walletFilter}
              onChange={handleFilterChange}
              style={{ width: 160 }}
              size='small'
            >
              <Select.Option value='all'>{t('全部用户')}</Select.Option>
              <Select.Option value='has_wallet'>{t('有钱包')}</Select.Option>
            </Select>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey='id'
          pagination={{
            currentPage: usersPage,
            pageSize: 10,
            total: usersTotal,
            onPageChange: handlePageChange,
          }}
          loading={usersLoading}
        />
      </div>

      {/* Transfer Modal */}
      <Modal
        title={
          transferModal.user
            ? `${t('转入 SOL')} — ${transferModal.user.username}`
            : t('转入 SOL')
        }
        visible={transferModal.visible}
        onCancel={closeTransferModal}
        maskClosable={false}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeTransferModal} type='tertiary'>
              {t('取消')}
            </Button>
            <Button
              type='primary'
              theme='solid'
              loading={transferModal.loading}
              disabled={!transferModal.amount || transferModal.amount <= 0}
              onClick={handleTransfer}
            >
              {t('确认转账')}
            </Button>
          </div>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Text type='secondary'>
            {t('从国库转出')}: {truncateAddress(treasury?.address)}
          </Text>
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 8 }}>
            {t('转入金额 (SOL)')}
          </Text>
          <InputNumber
            value={transferModal.amount}
            onChange={(value) =>
              setTransferModal((prev) => ({ ...prev, amount: value }))
            }
            min={0.001}
            step={0.001}
            precision={4}
            style={{ width: '100%' }}
            placeholder='0.0000'
          />
        </div>
      </Modal>

      {/* Transaction History Drawer */}
      <SideSheet
        title={
          txDrawer.user
            ? `${t('交易明细')} — ${txDrawer.user.username}`
            : t('交易明细')
        }
        visible={txDrawer.visible}
        onCancel={closeTxDrawer}
        placement='right'
        width={520}
      >
        {txDrawer.loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : txDrawer.transactions.length === 0 ? (
          <Empty
            title={t('暂无交易记录')}
            style={{ padding: 40 }}
          />
        ) : (
          <div>
            {txDrawer.transactions.map((tx) => {
              const isReceive = tx.to === txDrawer.user?.solana_address;
              const time = tx.block_time
                ? new Date(tx.block_time * 1000).toLocaleString()
                : '—';
              return (
                <Card
                  key={tx.signature}
                  style={{ marginBottom: 12 }}
                  bodyStyle={{ padding: 12 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Tag color={isReceive ? 'green' : 'red'} size='small'>
                      {isReceive ? t('收入') : t('支出')}
                    </Tag>
                    <Tag color={tx.status === 'success' ? 'green' : 'red'} size='small'>
                      {tx.status === 'success' ? t('成功') : t('失败')}
                    </Tag>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <Text strong style={{ fontSize: 18 }}>
                      {isReceive ? '+' : '-'}{tx.amount.toFixed(4)} SOL
                    </Text>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <Text type='secondary' size='small'>{t('发送方')}: </Text>
                    <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {truncateAddress(tx.from)}
                    </Text>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <Text type='secondary' size='small'>{t('接收方')}: </Text>
                    <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {truncateAddress(tx.to)}
                    </Text>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <Text type='secondary' size='small'>{t('时间')}: </Text>
                    <Text size='small'>{time}</Text>
                  </div>
                  <div>
                    <Text type='secondary' size='small'>Tx: </Text>
                    <Text
                      style={{ fontFamily: 'monospace', fontSize: 11 }}
                      copyable
                    >
                      {truncateAddress(tx.signature)}
                    </Text>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </SideSheet>

      {/* Operation Log Drawer */}
      <SideSheet
        title={
          logDrawer.user
            ? `${t('操作日志')} — ${logDrawer.user.username}`
            : t('操作日志')
        }
        visible={logDrawer.visible}
        onCancel={closeLogDrawer}
        placement='right'
        width={560}
      >
        {logDrawer.loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : logDrawer.logs.length === 0 ? (
          <Empty title={t('暂无操作日志')} style={{ padding: 40 }} />
        ) : (
          <div>
            {logDrawer.logs.map((log) => {
              const time = log.created_at
                ? new Date(log.created_at * 1000).toLocaleString()
                : '—';
              const statusColor = log.status === 'success' ? 'green' : log.status === 'failed' ? 'red' : 'orange';
              return (
                <Card
                  key={log.id}
                  style={{ marginBottom: 12 }}
                  bodyStyle={{ padding: 12 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Tag color='blue' size='small'>{t('转入')}</Tag>
                      <Tag color={statusColor} size='small'>
                        {log.status === 'success' ? t('成功') : log.status === 'failed' ? t('失败') : t('处理中')}
                      </Tag>
                    </div>
                    <Text size='small' type='tertiary'>{time}</Text>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <Text strong style={{ fontSize: 16 }}>{log.amount.toFixed(4)} SOL</Text>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <Text type='secondary' size='small'>{t('操作人')}: </Text>
                    <Text size='small'>{log.operator}</Text>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <Text type='secondary' size='small'>{t('目标用户')}: </Text>
                    <Text size='small'>{log.target_user} (ID: {log.target_user_id})</Text>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <Text type='secondary' size='small'>{t('发送方')}: </Text>
                    <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {truncateAddress(log.from_address)}
                    </Text>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <Text type='secondary' size='small'>{t('接收方')}: </Text>
                    <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {truncateAddress(log.to_address)}
                    </Text>
                  </div>
                  {log.remark && (
                    <div>
                      <Text type='secondary' size='small'>{t('备注')}: </Text>
                      <Text size='small' type='danger'>{log.remark}</Text>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </SideSheet>
    </div>
  );
}

export default function TreasuryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [tabActiveKey, setTabActiveKey] = useState('treasury');

  const onChangeTab = (key) => {
    setTabActiveKey(key);
    navigate(`?tab=${key}`);
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setTabActiveKey(tab);
    }
  }, [location.search]);

  const panes = [
    {
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Landmark size={18} />
          {t('积分管理')}
        </span>
      ),
      content: <TreasuryContent />,
      itemKey: 'treasury',
    },
    {
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Calculator size={18} />
          {t('积分结算审核')}
        </span>
      ),
      content: <SettlementAuditTab />,
      itemKey: 'settlement',
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <Tabs
        type='line'
        activeKey={tabActiveKey}
        onChange={(key) => onChangeTab(key)}
      >
        {panes.map((pane) => (
          <TabPane itemKey={pane.itemKey} tab={pane.tab} key={pane.itemKey}>
            {tabActiveKey === pane.itemKey && pane.content}
          </TabPane>
        ))}
      </Tabs>
    </div>
  );
}
