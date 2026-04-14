import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Typography,
  Button,
  Spin,
  Toast,
  Banner,
  Tag,
  Empty,
} from '@douyinfe/semi-ui';
import { Copy, Wallet, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { API, showError } from '../../helpers';

const { Title, Text, Paragraph } = Typography;

export default function WalletPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [transactions, setTransactions] = useState(null);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/user/wallet');
      const { success, data } = res.data;
      if (success) {
        setWallet(data);
      }
    } catch (e) {
      showError(t('获取钱包信息失败'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await API.post('/api/user/wallet/create');
      const { success, message } = res.data;
      if (success) {
        Toast.success(t('钱包创建成功'));
        fetchWallet();
      } else {
        showError(message || t('钱包创建失败'));
      }
    } catch (e) {
      showError(t('钱包创建失败'));
    } finally {
      setCreating(false);
    }
  };

  const copyAddress = () => {
    if (wallet?.solana_address) {
      navigator.clipboard.writeText(wallet.solana_address);
      Toast.success(t('已复制到剪贴板'));
    }
  };

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      const res = await API.get('/api/user/wallet/transactions');
      const { success, data } = res.data;
      if (success) {
        setTransactions(data || []);
      }
    } catch (_e) {
      showError(t('获取交易明细失败'));
    } finally {
      setTxLoading(false);
    }
  };

  const truncateAddress = (address) => {
    if (!address || address.length <= 12) return address || '';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  if (loading) {
    return (
      <div className='mt-[60px]' style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size='large' />
      </div>
    );
  }

  if (!wallet?.enabled) {
    return (
      <div className='mt-[60px]' style={{ padding: '24px' }}>
        <Banner
          type='info'
          description={t('管理员尚未配置积分钱包功能')}
        />
      </div>
    );
  }

  return (
    <div className='mt-[60px]' style={{ padding: '24px', maxWidth: 640 }}>
      <Title heading={4} style={{ marginBottom: 24 }}>
        <Wallet size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        {t('积分钱包')}
      </Title>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <Text strong style={{ marginRight: 8 }}>{t('钱包状态')}</Text>
          {wallet.status === 'created' ? (
            <Tag color='green' prefixIcon={<CheckCircle size={12} />}>
              {t('已创建')}
            </Tag>
          ) : (
            <Tag color='orange' prefixIcon={<AlertCircle size={12} />}>
              {t('未创建')}
            </Tag>
          )}
        </div>

        {wallet.status === 'created' ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <Text type='secondary' size='small'>{t('区块链网络')}</Text>
              <div><Text strong>Solana</Text></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text type='secondary' size='small'>{t('钱包地址')}</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  {wallet.solana_address}
                </Paragraph>
                <Button
                  icon={<Copy size={14} />}
                  size='small'
                  theme='borderless'
                  onClick={copyAddress}
                />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text type='secondary' size='small'>{t('钱包余额')}</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ fontSize: 20 }}>
                  {wallet.balance != null ? wallet.balance.toFixed(4) : '0.0000'}
                </Text>
                <Text type='secondary'>SOL</Text>
                {wallet.cluster && (
                  <Tag size='small' color='blue'>{wallet.cluster}</Tag>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Text type='tertiary' style={{ display: 'block', marginBottom: 16 }}>
              {t('您还没有创建积分钱包，点击下方按钮创建')}
            </Text>
            <Button
              theme='solid'
              type='primary'
              loading={creating}
              onClick={handleCreate}
            >
              {t('创建钱包')}
            </Button>
          </div>
        )}
      </Card>

      {/* Transaction History */}
      {wallet.status === 'created' && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text strong>
              <FileText size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {t('交易明细')}
            </Text>
            <Button
              size='small'
              theme='light'
              loading={txLoading}
              onClick={fetchTransactions}
            >
              {transactions === null ? t('查看交易') : t('刷新')}
            </Button>
          </div>

          {txLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <Spin />
            </div>
          ) : transactions === null ? (
            <Text type='tertiary' size='small'>
              {t('点击上方按钮查看最近 3 个月交易记录')}
            </Text>
          ) : transactions.length === 0 ? (
            <Empty title={t('暂无交易记录')} style={{ padding: 16 }} />
          ) : (
            <div>
              {transactions.map((tx) => {
                const isReceive = tx.to === wallet.solana_address;
                const time = tx.block_time
                  ? new Date(tx.block_time * 1000).toLocaleString()
                  : '—';
                return (
                  <div
                    key={tx.signature}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--semi-color-border)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Tag color={isReceive ? 'green' : 'red'} size='small'>
                          {isReceive ? t('收入') : t('支出')}
                        </Tag>
                        <Text size='small' type='tertiary'>{time}</Text>
                      </div>
                      <Text style={{ fontFamily: 'monospace', fontSize: 12 }} type='tertiary'>
                        {isReceive ? t('发送方') : t('接收方')}: {truncateAddress(isReceive ? tx.from : tx.to)}
                      </Text>
                    </div>
                    <Text strong style={{ fontSize: 16, color: isReceive ? 'var(--semi-color-success)' : 'var(--semi-color-danger)' }}>
                      {isReceive ? '+' : '-'}{tx.amount.toFixed(4)} SOL
                    </Text>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Banner
        type='info'
        description={t('积分钱包用于接收平台积分奖励。钱包地址是您在平台上的唯一标识。')}
        style={{ marginTop: 16 }}
      />
    </div>
  );
}
