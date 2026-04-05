import { useState, useCallback } from 'react';
import { API, showError, showSuccess } from '../../helpers';

const useUserChannelsData = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(
    parseInt(localStorage.getItem('user-channel-page-size')) || 10
  );
  const [channelCount, setChannelCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);

  const loadChannels = useCallback(
    async (page) => {
      setLoading(true);
      const p = page || activePage;
      try {
        const res = await API.get(
          `/api/user-channel/?p=${p}&page_size=${pageSize}`
        );
        const { success, message, data, total } = res.data;
        if (success) {
          setChannels(data || []);
          setChannelCount(total || 0);
        } else {
          showError(message);
        }
      } catch (error) {
        showError(error.message);
      }
      setLoading(false);
    },
    [activePage, pageSize]
  );

  const searchChannels = useCallback(async (keyword) => {
    if (!keyword) return;
    setSearching(true);
    try {
      const res = await API.get(
        `/api/user-channel/?keyword=${encodeURIComponent(keyword)}`
      );
      const { success, message, data } = res.data;
      if (success) {
        setChannels(data || []);
        setChannelCount(data?.length || 0);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    }
    setSearching(false);
  }, []);

  const refresh = useCallback(() => {
    loadChannels(activePage);
  }, [loadChannels, activePage]);

  const manageChannel = useCallback(
    async (channel, action) => {
      if (action === 'delete') {
        try {
          const res = await API.delete(`/api/user-channel/${channel.id}`);
          const { success, message } = res.data;
          if (success) {
            showSuccess('渠道已删除');
            refresh();
          } else {
            showError(message);
          }
        } catch (error) {
          showError(error.message);
        }
      } else if (action === 'status') {
        const newStatus = channel.status === 1 ? 2 : 1;
        try {
          const res = await API.put('/api/user-channel/status', {
            id: channel.id,
            status: newStatus,
          });
          const { success, message } = res.data;
          if (success) {
            showSuccess(newStatus === 1 ? '已启用' : '已禁用');
            refresh();
          } else {
            showError(message);
          }
        } catch (error) {
          showError(error.message);
        }
      }
    },
    [refresh]
  );

  const testChannel = useCallback(async (channel) => {
    try {
      const res = await API.get(`/api/user-channel/test/${channel.id}`);
      const { success, message, time } = res.data;
      if (success) {
        showSuccess(`测试成功，耗时 ${time.toFixed(2)} 秒`);
      } else {
        showError(message || '测试失败');
      }
    } catch (error) {
      showError(error.message);
    }
  }, []);

  const handlePageChange = useCallback(
    (page) => {
      setActivePage(page);
      loadChannels(page);
    },
    [loadChannels]
  );

  const handlePageSizeChange = useCallback(
    (size) => {
      localStorage.setItem('user-channel-page-size', size);
      setPageSize(size);
      setActivePage(1);
    },
    []
  );

  const openEditModal = useCallback((channel) => {
    setEditingChannel(channel || null);
    setShowEdit(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEdit(false);
    setEditingChannel(null);
  }, []);

  return {
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
  };
};

export default useUserChannelsData;
