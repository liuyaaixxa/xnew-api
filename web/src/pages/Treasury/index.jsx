import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
} from '@douyinfe/semi-ui';
import { Landmark, Copy, RefreshCw, Send } from 'lucide-react';
import { API, showError } from '../../helpers';

const { Title, Text, Paragraph } = Typography;

export default function TreasuryPage() {
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
      title: t('操作'),
      key: 'action',
      render: (_text, record) => (
        <Button
          icon={<Send size={14} />}
          size='small'
          theme='light'
          type='primary'
          disabled={!record.solana_address}
          onClick={() => openTransferModal(record)}
        >
          {t('转入')}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className='mt-[60px]' style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size='large' />
      </div>
    );
  }

  if (!treasury) {
    return (
      <div className='mt-[60px]' style={{ padding: '24px' }}>
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
    <div className='mt-[60px]' style={{ padding: '24px', maxWidth: 960 }}>
      {/* Treasury Card */}
      <div style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <Title heading={4} style={{ margin: 0 }}>
            <Landmark size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            {t('国库管理')}
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
    </div>
  );
}
