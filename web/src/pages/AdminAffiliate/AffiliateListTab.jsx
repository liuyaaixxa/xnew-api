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

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Typography, Empty, SideSheet, Button } from '@douyinfe/semi-ui';
import { API, timestamp2string } from '../../helpers';

const { Text } = Typography;

export default function AffiliateListTab() {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerAffiliate, setDrawerAffiliate] = useState(null);
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [invitedTotal, setInvitedTotal] = useState(0);
  const [invitedLoading, setInvitedLoading] = useState(false);
  const [invitedPage, setInvitedPage] = useState(1);
  const [invitedPageSize, setInvitedPageSize] = useState(10);

  const load = useCallback(async (currentPage = page, currentPageSize = pageSize) => {
    setLoading(true);
    try {
      const res = await API.get(
        `/api/user/affiliate/list?p=${currentPage}&page_size=${currentPageSize}`
      );
      const { success, data } = res.data;
      if (success) {
        setRecords(data.items || []);
        setTotal(data.total || 0);
        setPage(data.page || currentPage);
      }
    } catch (e) {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    load(1, pageSize);
  }, []);

  const loadInvitedUsers = useCallback(async (affiliateUserId, currentPage, currentPageSize) => {
    setInvitedLoading(true);
    try {
      const res = await API.get(
        `/api/user/affiliate/invited-users?user_id=${affiliateUserId}&p=${currentPage}&page_size=${currentPageSize}`
      );
      const { success, data } = res.data;
      if (success) {
        setInvitedUsers(data.items || []);
        setInvitedTotal(data.total || 0);
      }
    } catch (e) {
      // handled by interceptor
    } finally {
      setInvitedLoading(false);
    }
  }, []);

  const openInvitedDrawer = (record) => {
    setDrawerAffiliate(record);
    setInvitedPage(1);
    setInvitedPageSize(10);
    setDrawerVisible(true);
    loadInvitedUsers(record.user_id, 1, 10);
  };

  const invitedColumns = [
    {
      title: t('用户ID'),
      dataIndex: 'user_id',
      width: 80,
    },
    {
      title: t('用户名'),
      dataIndex: 'user_name',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: t('注册时间'),
      dataIndex: 'register_time',
      width: 180,
      render: (ts) => timestamp2string(ts),
    },
  ];

  const columns = [
    {
      title: t('用户ID'),
      dataIndex: 'user_id',
      width: 80,
    },
    {
      title: t('用户名'),
      dataIndex: 'user_name',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: t('推广码'),
      dataIndex: 'aff_code',
      width: 120,
      render: (text) => (
        <Text copyable={{ content: text }}>{text || '-'}</Text>
      ),
    },
    {
      title: t('邀请人数'),
      dataIndex: 'aff_count',
      width: 100,
      render: (text, record) => {
        const count = text || 0;
        if (count > 0) {
          return (
            <Button
              theme='borderless'
              type='primary'
              size='small'
              onClick={() => openInvitedDrawer(record)}
            >
              {count}
            </Button>
          );
        }
        return <Text type='tertiary'>0</Text>;
      },
    },
    {
      title: t('累计收益'),
      dataIndex: 'total_earnings',
      width: 140,
      render: (text) => (
        <Text style={{ color: 'var(--semi-color-success)', fontWeight: 600 }}>
          ¥{(text || 0).toFixed(2)}
        </Text>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={records}
        rowKey="user_id"
        loading={loading}
        pagination={{
          currentPage: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOpts: [10, 20, 50, 100],
          onPageChange: (p) => { setPage(p); load(p, pageSize); },
          onPageSizeChange: (s) => { setPageSize(s); setPage(1); load(1, s); },
        }}
        empty={<Empty description={t('暂无推广者')} />}
      />

      <SideSheet
        title={
          drawerAffiliate
            ? t('邀请用户列表') + ' — ' + (drawerAffiliate.user_name || 'ID:' + drawerAffiliate.user_id)
            : t('邀请用户列表')
        }
        visible={drawerVisible}
        onCancel={() => setDrawerVisible(false)}
        width={560}
      >
        <Table
          columns={invitedColumns}
          dataSource={invitedUsers}
          rowKey="user_id"
          loading={invitedLoading}
          pagination={{
            currentPage: invitedPage,
            pageSize: invitedPageSize,
            total: invitedTotal,
            showSizeChanger: true,
            pageSizeOpts: [10, 20, 50],
            onPageChange: (p) => {
              setInvitedPage(p);
              loadInvitedUsers(drawerAffiliate?.user_id, p, invitedPageSize);
            },
            onPageSizeChange: (s) => {
              setInvitedPageSize(s);
              setInvitedPage(1);
              loadInvitedUsers(drawerAffiliate?.user_id, 1, s);
            },
          }}
          empty={<Empty description={t('暂无邀请用户')} />}
          size='small'
        />
      </SideSheet>
    </>
  );
}
