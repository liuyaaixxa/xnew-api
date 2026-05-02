import React, { useState, useCallback, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button, Spin } from '@douyinfe/semi-ui';
import { IconRefresh, IconTick } from '@douyinfe/semi-icons';
import Turnstile from 'react-turnstile';
import GoCaptcha from 'go-captcha-react';
import { API } from '../../helpers';

const CaptchaWidget = forwardRef(({ provider, turnstileSiteKey, onVerifiedChange }, ref) => {
  const { t } = useTranslation();
  const [captchaId, setCaptchaId] = useState('');
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [slideData, setSlideData] = useState(null);
  const [slidePoint, setSlidePoint] = useState(null);
  const [verified, setVerified] = useState(false);
  const slideRef = useRef(null);
  const fetchCaptcha = useCallback(async () => {
    setLoading(true);
    setCaptchaValue('');
    setSlidePoint(null);
    setVerified(false);
    if (onVerifiedChange) onVerifiedChange(false);
    try {
      const res = await API.get('/api/captcha');
      if (res.data?.success) {
        const d = res.data.data;
        setCaptchaId(d.captcha_id);
        if (d.captcha_image) {
          setCaptchaImage(d.captcha_image);
        }
        if (d.image && d.thumb) {
          setSlideData({
            image: d.image,
            thumb: d.thumb,
            thumbX: d.thumb_x,
            thumbY: d.thumb_y,
            thumbWidth: d.thumb_width,
            thumbHeight: d.thumb_height,
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch captcha', e);
    } finally {
      setLoading(false);
    }
  }, [onVerifiedChange]);

  useEffect(() => {
    if (provider === 'builtin' || provider === 'slide') {
      fetchCaptcha();
    }
  }, [provider, fetchCaptcha]);

  useImperativeHandle(ref, () => ({
    getPayload: () => {
      if (provider === 'builtin') {
        return { captcha_id: captchaId, captcha_value: captchaValue };
      }
      if (provider === 'slide') {
        return { captcha_id: captchaId, point_x: slidePoint?.x ?? 0, point_y: slidePoint?.y ?? 0 };
      }
      if (provider === 'turnstile' || (!provider && turnstileSiteKey)) {
        return { turnstile: turnstileToken };
      }
      return {};
    },
    isReady: () => {
      if (provider === 'builtin') {
        return captchaId !== '' && captchaValue !== '';
      }
      if (provider === 'slide') {
        return captchaId !== '' && slidePoint !== null;
      }
      if (provider === 'turnstile' || (!provider && turnstileSiteKey)) {
        return turnstileToken !== '';
      }
      return true;
    },
    refresh: () => {
      if (provider === 'builtin' || provider === 'slide') {
        fetchCaptcha();
      }
    },
  }));

  if (provider === 'disabled') return null;

  if (provider === 'builtin') {
    return (
      <div className='flex flex-col items-center gap-2 mt-4'>
        <div className='flex items-center gap-2'>
          {loading ? (
            <Spin size='middle' />
          ) : (
            <img
              src={captchaImage}
              alt={t('验证码')}
              style={{ height: 60, cursor: 'pointer', borderRadius: 4 }}
              onClick={fetchCaptcha}
            />
          )}
          <Button
            icon={<IconRefresh />}
            theme='borderless'
            onClick={fetchCaptcha}
            aria-label={t('刷新验证码')}
          />
        </div>
        <Input
          placeholder={t('请输入验证码')}
          value={captchaValue}
          onChange={setCaptchaValue}
          style={{ width: 200 }}
        />
      </div>
    );
  }

  if (provider === 'slide') {
    if (verified) {
      return (
        <div className='flex flex-col items-center mt-4'>
          <div className='flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-950'>
            <IconTick size='large' style={{ color: '#22c55e' }} />
            <span className='text-green-600 dark:text-green-400 font-semibold text-sm'>{t('验证通过')}</span>
          </div>
        </div>
      );
    }
    return (
      <div className='flex flex-col items-center mt-4'>
        {loading || !slideData ? (
          <Spin size='middle' />
        ) : (
          <GoCaptcha.Slide
            ref={slideRef}
            data={slideData}
            config={{ showTheme: false }}
            events={{
              confirm: (point) => {
                setSlidePoint(point);
                setVerified(true);
                if (onVerifiedChange) onVerifiedChange(true);
              },
              refresh: () => {
                fetchCaptcha();
              },
            }}
          />
        )}
      </div>
    );
  }

  // Turnstile mode (explicit "turnstile" or legacy empty with turnstile_check enabled)
  if (provider === 'turnstile' || (!provider && turnstileSiteKey)) {
    if (verified) {
      return (
        <div className='flex justify-center mt-6'>
          <div className='flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-950'>
            <IconTick size='large' style={{ color: '#22c55e' }} />
            <span className='text-green-600 dark:text-green-400 font-semibold text-sm'>{t('验证通过')}</span>
          </div>
        </div>
      );
    }
    return (
      <div className='flex justify-center mt-6'>
        <Turnstile
          sitekey={turnstileSiteKey}
          onVerify={(token) => {
            setTurnstileToken(token);
            setVerified(true);
            if (onVerifiedChange) onVerifiedChange(true);
          }}
        />
      </div>
    );
  }

  return null;
});

CaptchaWidget.displayName = 'CaptchaWidget';
export default CaptchaWidget;
