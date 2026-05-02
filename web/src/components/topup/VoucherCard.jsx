import React, { useEffect, useState, useCallback } from 'react';
import { Modal } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';
import './voucher-card.css';

const sourceClass = {
  welcome: 'welcome',
  invitee: 'invitee',
  inviter: 'inviter',
};

const sourceIcon = {
  welcome: '🎁',
  invitee: '👥',
  inviter: '💰',
};

function formatLargeNumber(num) {
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
  if (num >= 10000) return (num / 10000).toFixed(0) + '万';
  return num.toLocaleString();
}

export default function VoucherCard() {
  const { t } = useTranslation();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingVoucher, setPendingVoucher] = useState(null);

  const fetchVouchers = useCallback(async () => {
    try {
      const res = await API.get('/api/user/vouchers');
      if (res?.data?.data) {
        setVouchers(res.data.data);
      }
    } catch (err) {
      // Ignore — voucher system is optional
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleClaim = (voucher) => {
    setPendingVoucher(voucher);
    setConfirmVisible(true);
  };

  const doClaim = async () => {
    if (!pendingVoucher) return;
    setClaiming(pendingVoucher.id);
    setConfirmVisible(false);
    try {
      const res = await API.post(`/api/user/vouchers/${pendingVoucher.id}/claim`);
      if (res?.data) {
        showSuccess(t('签收成功！额度已到账'));
        fetchVouchers();
      }
    } catch (err) {
      showError(t('签收失败，请重试'));
    } finally {
      setClaiming(null);
      setPendingVoucher(null);
    }
  };

  const unclaimed = vouchers.filter((v) => !v.claimed);
  const claimed = vouchers.filter((v) => v.claimed);

  if (loading) return null;

  if (vouchers.length === 0) return null;

  return (
    <div className='voucher-center'>
      {/* Claim Confirmation Modal */}
      <Modal
        title={t('确认签收额度券')}
        visible={confirmVisible}
        onOk={doClaim}
        onCancel={() => {
          setConfirmVisible(false);
          setPendingVoucher(null);
        }}
        confirmLoading={!!claiming}
        okText={t('确认签收')}
        cancelText={t('稍后再说')}
        size='small'
        centered
      >
        {pendingVoucher && (
          <div className='claim-success-content'>
            <div className='claim-success-icon'>
              {sourceIcon[pendingVoucher.source] || '🎁'}
            </div>
            <p style={{ fontSize: 16, marginBottom: 8 }}>
              {pendingVoucher.name}
            </p>
            <div
              className='claim-success-tokens'
              style={{
                backgroundImage:
                  pendingVoucher.source === 'welcome'
                    ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                    : pendingVoucher.source === 'invitee'
                    ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                    : 'linear-gradient(135deg, #06b6d4, #22d3ee)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {formatLargeNumber(pendingVoucher.quota)} Token
            </div>
            <p
              style={{
                fontSize: 13,
                color: 'var(--semi-color-text-2, #8888a0)',
              }}
            >
              {t('签收后立即到账，无需支付')}
            </p>
          </div>
        )}
      </Modal>

      {/* Section Title */}
      <div className='voucher-center-title'>
        <span>🎟️</span>
        <span>{t('Teniu额度券')}</span>
        {unclaimed.length > 0 && (
          <span
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 10,
              marginLeft: 8,
            }}
          >
            {unclaimed.length} {t('张待签收')}
          </span>
        )}
      </div>

      {/* Unclaimed Vouchers */}
      {unclaimed.length > 0 && (
        <div className='voucher-grid'>
          {unclaimed.map((v) => (
            <div
              key={v.id}
              className={`voucher-card ${sourceClass[v.source] || 'welcome'}`}
            >
              <div className='voucher-card-inner'>
                <div className='voucher-badge'>
                  <span>{sourceIcon[v.source] || '🎁'}</span>
                  <span>{v.name}</span>
                </div>
                <div className='voucher-amount'>
                  {formatLargeNumber(v.quota)}
                </div>
                <div className='voucher-unit'>Token</div>
                <button
                  className='voucher-claim-btn'
                  onClick={() => handleClaim(v)}
                  disabled={claiming === v.id}
                >
                  {claiming === v.id ? t('签收中...') : '✨ ' + t('立即签收')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Claimed History */}
      {claimed.length > 0 && (
        <div className='voucher-history'>
          <div className='voucher-history-title'>
            <span>✅</span>
            <span>{t('已签收记录')}</span>
          </div>
          {claimed.map((v) => (
            <div key={v.id} className='voucher-history-item'>
              <div>
                <div className='voucher-history-name'>
                  {sourceIcon[v.source]} {v.name}
                </div>
                <div className='voucher-history-detail'>
                  {new Date(v.claimed_time * 1000).toLocaleDateString()}
                </div>
              </div>
              <div className='voucher-history-amount'>
                +{formatLargeNumber(v.quota)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State (all claimed, show in history already) */}
    </div>
  );
}
