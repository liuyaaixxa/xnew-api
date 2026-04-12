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
} from '@douyinfe/semi-ui';
import { Copy, Wallet, CheckCircle, AlertCircle } from 'lucide-react';
import { API, showError } from '../../helpers';

const { Title, Text, Paragraph } = Typography;

export default function WalletPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [wallet, setWallet] = useState(null);

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
          description={t('管理员尚未配置加密钱包功能')}
        />
      </div>
    );
  }

  return (
    <div className='mt-[60px]' style={{ padding: '24px', maxWidth: 640 }}>
      <Title heading={4} style={{ marginBottom: 24 }}>
        <Wallet size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        {t('加密钱包')}
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
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Text type='tertiary' style={{ display: 'block', marginBottom: 16 }}>
              {t('您还没有创建加密钱包，点击下方按钮创建')}
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

      <Banner
        type='info'
        description={t('加密钱包用于未来接收节点收益（Solana USDC）。钱包地址是您在区块链上的唯一标识。')}
        style={{ marginTop: 16 }}
      />
    </div>
  );
}
