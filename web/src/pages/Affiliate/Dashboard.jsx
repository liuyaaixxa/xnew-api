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

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Typography,
  Modal,
} from '@douyinfe/semi-ui';
import { IconCopy, IconCoinMoneyStroked, IconUser, IconLink, IconQrCode } from '@douyinfe/semi-icons';
import { API, showError, showSuccess } from '../../helpers';
import './Dashboard.css';

const { Text, Title } = Typography;

export default function AffiliateDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [links, setLinks] = useState({});
  const [affCode, setAffCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [qrModal, setQrModal] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState('v1');

  const pageSize = 10;

  const versions = useMemo(() => [
    { key: 'v1', label: t('创业黑金'), desc: t('深色科技风，强调副业创业'), color: '#0d0d1a' },
    { key: 'v2', label: t('创意工作室'), desc: t('温暖柔和风，强调创作搭档'), color: '#fef9f6' },
    { key: 'v3', label: t('数据驱动'), desc: t('清爽商务风，数据说服力'), color: '#fafaf9' },
  ], [t]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get('/api/user/affiliate/status');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      showError(err);
    }
  }, []);

  const fetchLink = useCallback(async () => {
    try {
      const res = await API.get('/api/user/affiliate/link');
      if (res.data.success) {
        const d = res.data.data;
        setLinks({ v1: d.v1, v2: d.v2, v3: d.v3 });
        setAffCode(d.aff_code);
      }
    } catch (err) {
      // Link not available yet
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await API.get('/api/user/affiliate/records', {
        params: { p: page, page_size: pageSize },
      });
      if (res.data.success) {
        setRecords(res.data.data.items || []);
        setTotal(res.data.data.total || 0);
      }
    } catch (err) {
      showError(err);
    }
  }, [page]);

  const handleApply = useCallback(async () => {
    try {
      setApplying(true);
      const res = await API.post('/api/user/affiliate/apply');
      if (res.data.success) {
        showSuccess(t('成功加入推广联盟'));
        fetchStats();
        fetchLink();
      } else {
        showError(res.data.message || t('申请失败'));
      }
    } catch (err) {
      showError(err);
    } finally {
      setApplying(false);
    }
  }, [t, fetchStats, fetchLink]);

  const handleSettlement = useCallback(async () => {
    try {
      const res = await API.post('/api/user/affiliate/settlement');
      if (res.data.success) {
        showSuccess(t('结算申请已提交'));
        fetchStats();
      } else {
        showError(res.data.message || t('结算申请失败'));
      }
    } catch (err) {
      showError(err);
    }
  }, [t, fetchStats]);

  const handleCopyLink = useCallback((v) => {
    const u = links[v];
    if (!u) return;
    navigator.clipboard.writeText(u).then(() => {
      showSuccess(t('推广链接已复制'));
    });
  }, [links, t]);

  const handleSaveVersion = useCallback(async (v) => {
    setSelectedVersion(v);
    try {
      await API.put('/api/user/setting', { invite_page_version: v });
    } catch (err) {
      // silent
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchStats(), fetchLink()]).finally(() => setLoading(false));
  }, [fetchStats, fetchLink]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Render QR code when modal opens
  useEffect(() => {
    if (!qrModal || !links[qrModal]) return;
    const link = links[qrModal];
    const scriptId = 'qr-code-lib';
    const doRender = () => {
      const el = document.getElementById('affiliate-qrcode');
      if (el && window.renderQRCode) {
        while (el.firstChild) el.removeChild(el.firstChild);
        window.renderQRCode(el, link, 200);
      }
    };
    if (window.renderQRCode) {
      doRender();
    } else if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = '/invite/assets/qrcode.js';
      script.onload = doRender;
      document.head.appendChild(script);
    } else {
      const timer = setInterval(() => {
        if (window.renderQRCode) {
          clearInterval(timer);
          doRender();
        }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [qrModal, links]);

  const columns = [
    {
      title: t('被邀请用户'),
      dataIndex: 'referred_user_name',
      render: (text) => text || '-',
    },
    {
      title: t('充值金额'),
      dataIndex: 'topup_amount',
      render: (text) => `¥${(text || 0).toFixed(2)}`,
    },
    {
      title: t('佣金比例'),
      dataIndex: 'commission_rate',
      render: (text) => `${((text || 0) * 100).toFixed(0)}%`,
    },
    {
      title: t('佣金金额'),
      dataIndex: 'commission_amount',
      render: (text) => (
        <Text style={{ color: 'var(--semi-color-success)', fontWeight: 600 }}>
          ¥{(text || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: t('时间'),
      dataIndex: 'create_time',
      render: (text) => {
        if (!text) return '-';
        return new Date(text * 1000).toLocaleDateString();
      },
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      render: (text) => (
        <Tag color={text === 'settled' ? 'green' : 'orange'}>
          {text === 'settled' ? t('已结算') : t('待结算')}
        </Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="affiliate-dashboard">
        <Card loading style={{ maxWidth: 900, margin: '24px auto' }} />
      </div>
    );
  }

  const hasJoined = stats && stats.aff_code;
  const canSettle =
    stats && stats.available_earnings >= 100 && hasJoined;

  return (
    <div className="affiliate-dashboard">
      <div className="affiliate-header">
        <Title heading={3}>{t('推广联盟')}</Title>
        <Text type="tertiary">{t('邀请好友使用AI服务，终身赚取30%佣金')}</Text>
      </div>

      {!hasJoined ? (
        <Card className="affiliate-join-card">
          <div className="affiliate-join-content">
            <IconCoinMoneyStroked size="extra-large" style={{ color: '#D97757' }} />
            <div className="affiliate-join-text">
              <Title heading={4}>{t('加入推广联盟')}</Title>
              <Text type="tertiary">
                {t('邀请好友使用Tenu.AI，他们每次充值您都将获得30%佣金收益。收益大于¥100即可每周申请结算。')}
              </Text>
            </div>
            <Button
              theme="solid"
              size="large"
              loading={applying}
              onClick={handleApply}
              style={{ background: '#D97757', flexShrink: 0 }}
            >
              {t('立即加入')}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="affiliate-stats-grid">
            <Card className="affiliate-stat-card">
              <div className="stat-icon">
                <IconUser size="large" />
              </div>
              <div className="stat-value">{stats.total_referrals}</div>
              <div className="stat-label">{t('邀请用户数')}</div>
            </Card>
            <Card className="affiliate-stat-card">
              <div className="stat-icon">
                <IconCoinMoneyStroked size="large" />
              </div>
              <div className="stat-value">
                ¥{(stats.total_earnings || 0).toFixed(2)}
              </div>
              <div className="stat-label">{t('累计收益')}</div>
            </Card>
            <Card className="affiliate-stat-card highlight">
              <div className="stat-icon">
                <IconCoinMoneyStroked size="large" />
              </div>
              <div className="stat-value">
                ¥{(stats.available_earnings || 0).toFixed(2)}
              </div>
              <div className="stat-label">{t('可结算收益')}</div>
            </Card>
            <Card className="affiliate-stat-card">
              <div className="stat-icon">
                <IconCoinMoneyStroked size="large" />
              </div>
              <div className="stat-value">
                ¥{(stats.pending_earnings || 0).toFixed(2)}
              </div>
              <div className="stat-label">{t('待结算收益')}</div>
            </Card>
          </div>

          {/* Referral Link */}
          <Card className="affiliate-link-card">
            <div className="affiliate-link-content">
              <div className="affiliate-link-info">
                <IconLink />
                <Text strong>{t('您的专属推广链接 (默认版本)')}</Text>
              </div>
              <div className="affiliate-link-input-wrap">
                <input
                  className="affiliate-link-input"
                  value={links[selectedVersion] || ''}
                  readOnly
                  onClick={(e) => e.target.select()}
                />
                <Button icon={<IconCopy />} onClick={() => handleCopyLink(selectedVersion)}>
                  {t('复制链接')}
                </Button>
              </div>
              <Text type="tertiary" size="small">
                {t('推广码')}: {affCode}
              </Text>
            </div>
          </Card>

          {/* Version Selector */}
          <Card className="affiliate-link-card">
            <Title heading={6} style={{ marginBottom: 16 }}>
              🎨 {t('选择推广页面风格')}
            </Title>
            <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 16 }}>
              {t('根据您的用户群体，选择不同风格的推广页面。每个页面都有独立的链接和二维码。')}
            </Text>
            <div className="affiliate-version-grid">
              {versions.map((ver) => (
                <Card
                  key={ver.key}
                  className={`affiliate-version-card ${selectedVersion === ver.key ? 'active' : ''}`}
                  onClick={() => handleSaveVersion(ver.key)}
                >
                  <div className="affiliate-version-preview" style={{ background: ver.color }}>
                    <Text size="small" style={{ color: ver.key === 'v1' ? '#fff' : '#444' }}>
                      {ver.label}
                    </Text>
                  </div>
                  <div className="affiliate-version-info">
                    <Text strong>{ver.label}</Text>
                    <Text type="tertiary" size="small">
                      {ver.desc}
                    </Text>
                  </div>
                  <div className="affiliate-version-actions">
                    <Button
                      size="small"
                      icon={<IconQrCode />}
                      onClick={(e) => { e.stopPropagation(); setQrModal(ver.key); }}
                    >
                      {t('二维码')}
                    </Button>
                    <Button
                      size="small"
                      icon={<IconCopy />}
                      onClick={(e) => { e.stopPropagation(); handleCopyLink(ver.key); }}
                    >
                      {t('复制')}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Settlement Button */}
          <div className="affiliate-actions">
            <Space>
              <Button
                theme="solid"
                size="large"
                disabled={!canSettle}
                onClick={handleSettlement}
                style={{ background: canSettle ? '#D97757' : undefined }}
              >
                {canSettle
                  ? t('申请结算 (¥' + (stats?.available_earnings || 0).toFixed(2) + ')')
                  : t('收益不足¥100，暂不可结算')}
              </Button>
              <Text type="quaternary">{t('每周可申请一次结算')}</Text>
            </Space>
          </div>
        </>
      )}

      {/* Records Table */}
      {hasJoined && (
        <Card className="affiliate-records-card">
          <Title heading={5}>{t('推广记录')}</Title>
          <Table
            columns={columns}
            dataSource={records}
            pagination={{
              currentPage: page,
              pageSize,
              total,
              onPageChange: (p) => setPage(p),
            }}
          />
        </Card>
      )}

      {/* QR Code Modal */}
      {qrModal && links[qrModal] && (
        <Modal
          title={`${t('推广二维码')} — ${versions.find(v => v.key === qrModal)?.label || qrModal}`}
          visible={!!qrModal}
          onCancel={() => setQrModal(null)}
          footer={null}
          width={420}
        >
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div
              id="affiliate-qrcode"
              style={{ display: 'inline-block', padding: 16, background: '#fff', borderRadius: 12 }}
            />
            <div style={{ marginTop: 16 }}>
              <Text type="tertiary" size="small" copyable>
                {links[qrModal]}
              </Text>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
