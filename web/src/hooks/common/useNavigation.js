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

import { useMemo } from 'react';

export const useNavigation = (t, docsLink, headerNavModules, { isLoggedIn } = {}) => {
  const mainNavLinks = useMemo(() => {
    // 默认配置，如果没有传入配置则显示所有模块
    const defaultModules = {
      home: true,
      console: true,
      pricing: true,
      about: true,
    };

    // 使用传入的配置或默认配置
    const modules = headerNavModules || defaultModules;

    const allLinks = [
      {
        text: t('首页'),
        itemKey: 'storeHome',
        to: '/store',
      },
      {
        text: t('模型市场'),
        itemKey: 'modelMarket',
        to: '/model-market',
      },
      {
        text: t('算力池计划'),
        itemKey: 'home',
        to: '/compute-pool',
      },
      {
        text: t('控制台'),
        itemKey: 'console',
        to: '/console',
      },
      {
        text: t('关于'),
        itemKey: 'about',
        to: '/about',
      },
    ];

    // 根据配置过滤导航链接
    return allLinks.filter((link) => {
      if (link.itemKey === 'storeHome') {
        // 登录状态隐藏首页，未登录状态显示
        if (isLoggedIn) return false;
        return modules[link.itemKey] !== false;
      }
      if (link.itemKey === 'home') {
        return modules[link.itemKey] !== false;
      }
      if (link.itemKey === 'modelMarket') {
        return modules[link.itemKey] !== false;
      }
      if (link.itemKey === 'pricing') {
        // 支持新的pricing配置格式
        return typeof modules.pricing === 'object'
          ? modules.pricing.enabled
          : modules.pricing;
      }
      return modules[link.itemKey] === true;
    });
  }, [t, docsLink, headerNavModules, isLoggedIn]);

  return {
    mainNavLinks,
  };
};
