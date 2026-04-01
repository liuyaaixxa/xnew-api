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

import { API } from '../helpers';

/**
 * Get device tokens list
 * @returns {Promise} API response
 */
export const getDeviceTokens = async () => {
  const res = await API.get('/api/device-token/');
  return res.data;
};

/**
 * Create a new device token
 * @param {Object} data - Token data { name, domain }
 * @returns {Promise} API response
 */
export const createDeviceToken = async (data) => {
  const res = await API.post('/api/device-token/', data);
  return res.data;
};

/**
 * Delete a device token
 * @param {number} id - Token ID
 * @returns {Promise} API response
 */
export const deleteDeviceToken = async (id) => {
  const res = await API.delete(`/api/device-token/${id}`);
  return res.data;
};
