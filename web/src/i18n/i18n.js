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

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCNTranslation from './locales/zh-CN.json';
import { supportedLanguages } from './language';

const loaders = {
  en: () => import('./locales/en.json'),
  fr: () => import('./locales/fr.json'),
  'zh-TW': () => import('./locales/zh-TW.json'),
  ru: () => import('./locales/ru.json'),
  ja: () => import('./locales/ja.json'),
  vi: () => import('./locales/vi.json'),
};

async function loadLanguageAsync(lng) {
  const loader = loaders[lng];
  if (!loader || i18n.hasResourceBundle(lng, 'translation')) return;
  const res = await loader();
  const data = res.default || res;
  const translations = data.translation || data;
  i18n.addResourceBundle(lng, 'translation', translations, true, true);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    load: 'currentOnly',
    supportedLngs: supportedLanguages,
    resources: {
      'zh-CN': zhCNTranslation,
    },
    fallbackLng: 'zh-CN',
    nsSeparator: false,
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', loadLanguageAsync);

if (i18n.language && i18n.language !== 'zh-CN') {
  loadLanguageAsync(i18n.language);
}

window.__i18n = i18n;

export default i18n;
