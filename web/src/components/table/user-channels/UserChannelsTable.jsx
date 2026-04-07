import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Tooltip,
  Popconfirm,
  Space,
  Input,
  Pagination,
} from '@douyinfe/semi-ui';
import { IconSearch, IconPlus } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import useUserChannelsData from '../../../hooks/channels/useUserChannelsData';
import EditUserChannelModal from './modals/EditUserChannelModal';
import { CHANNEL_OPTIONS } from '../../../constants/channel.constants';

const reviewStatusMap = {
  0: { text: '待审核', color: 'orange' },
  1: { text: '已通过', color: 'green' },
  2: { text: '已拒绝', color: 'red' },
  3: { text: '已下线', color: 'grey' },
};

const UserChannelsTable = () => {
  const { t } = useTranslation();
  const {
    channels,
    loading,
    searching,
    activePage,
    pageSize,
    channelCount,
    showEdit,
    editingChannel,
    loadChannels,
    searchChannels,
    refresh,
    manageChannel,
    testChannel,
    handlePageChange,
    handlePageSizeChange,
    openEditModal,
    closeEditModal,
  } = useUserChannelsData();

  const [searchKeyword, setSearchKeyword] = useState('');

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
    if (status === 2 && record.review_message) {
      return (
        <Tooltip content={record.review_message}>
          <Tag color={info.color}>{t(info.text)}</Tag>
        </Tooltip>
      );
    }
    return <Tag color={info.color}>{t(info.text)}</Tag>;
  };

  const renderStatus = (status) => {
    return status === 1 ? (
      <Tag color='green'>{t('已启用')}</Tag>
    ) : (
      <Tag color='red'>{t('已禁用')}</Tag>
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
        title: t('设备名'),
        dataIndex: 'device_name',
        key: 'device_name',
        render: (text) => text || '-',
      },
      {
        title: t('域名地址'),
        dataIndex: 'device_domain',
        key: 'device_domain',
        render: (text) => text || '-',
      },
      {
        title: t('类型'),
        dataIndex: 'type',
        key: 'type',
        render: (text) => renderType(text),
      },
      {
        title: t('模型'),
        dataIndex: 'models',
        key: 'models',
        render: (text) => {
          if (!text) return '-';
          const models = text.split(',');
          if (models.length <= 2) {
            return models.join(', ');
          }
          return (
            <Tooltip content={text}>
              <span>
                {models.slice(0, 2).join(', ')} +{models.length - 2}
              </span>
            </Tooltip>
          );
        },
      },
      {
        title: t('状态'),
        dataIndex: 'status',
        key: 'status',
        render: (text) => renderStatus(text),
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
        width: 220,
        render: (_, record) => (
          <Space>
            <Button
              size='small'
              onClick={() => openEditModal(record)}
            >
              {t('编辑')}
            </Button>
            <Button
              size='small'
              type='tertiary'
              onClick={() => testChannel(record)}
            >
              {t('测试')}
            </Button>
            <Button
              size='small'
              type='warning'
              onClick={() => manageChannel(record, 'status')}
            >
              {record.status === 1 ? t('禁用') : t('启用')}
            </Button>
            <Popconfirm
              title={t('确认删除此渠道？')}
              onConfirm={() => manageChannel(record, 'delete')}
            >
              <Button size='small' type='danger'>
                {t('删除')}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [t, openEditModal, testChannel, manageChannel]
  );

  const handleSearch = () => {
    if (searchKeyword) {
      searchChannels(searchKeyword);
    } else {
      loadChannels(1);
    }
  };

  return (
    <>
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
        <Button
          icon={<IconPlus />}
          theme='solid'
          type='primary'
          onClick={() => openEditModal(null)}
        >
          {t('添加个人渠道')}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={channels}
        loading={loading || searching}
        rowKey='id'
        pagination={false}
        size='small'
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

      <EditUserChannelModal
        visible={showEdit}
        channel={editingChannel}
        onClose={closeEditModal}
        onSuccess={() => {
          closeEditModal();
          refresh();
        }}
      />
    </>
  );
};

export default UserChannelsTable;
