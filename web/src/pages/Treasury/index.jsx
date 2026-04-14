import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Typography,
  Spin,
  Banner,
  Tag,
  Button,
} from '@douyinfe/semi-ui';
import { Landmark, Copy, RefreshCw } from 'lucide-react';
import { API, showError } from '../../helpers';

const { Title, Text, Paragraph } = Typography;

export default function TreasuryPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [treasury, setTreasury] = useState(null);

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

  useEffect(() => {
    fetchTreasury();
  }, [fetchTreasury]);

  const copyAddress = () => {
    if (treasury?.address) {
      navigator.clipboard.writeText(treasury.address);
      import('@douyinfe/semi-ui').then(({ Toast }) => {
        Toast.success(t('已复制到剪贴板'));
      });
    }
  };

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
    <div className='mt-[60px]' style={{ padding: '24px', maxWidth: 640 }}>
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
  );
}
