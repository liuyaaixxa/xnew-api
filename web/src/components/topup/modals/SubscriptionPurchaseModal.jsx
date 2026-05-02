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

import React from 'react';
import {
  Banner,
  Modal,
  Typography,
  Card,
  Button,
  Select,
  Divider,
  Tooltip,
} from '@douyinfe/semi-ui';
import { Crown, CalendarClock, Package, CreditCard } from 'lucide-react';
import { SiStripe, SiPaypal, SiAlipay, SiWechat } from 'react-icons/si';
import { IconCreditCard } from '@douyinfe/semi-icons';
import { renderQuota } from '../../../helpers';
import {
  formatSubscriptionDuration,
  formatSubscriptionResetPeriod,
} from '../../../helpers/subscriptionFormat';

const { Text } = Typography;

// 渲染支付方式图标
const renderPayMethodIcon = (type, size = 14) => {
  switch (type) {
    case 'alipay':
      return <SiAlipay size={size} color='#1677FF' />;
    case 'wxpay':
      return <SiWechat size={size} color='#07C160' />;
    case 'stripe':
      return <SiStripe size={size} color='#635BFF' />;
    case 'paypal':
      return <SiPaypal size={size} color='#003087' />;
    default:
      return <CreditCard size={size} />;
  }
};

const SubscriptionPurchaseModal = ({
  t,
  visible,
  onCancel,
  selectedPlan,
  paying,
  selectedPayMethod,
  setSelectedPayMethod,
  payMethods = [],
  enableStripeTopUp = false,
  enableCreemTopUp = false,
  purchaseLimitInfo = null,
  onPay,
}) => {
  const plan = selectedPlan?.plan;
  const totalAmount = Number(plan?.total_amount || 0);
  const price = plan ? Number(plan.price_amount || 0) : 0;

  // 只有微信/支付宝需要汇率转换为人民币显示，PayPal/Stripe 直接显示 USD
  const needsRateConversion =
    selectedPayMethod === 'alipay' || selectedPayMethod === 'wxpay';
  const cnyRate = (() => {
    if (!needsRateConversion) return 1;
    try {
      const statusStr = localStorage.getItem('status');
      if (statusStr) {
        const s = JSON.parse(statusStr);
        return parseFloat(s?.usd_exchange_rate) || 7;
      }
    } catch (e) {}
    return 7;
  })();
  const convertedPrice = needsRateConversion ? price * cnyRate : price;
  const symbol = needsRateConversion ? '¥' : '$';
  const displayPrice = convertedPrice.toFixed(
    Number.isInteger(convertedPrice) ? 0 : 2,
  );
  // 只有当管理员开启支付网关 AND 套餐配置了对应的支付ID时才显示
  const hasStripe = enableStripeTopUp && !!plan?.stripe_price_id;
  const hasCreem = enableCreemTopUp && !!plan?.creem_product_id;
  const hasAnyPayment = payMethods.length > 0 || hasStripe || hasCreem;
  const purchaseLimit = Number(purchaseLimitInfo?.limit || 0);
  const purchaseCount = Number(purchaseLimitInfo?.count || 0);
  const purchaseLimitReached =
    purchaseLimit > 0 && purchaseCount >= purchaseLimit;

  // 构建统一的支付方式列表（下拉选项）
  const allPayMethods = [];
  // 添加易支付方式（支付宝、微信、PayPal 等）
  payMethods.forEach((m) => {
    if (m.type === 'stripe' && hasStripe) {
      allPayMethods.push({ ...m, label: m.name || 'Stripe' });
    } else if (m.type !== 'stripe' && m.type !== 'creem') {
      allPayMethods.push({ ...m, label: m.name || m.type });
    }
  });
  // 如果有 Stripe 但不在 payMethods 中，手动添加
  if (hasStripe && !payMethods.find((m) => m.type === 'stripe')) {
    allPayMethods.push({ type: 'stripe', name: 'Stripe', label: 'Stripe' });
  }

  // 渲染下拉选项（带图标和hover效果）
  const renderOptionItem = (option) => {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--semi-color-fill-1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        onClick={() => setSelectedPayMethod(option.value)}
      >
        {renderPayMethodIcon(option.value)}
        <span style={{ fontWeight: 500 }}>{option.label}</span>
      </div>
    );
  };

  // 渲染选中项显示
  const renderSelectedItem = (option) => (
    <div className='flex items-center gap-2'>
      {renderPayMethodIcon(option.value)}
      <span>{option.label}</span>
    </div>
  );

  return (
    <Modal
      title={
        <div className='flex items-center'>
          <Crown className='mr-2' size={18} />
          {t('购买订阅套餐')}
        </div>
      }
      visible={visible}
      onCancel={onCancel}
      footer={null}
      size='small'
      centered
    >
      {plan ? (
        <div className='space-y-4 pb-10'>
          {/* 套餐信息 */}
          <Card className='!rounded-xl !border-0 bg-slate-50 dark:bg-slate-800'>
            <div className='space-y-3'>
              <div className='flex justify-between items-center'>
                <Text strong className='text-slate-700 dark:text-slate-200'>
                  {t('套餐名称')}：
                </Text>
                <Typography.Text
                  ellipsis={{ rows: 1, showTooltip: true }}
                  className='text-slate-900 dark:text-slate-100'
                  style={{ maxWidth: 200 }}
                >
                  {plan.title}
                </Typography.Text>
              </div>
              <div className='flex justify-between items-center'>
                <Text strong className='text-slate-700 dark:text-slate-200'>
                  {t('有效期')}：
                </Text>
                <div className='flex items-center'>
                  <CalendarClock size={14} className='mr-1 text-slate-500' />
                  <Text className='text-slate-900 dark:text-slate-100'>
                    {formatSubscriptionDuration(plan, t)}
                  </Text>
                </div>
              </div>
              {formatSubscriptionResetPeriod(plan, t) !== t('不重置') && (
                <div className='flex justify-between items-center'>
                  <Text strong className='text-slate-700 dark:text-slate-200'>
                    {t('重置周期')}：
                  </Text>
                  <Text className='text-slate-900 dark:text-slate-100'>
                    {formatSubscriptionResetPeriod(plan, t)}
                  </Text>
                </div>
              )}
              <div className='flex justify-between items-center'>
                <Text strong className='text-slate-700 dark:text-slate-200'>
                  {t('总额度')}：
                </Text>
                <div className='flex items-center'>
                  <Package size={14} className='mr-1 text-slate-500' />
                  {totalAmount > 0 ? (
                    <Tooltip content={`${t('原生额度')}：${totalAmount}`}>
                      <Text className='text-slate-900 dark:text-slate-100'>
                        {renderQuota(totalAmount)}
                      </Text>
                    </Tooltip>
                  ) : (
                    <Text className='text-slate-900 dark:text-slate-100'>
                      {t('不限')}
                    </Text>
                  )}
                </div>
              </div>
              {plan?.upgrade_group ? (
                <div className='flex justify-between items-center'>
                  <Text strong className='text-slate-700 dark:text-slate-200'>
                    {t('升级分组')}：
                  </Text>
                  <Text className='text-slate-900 dark:text-slate-100'>
                    {plan.upgrade_group}
                  </Text>
                </div>
              ) : null}
              <Divider margin={8} />
              <div className='flex justify-between items-center'>
                <Text strong className='text-slate-700 dark:text-slate-200'>
                  {t('应付金额')}：
                </Text>
                <Text strong className='text-xl text-purple-600'>
                  {symbol}
                  {displayPrice}
                </Text>
              </div>
            </div>
          </Card>

          {/* 支付方式 */}
          {purchaseLimitReached && (
            <Banner
              type='warning'
              description={`${t('已达到购买上限')} (${purchaseCount}/${purchaseLimit})`}
              className='!rounded-xl'
              closeIcon={null}
            />
          )}

          {hasAnyPayment ? (
            <div className='space-y-3'>
              <Text size='small' type='tertiary'>
                {t('选择支付方式')}：
              </Text>

              {/* 统一的支付方式下拉选择 + 支付按钮 */}
              {allPayMethods.length > 0 && (
                <div className='flex gap-2'>
                  <Select
                    value={selectedPayMethod}
                    onChange={setSelectedPayMethod}
                    style={{ flex: 1 }}
                    size='default'
                    placeholder={t('选择支付方式')}
                    renderSelectedItem={renderSelectedItem}
                    renderOptionItem={renderOptionItem}
                    optionList={allPayMethods.map((m) => ({
                      value: m.type,
                      label: m.label || m.name,
                      ...m,
                    }))}
                    disabled={purchaseLimitReached}
                    dropdownStyle={{ padding: '8px' }}
                  />
                  <Button
                    theme='solid'
                    type='primary'
                    onClick={() => onPay(selectedPayMethod)}
                    loading={paying}
                    disabled={!selectedPayMethod || purchaseLimitReached}
                  >
                    {t('支付')}
                  </Button>
                </div>
              )}

              {/* Creem 单独按钮（如果有） */}
              {hasCreem && (
                <Button
                  theme='light'
                  className='w-full'
                  icon={<IconCreditCard />}
                  onClick={() => onPay('creem')}
                  loading={paying}
                  disabled={purchaseLimitReached}
                >
                  Creem
                </Button>
              )}
            </div>
          ) : (
            <Banner
              type='info'
              description={t('管理员未开启在线支付功能，请联系管理员配置。')}
              className='!rounded-xl'
              closeIcon={null}
            />
          )}
        </div>
      ) : null}
    </Modal>
  );
};

export default SubscriptionPurchaseModal;
