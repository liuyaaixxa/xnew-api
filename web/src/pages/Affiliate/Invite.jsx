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

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Card } from '@douyinfe/semi-ui';
import { IconGift } from '@douyinfe/semi-icons';
import { API } from '../../helpers';
import './Invite.css';

const { Text, Title } = Typography;

export default function AffiliateInvite() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [inviterName, setInviterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const affCode = searchParams.get('aff') || '';

  useEffect(() => {
    if (!affCode) {
      setError(t('缺少邀请码'));
      setLoading(false);
      return;
    }

    API.get('/api/affiliate/invite', { params: { aff: affCode } })
      .then((res) => {
        if (res.data.success) {
          setInviterName(res.data.data.inviter_name);
        } else {
          setError(res.data.message || t('邀请码无效'));
        }
      })
      .catch(() => setError(t('邀请码无效')))
      .finally(() => setLoading(false));
  }, [affCode, t]);

  if (loading) {
    return (
      <div className="aff-invite-page">
        <Card loading style={{ maxWidth: 500, margin: '80px auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="aff-invite-page">
        <div className="aff-invite-content">
          <div className="invite-icon">❌</div>
          <Title heading={3}>{error}</Title>
          <Button
            theme="solid"
            size="large"
            onClick={() => navigate('/register')}
            style={{ background: '#D97757' }}
          >
            {t('注册账号')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="aff-invite-page">
      <div className="aff-invite-content fade-in">
        <div className="invite-icon-wrap">
          <IconGift size="extra-large" style={{ color: '#D97757' }} />
        </div>
        <Title heading={3}>
          {t('您的好友')}{' '}
          <span className="inviter-name">{inviterName}</span>{' '}
          {t('邀请您使用 Tenu.AI')}
        </Title>
        <Text type="tertiary" style={{ marginBottom: 32, display: 'block' }}>
          {t('注册即可获得免费额度，体验40+顶级AI模型')}
        </Text>
        <div className="invite-actions">
          <Button
            theme="solid"
            size="large"
            onClick={() => navigate(`/register?aff=${affCode}`)}
            style={{ background: '#D97757' }}
          >
            {t('立即注册')}
          </Button>
          <Button
            theme="light"
            size="large"
            onClick={() => navigate(`/login`)}
          >
            {t('已有账号？登录')}
          </Button>
        </div>
      </div>
    </div>
  );
}
