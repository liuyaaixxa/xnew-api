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

import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useModelPricingData } from '../../hooks/model-pricing/useModelPricingData';
import { getSystemName } from '../../helpers';
import { getLobeHubIcon } from '../../helpers/render-icons';
import './model-market.css';

const MODELS_PER_PAGE = 9;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function ModelMarket() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const systemName = getSystemName() || 'Teniu.AI';
  const observerRef = useRef(null);

  const PRICE_RANGES = [
    { key: 'all', label: t('全部') },
    { key: 'free', label: t('免费') },
    { key: 'under1', label: t('低于$1/1M tokens') },
    { key: '1to10', label: '$1-$10/1M tokens' },
    { key: 'above10', label: t('高于$10/1M tokens') },
  ];

  const CAPABILITIES = [t('流式'), t('函数调用'), t('JSON模式'), t('视觉输入')];

  // Infer model capabilities from available data (tags, model name, endpoints)
  const getModelCapabilities = (model) => {
    const caps = new Set();
    const name = (model.model_name || '').toLowerCase();
    const tags = model.tag_list || [];

    // 流式: all models support streaming via OpenAI-compatible endpoints
    caps.add(t('流式'));

    // 函数调用 & JSON模式: Chat/LLM models
    const isChatModel = tags.includes('Chat/LLM') ||
      /gpt|claude|gemini|qwen|llama|chat|command|mistral/i.test(name);
    if (isChatModel) {
      caps.add(t('函数调用'));
      caps.add(t('JSON模式'));
    }

    // 视觉输入: multimodal models
    const hasVision = tags.includes('Image') || tags.includes('Video') ||
      /gpt-4o|gpt-4-turbo|gemini.*(?:flash|pro)|claude.*sonnet|vision|vl|dall-e|multimodal/i.test(name);
    if (hasVision) {
      caps.add(t('视觉输入'));
    }

    return caps;
  };

  const SORT_OPTIONS = [
    { value: 'popular', label: t('排序: 热门') },
    { value: 'price-asc', label: t('排序: 价格低→高') },
    { value: 'price-desc', label: t('排序: 价格高→低') },
    { value: 'newest', label: t('排序: 最新') },
  ];

  const {
    searchValue,
    setSearchValue,
    loading,
    models,
    filteredModels,
    vendorsMap,
    endpointMap,
    displayPrice,
    filterTag,
    setFilterTag,
    filterVendor,
    setFilterVendor,
    tagsList,
    userState,
  } = useModelPricingData();

  const [compareList, setCompareList] = useState([]);
  const [priceFilter, setPriceFilter] = useState('all');
  const [activeCaps, setActiveCaps] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('popular');

  useEffect(() => {
    document.title = systemName + ' — ' + t('模型市场');
  }, [systemName, t]);

  // Scroll animations
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 60);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.mm-fade-in').forEach((el) => {
      observerRef.current.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [filteredModels, currentPage, t]);

  // Build categories from model tags
  const categories = useMemo(() => {
    const cats = [{ key: 'all', label: t('全部模型'), count: models.length }];
    if (tagsList && tagsList.length > 0) {
      tagsList.forEach((tag) => {
        const count = models.filter(
          (m) => m.tag_list && Array.isArray(m.tag_list) && m.tag_list.includes(tag.name)
        ).length;
        if (count > 0) {
          cats.push({ key: tag.name, label: tag.name, count });
        }
      });
    }
    return cats;
  }, [models, tagsList, t]);

  // Build provider filters from vendorsMap
  const providers = useMemo(() => {
    const provs = [{ key: 'all', label: t('全部供应商'), count: models.length }];
    const vendorCounts = {};
    models.forEach((m) => {
      if (m.vendor_name) {
        vendorCounts[m.vendor_name] = (vendorCounts[m.vendor_name] || 0) + 1;
      } else {
        vendorCounts['unknown'] = (vendorCounts['unknown'] || 0) + 1;
      }
    });
    Object.entries(vendorCounts).forEach(([name, count]) => {
      provs.push({ key: name, label: name === 'unknown' ? t('未知') : name, count });
    });
    return provs;
  }, [models, t]);

  // Apply client-side filters (price range, capabilities)
  const displayModels = useMemo(() => {
    let result = [...filteredModels];

    // Price range filter
    if (priceFilter === 'free') {
      result = result.filter((m) => (m.model_ratio || 0) === 0);
    } else if (priceFilter === 'under1') {
      result = result.filter((m) => (m.model_ratio || 0) > 0 && (m.model_ratio || 0) < 1);
    } else if (priceFilter === '1to10') {
      result = result.filter((m) => (m.model_ratio || 0) >= 1 && (m.model_ratio || 0) <= 10);
    } else if (priceFilter === 'above10') {
      result = result.filter((m) => (m.model_ratio || 0) > 10);
    }

    // Capability filter
    if (activeCaps.length > 0) {
      result = result.filter((m) => {
        const caps = getModelCapabilities(m);
        return activeCaps.every((c) => caps.has(c));
      });
    }

    // Sort
    if (sortBy === 'price-asc') {
      result.sort((a, b) => (a.model_ratio || 0) - (b.model_ratio || 0));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => (b.model_ratio || 0) - (a.model_ratio || 0));
    }

    return result;
  }, [filteredModels, priceFilter, sortBy, activeCaps, t]);

  const totalPages = Math.max(1, Math.ceil(displayModels.length / MODELS_PER_PAGE));
  const paginatedModels = displayModels.slice(
    (currentPage - 1) * MODELS_PER_PAGE,
    currentPage * MODELS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, filterTag, filterVendor, priceFilter]);

  // Compare logic
  const toggleCompare = (modelName) => {
    setCompareList((prev) => {
      if (prev.includes(modelName)) {
        return prev.filter((m) => m !== modelName);
      }
      if (prev.length >= 3) return prev;
      return [...prev, modelName];
    });
  };

  const clearCompare = () => setCompareList([]);

  const handleUseModel = () => {
    if (userState?.user) {
      navigate('/console/playground');
    } else {
      navigate('/login');
    }
  };

  const handleResetFilters = () => {
    setFilterTag('all');
    setFilterVendor('all');
    setPriceFilter('all');
    setActiveCaps([]);
    setSearchValue('');
  };

  const getEndpointBadges = (model) => {
    if (!model.supported_endpoint_types) return [];
    return model.supported_endpoint_types.map((ep) => {
      const info = endpointMap?.[ep];
      return { key: ep, label: info?.display_name || ep };
    });
  };

  const getPriceLabel = (model) => {
    const ratio = model.model_ratio || 0;
    if (ratio === 0) return t('免费');
    return displayPrice(ratio);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          className={`mm-page-num${i === currentPage ? ' active' : ''}`}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </button>
      );
    }
    return (
      <div className="mm-pagination">
        <button
          className="mm-page-num"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        >
          &larr;
        </button>
        {pages}
        <button
          className="mm-page-num"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        >
          &rarr;
        </button>
      </div>
    );
  };

  const renderSkeletons = () => (
    <div className="mm-model-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="mm-model-card" key={`skel-${i}`}>
          <div className="mm-card-header">
            <div className="mm-skeleton" style={{ width: 50, height: 50, borderRadius: 12 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <div className="mm-skeleton" style={{ width: '60%', height: 20 }} />
              <div className="mm-skeleton" style={{ width: '40%', height: 14 }} />
            </div>
          </div>
          <div className="mm-card-body">
            <div className="mm-skeleton" style={{ width: '100%', height: 16 }} />
            <div className="mm-skeleton" style={{ width: '80%', height: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="mm-skeleton" style={{ width: 80, height: 26, borderRadius: 6 }} />
              <div className="mm-skeleton" style={{ width: 90, height: 26, borderRadius: 6 }} />
            </div>
          </div>
          <div className="mm-card-footer">
            <div className="mm-skeleton" style={{ width: 70, height: 28 }} />
            <div className="mm-skeleton" style={{ width: 100, height: 36, borderRadius: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );

  const providerCount = Object.keys(vendorsMap).length || 8;

  return (
    <div className="mm-page">
      <div className="mm-layout">
        {/* Sidebar */}
        <aside className="mm-sidebar">
          <div className="mm-search-box">
            <SearchIcon />
            <input
              type="text"
              placeholder={t('搜索模型...')}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <div className="mm-filter-group">
            <div className="mm-filter-title">{t('分类')}</div>
            {categories.map((cat) => (
              <div
                key={cat.key}
                className={`mm-filter-item${filterTag === cat.key ? ' active' : ''}`}
                onClick={() => setFilterTag(cat.key)}
              >
                <span className="mm-filter-check">
                  <span className={`mm-checkbox${filterTag === cat.key ? ' checked' : ''}`} />
                  {cat.label}
                </span>
                <span className="mm-filter-count">{cat.count}</span>
              </div>
            ))}
          </div>

          <div className="mm-filter-group">
            <div className="mm-filter-title">{t('供应商')}</div>
            {providers.map((prov) => (
              <div
                key={prov.key}
                className={`mm-filter-item${filterVendor === prov.key ? ' active' : ''}`}
                onClick={() => setFilterVendor(prov.key)}
              >
                <span className="mm-filter-check">
                  <span className={`mm-checkbox${filterVendor === prov.key ? ' checked' : ''}`} />
                  {prov.label}
                </span>
                <span className="mm-filter-count">{prov.count}</span>
              </div>
            ))}
          </div>

          <div className="mm-filter-group">
            <div className="mm-filter-title">{t('价格范围')}</div>
            {PRICE_RANGES.map((pr) => (
              <div
                key={pr.key}
                className={`mm-filter-item${priceFilter === pr.key ? ' active' : ''}`}
                onClick={() => setPriceFilter(pr.key)}
              >
                <span className="mm-filter-check">
                  <span className={`mm-checkbox${priceFilter === pr.key ? ' checked' : ''}`} />
                  {pr.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mm-filter-group">
            <div className="mm-filter-title">{t('能力')}</div>
            {CAPABILITIES.map((cap) => (
              <div
                key={cap}
                className={`mm-filter-item${activeCaps.includes(cap) ? ' active' : ''}`}
                onClick={() => {
                  setActiveCaps((prev) =>
                    prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
                  );
                }}
              >
                <span className="mm-filter-check">
                  <span className={`mm-checkbox${activeCaps.includes(cap) ? ' checked' : ''}`} />
                  {cap}
                </span>
              </div>
            ))}
          </div>

          <button className="mm-reset-btn" onClick={handleResetFilters}>
            {t('重置所有筛选')}
          </button>
        </aside>

        {/* Main */}
        <main className="mm-main">
          <div className="mm-breadcrumb">
            <span>{t('首页')}</span> <span className="mm-breadcrumb-sep">/</span> <span>{t('模型市场')}</span>
          </div>

          <div className="mm-top-bar">
            <div className="mm-top-bar-left">
              <h1 className="mm-page-title">{t('模型市场')}</h1>
              <p className="mm-page-sub">
                {t('浏览 {{count}} 个AI模型，覆盖 {{providers}} 家供应商。比较定价、能力和基准测试。', { count: models.length, providers: providerCount })}
              </p>
            </div>
            <div className="mm-top-bar-right">
              <select
                className="mm-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            renderSkeletons()
          ) : displayModels.length === 0 ? (
            <div className="mm-empty">
              <p>{t('没有匹配的模型。')}</p>
              <button className="mm-reset-btn" style={{ width: 'auto', padding: '10px 24px' }} onClick={handleResetFilters}>
                {t('重置筛选')}
              </button>
            </div>
          ) : (
            <>
              <div className="mm-model-grid">
                {paginatedModels.map((model) => {
                  const badges = getEndpointBadges(model);
                  const isFeatured = model.badge === 'featured';
                  const isCompared = compareList.includes(model.model_name);
                  return (
                    <div
                      className={`mm-model-card mm-fade-in${isFeatured ? ' featured' : ''}${isCompared ? ' compared' : ''}`}
                      key={model.model_name}
                      onClick={() => toggleCompare(model.model_name)}
                    >
                      {model.badge && ['new', 'hot'].includes(model.badge) && (
                        <span className={`mm-tag-${model.badge}`}>{model.badge.toUpperCase()}</span>
                      )}
                      <div className="mm-card-header">
                        <div className="mm-provider-icon">
                          {getLobeHubIcon(model.icon || model.vendor_icon, 28)}
                        </div>
                        <div className="mm-card-header-info">
                          <h3 className="mm-model-name">{model.display_name || model.model_name}</h3>
                          <span className="mm-model-provider">{model.vendor_name || t('未知')}</span>
                        </div>
                      </div>
                      <div className="mm-card-body">
                        <p className="mm-model-desc">
                          {model.description || t('先进的AI模型，具有卓越的性能。')}
                        </p>
                        <div className="mm-specs-row">
                          {badges.slice(0, 4).map((b) => {
                            const isGold = /context|open.?source|128k|1M/i.test(b.key);
                            return (
                              <span className={`mm-spec-tag${isGold ? ' gold' : ''}`} key={b.key}>
                                {b.label}
                              </span>
                            );
                          })}
                        </div>
                        <div className="mm-cap-row">
                          {CAPABILITIES.filter((cap) => getModelCapabilities(model).has(cap)).map((cap) => {
                            const active = activeCaps.length === 0 || activeCaps.includes(cap);
                            return (
                              <span className={`mm-cap-badge${active ? ' active' : ''}`} key={cap}>
                                {cap}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mm-card-footer">
                        <div className="mm-price-info">
                          <span className="mm-price-value">{getPriceLabel(model)}</span>
                          <span className="mm-price-label">{t('每1M tokens')}</span>
                        </div>
                        <button
                          className={`mm-card-action primary`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUseModel();
                          }}
                        >
                          {t('使用模型')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {renderPagination()}
            </>
          )}
        </main>
      </div>

      {/* Compare Bar */}
      <div className={`mm-compare-bar${compareList.length > 0 ? ' visible' : ''}`}>
        <div className="mm-compare-items">
          <span className="mm-compare-label">{t('对比')} ({compareList.length}/3)</span>
          {compareList.length === 0 && (
            <span className="mm-compare-empty">{t('选择模型以比较定价和功能')}</span>
          )}
          {compareList.map((name) => (
            <span className="mm-compare-chip" key={name}>
              {name}
              <span className="mm-compare-remove" onClick={(e) => { e.stopPropagation(); toggleCompare(name); }}>×</span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="mm-compare-clear" onClick={clearCompare}>{t('清除')}</button>
          <button className="mm-compare-go">{t('开始对比')}</button>
        </div>
      </div>
    </div>
  );
}
