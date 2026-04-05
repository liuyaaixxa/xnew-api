import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Tooltip,
  Space,
  Input,
  Pagination,
  Modal,
  TabPane,
  Tabs,
} from '@douyinfe/semi-ui';
import { IconSearch } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import useAdminUserChannelsData from '../../../hooks/channels/useAdminUserChannelsData';
import { CHANNEL_OPTIONS } from '../../../constants/channel.constants';

const reviewStatusMap = {
  0: { text: '待审核', color: 'orange' },
  1: { text: '已通过', color: 'green' },
  2: { text: '已拒绝', color: 'red' },
  3: { text: '已下线', color: 'grey' },
};

const AdminUserChannelsTable = () => {
  const { t } = useTranslation();
  const {
    channels,
    loading,
    activePage,
    pageSize,
    channelCount,
    reviewStatusFilter,
    loadChannels,
    searchChannels,
    refresh,
    approveChannel,
    rejectChannel,
    offlineChannel,
    testChannel,
    handlePageChange,
    handlePageSizeChange,
    handleReviewStatusChange,
  } = useAdminUserChannelsData();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectMessage, setRejectMessage] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [testingId, setTestingId] = useState(null);

  const handleTest = async (record) => {
    setTestingId(record.id);
    await testChannel(record.id, record.test_model);
    setTestingId(null);
  };

  useEffect(() => {
    loadChannels(1);
  }, []);

  const renderType = (type) => {
    const option = CHANNEL_OPTIONS.find((o) => o.value === type);
    if (option) {
      return <Tag color={option.color}>{option.label}</Tag>;
    }
    return <Tag>{t('未知')}</Tag>;
  };

  const renderReviewStatus = (status, record) => {
    const info = reviewStatusMap[status] || { text: '未知', color: 'grey' };
    if ((status === 2 || status === 3) && record.review_message) {
      return (
        <Tooltip content={record.review_message}>
          <Tag color={info.color}>{t(info.text)}</Tag>
        </Tooltip>
      );
    }
    return <Tag color={info.color}>{t(info.text)}</Tag>;
  };

  const openRejectModal = (record) => {
    setRejectTarget(record);
    setRejectMessage('');
    setRejectModalVisible(true);
  };

  const handleReject = () => {
    if (!rejectMessage.trim()) {
      return;
    }
    rejectChannel(rejectTarget.id, rejectMessage);
    setRejectModalVisible(false);
    setRejectTarget(null);
  };

  const renderModels = (text) => {
    if (!text) return '-';
    const models = text.split(',').filter(Boolean);
    const maxShow = 3;
    const shown = models.slice(0, maxShow);
    const overflow = models.length - maxShow;
    return (
      <Space wrap>
        {shown.map((m) => (
          <Tag size='small' key={m}>{m}</Tag>
        ))}
        {overflow > 0 && (
          <Tooltip content={models.join(', ')}>
            <Tag size='small' color='blue'>+{overflow}</Tag>
          </Tooltip>
        )}
      </Space>
    );
  };

  const renderTestResult = (record) => {
    if (!record.test_time) return <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>;
    const time = record.response_time / 1000;
    const color = time < 3 ? 'green' : 'orange';
    const testDate = new Date(record.test_time * 1000).toLocaleString();
    return (
      <Tooltip content={`${t('测试时间')}: ${testDate}`}>
        <Tag size='small' color={color}>{time.toFixed(2)}s</Tag>
      </Tooltip>
    );
  };

  const columns = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 60,
      },
      {
        title: t('名称'),
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: t('提交者'),
        key: 'submitter',
        render: (_, record) => (
          <span>{record.display_name || record.username || '-'}</span>
        ),
      },
      {
        title: t('类型'),
        dataIndex: 'type',
        key: 'type',
        render: (text) => renderType(text),
      },
      {
        title: 'Base URL',
        dataIndex: 'base_url',
        key: 'base_url',
        width: 180,
        render: (text) => {
          if (!text) return '-';
          const display = text.length > 30 ? text.slice(0, 30) + '...' : text;
          return (
            <Tooltip content={text}>
              <span style={{ fontSize: 12 }}>{display}</span>
            </Tooltip>
          );
        },
      },
      {
        title: t('模型'),
        dataIndex: 'models',
        key: 'models',
        render: (text) => renderModels(text),
      },
      {
        title: t('分组'),
        dataIndex: 'group',
        key: 'group',
        width: 80,
        render: (text) => text || 'default',
      },
      {
        title: t('测试结果'),
        key: 'test_result',
        width: 100,
        render: (_, record) => renderTestResult(record),
      },
      {
        title: t('审核状态'),
        dataIndex: 'review_status',
        key: 'review_status',
        render: (text, record) => renderReviewStatus(text, record),
      },
      {
        title: t('创建时间'),
        dataIndex: 'created_time',
        key: 'created_time',
        render: (text) => {
          if (!text) return '-';
          return new Date(text * 1000).toLocaleDateString();
        },
      },
      {
        title: t('操作'),
        key: 'action',
        width: 300,
        render: (_, record) => {
          const isPending = record.review_status === 0;
          const isApproved = record.review_status === 1;
          const isTesting = testingId === record.id;

          return (
            <Space>
              <Button
                size='small'
                loading={isTesting}
                onClick={() => handleTest(record)}
              >
                {t('测试')}
              </Button>
              {isPending && (
                <>
                  <Button
                    size='small'
                    type='primary'
                    theme='solid'
                    onClick={() => approveChannel(record.id)}
                  >
                    {t('通过')}
                  </Button>
                  <Button
                    size='small'
                    type='danger'
                    onClick={() => openRejectModal(record)}
                  >
                    {t('拒绝')}
                  </Button>
                </>
              )}
              {isApproved && (
                <Button
                  size='small'
                  type='warning'
                  onClick={() => offlineChannel(record.id)}
                >
                  {t('下线')}
                </Button>
              )}
            </Space>
          );
        },
      },
    ],
    [t, approveChannel, offlineChannel, testingId]
  );

  const handleSearch = () => {
    if (searchKeyword) {
      searchChannels(searchKeyword);
    } else {
      loadChannels(1);
    }
  };

  const tabItems = [
    { key: 'all', label: t('全部') },
    { key: '0', label: t('待审核') },
    { key: '1', label: t('已通过') },
    { key: '2', label: t('已拒绝') },
    { key: '3', label: t('已下线') },
  ];

  return (
    <>
      <Tabs
        activeKey={reviewStatusFilter === null ? 'all' : String(reviewStatusFilter)}
        onChange={(key) =>
          handleReviewStatusChange(key === 'all' ? null : parseInt(key))
        }
        style={{ marginBottom: 16 }}
      >
        {tabItems.map((item) => (
          <TabPane tab={item.label} itemKey={item.key} key={item.key} />
        ))}
      </Tabs>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Space>
          <Input
            prefix={<IconSearch />}
            placeholder={t('搜索渠道名称或模型')}
            value={searchKeyword}
            onChange={setSearchKeyword}
            onEnterPress={handleSearch}
            style={{ width: 300 }}
          />
          <Button onClick={handleSearch}>{t('搜索')}</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={channels}
        loading={loading}
        rowKey='id'
        pagination={false}
        size='small'
        scroll={{ x: 'max-content' }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Pagination
          currentPage={activePage}
          pageSize={pageSize}
          total={channelCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOpts={[10, 20, 50]}
          showSizeChanger
        />
      </div>

      <Modal
        title={t('拒绝原因')}
        visible={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => setRejectModalVisible(false)}
        okButtonProps={{ disabled: !rejectMessage.trim() }}
      >
        <Input
          placeholder={t('请输入拒绝原因（必填）')}
          value={rejectMessage}
          onChange={setRejectMessage}
          style={{ width: '100%' }}
        />
      </Modal>
    </>
  );
};

export default AdminUserChannelsTable;
