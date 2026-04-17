import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card } from '@douyinfe/semi-ui';
import { IconTick, IconClose } from '@douyinfe/semi-icons';
import Title from '@douyinfe/semi-ui/lib/es/typography/title';
import Text from '@douyinfe/semi-ui/lib/es/typography/text';
import { API, getLogo, getSystemName, showError } from '../../helpers';
import Loading from '../../components/common/ui/Loading';

const DesktopAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState('');

  const state = searchParams.get('state');
  const logo = getLogo();
  const systemName = getSystemName();

  // Redirect to login if not authenticated
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      const returnUrl = `/desktop-auth?state=${encodeURIComponent(state || '')}`;
      navigate(`/login?next=${encodeURIComponent(returnUrl)}`, { replace: true });
    }
  }, []);

  if (!state) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-50'>
        <Card className='max-w-md w-full text-center p-8'>
          <Title heading={4} className='text-red-500'>
            Invalid Request
          </Title>
          <Text className='mt-4 block text-gray-600'>
            Missing state parameter. Please initiate login from the desktop app.
          </Text>
        </Card>
      </div>
    );
  }

  const handleAuthorize = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/api/user/desktop-auth/authorize', { state });
      const { success, message, data } = res.data;
      if (success) {
        setAuthorized(true);
        // Redirect to desktop app via custom protocol
        const redirectUrl = `teniulink://auth?code=${encodeURIComponent(data.code)}&state=${encodeURIComponent(data.state)}`;
        window.location.href = redirectUrl;
      } else {
        setError(message || 'Authorization failed');
        showError(message || 'Authorization failed');
      }
    } catch (err) {
      setError('Network error, please try again');
      showError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/console');
  };

  if (!localStorage.getItem('user')) {
    return <Loading />;
  }

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  if (authorized) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-50'>
        <Card className='max-w-md w-full text-center p-8'>
          <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center'>
            <IconTick size='extra-large' style={{ color: '#22c55e' }} />
          </div>
          <Title heading={4}>Authorization Successful</Title>
          <Text className='mt-4 block text-gray-600'>
            Desktop app has been authorized. You can close this window.
          </Text>
        </Card>
      </div>
    );
  }

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-50'>
      <Card className='max-w-md w-full p-8'>
        <div className='text-center'>
          <div className='flex items-center justify-center mb-6 gap-2'>
            <img src={logo} alt='Logo' className='h-10 rounded-full' />
            <Title heading={3}>{systemName}</Title>
          </div>

          <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center'>
            <svg
              className='w-8 h-8 text-blue-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
              />
            </svg>
          </div>

          <Title heading={4} className='mb-2'>
            Authorize Desktop App
          </Title>
          <Text className='text-gray-600 block mb-6'>
            <strong>Teniulink Node</strong> is requesting access to your account.
          </Text>

          <div className='bg-gray-100 rounded-lg p-4 mb-6'>
            <Text className='text-gray-700'>
              Logged in as: <strong>{currentUser.username || currentUser.display_name}</strong>
            </Text>
          </div>

          {error && (
            <div className='bg-red-50 text-red-600 rounded-lg p-3 mb-4 text-sm'>
              {error}
            </div>
          )}

          <div className='space-y-3'>
            <Button
              theme='solid'
              type='primary'
              className='w-full h-12 !rounded-full'
              onClick={handleAuthorize}
              loading={loading}
              icon={<IconTick />}
            >
              Authorize
            </Button>
            <Button
              theme='borderless'
              type='tertiary'
              className='w-full h-12 !rounded-full'
              onClick={handleCancel}
              icon={<IconClose />}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DesktopAuth;
