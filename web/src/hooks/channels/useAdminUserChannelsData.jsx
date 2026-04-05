import { useState, useCallback } from 'react';
import { API, showError, showSuccess } from '../../helpers';

const useAdminUserChannelsData = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(
    parseInt(localStorage.getItem('admin-user-channel-page-size')) || 10
  );
  const [channelCount, setChannelCount] = useState(0);
  const [reviewStatusFilter, setReviewStatusFilter] = useState(null);

  const loadChannels = useCallback(
    async (page, reviewStatus) => {
      setLoading(true);
      const p = page || activePage;
      const rs =
        reviewStatus !== undefined ? reviewStatus : reviewStatusFilter;
      let url = `/api/user-channel/admin/?p=${p}&page_size=${pageSize}`;
      if (rs !== null && rs !== undefined) {
        url += `&review_status=${rs}`;
      }
      try {
        const res = await API.get(url);
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
    [activePage, pageSize, reviewStatusFilter]
  );

  const searchChannels = useCallback(
    async (keyword) => {
      if (!keyword) return;
      setLoading(true);
      let url = `/api/user-channel/admin/?keyword=${encodeURIComponent(keyword)}&p=1&page_size=${pageSize}`;
      if (reviewStatusFilter !== null && reviewStatusFilter !== undefined) {
        url += `&review_status=${reviewStatusFilter}`;
      }
      try {
        const res = await API.get(url);
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
    [pageSize, reviewStatusFilter]
  );

  const refresh = useCallback(() => {
    loadChannels(activePage);
  }, [loadChannels, activePage]);

  const approveChannel = useCallback(
    async (id, reviewMessage) => {
      try {
        const res = await API.post('/api/user-channel/admin/approve', {
          id,
          review_message: reviewMessage || '',
        });
        const { success, message } = res.data;
        if (success) {
          showSuccess('已通过审核');
          refresh();
        } else {
          showError(message);
        }
      } catch (error) {
        showError(error.message);
      }
    },
    [refresh]
  );

  const rejectChannel = useCallback(
    async (id, reviewMessage) => {
      try {
        const res = await API.post('/api/user-channel/admin/reject', {
          id,
          review_message: reviewMessage,
        });
        const { success, message } = res.data;
        if (success) {
          showSuccess('已拒绝');
          refresh();
        } else {
          showError(message);
        }
      } catch (error) {
        showError(error.message);
      }
    },
    [refresh]
  );

  const offlineChannel = useCallback(
    async (id, reviewMessage) => {
      try {
        const res = await API.post('/api/user-channel/admin/offline', {
          id,
          review_message: reviewMessage || '',
        });
        const { success, message } = res.data;
        if (success) {
          showSuccess('已下线');
          refresh();
        } else {
          showError(message);
        }
      } catch (error) {
        showError(error.message);
      }
    },
    [refresh]
  );

  const handlePageChange = useCallback(
    (page) => {
      setActivePage(page);
      loadChannels(page);
    },
    [loadChannels]
  );

  const handlePageSizeChange = useCallback(
    (size) => {
      localStorage.setItem('admin-user-channel-page-size', size);
      setPageSize(size);
      setActivePage(1);
    },
    []
  );

  const handleReviewStatusChange = useCallback(
    (status) => {
      setReviewStatusFilter(status);
      setActivePage(1);
      loadChannels(1, status);
    },
    [loadChannels]
  );

  return {
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
    handlePageChange,
    handlePageSizeChange,
    handleReviewStatusChange,
  };
};

export default useAdminUserChannelsData;
