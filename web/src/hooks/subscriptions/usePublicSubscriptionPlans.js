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

import { useEffect, useState } from 'react';
import { API } from '../../helpers';

// usePublicSubscriptionPlans fetches the publicly-visible enabled subscription
// plans from /api/subscription/public-plans. Used by the model market page so
// that anonymous (logged-out) visitors can see and click into plans before
// signing in.
export const usePublicSubscriptionPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    API.get('/api/subscription/public-plans')
      .then((res) => {
        if (cancelled) return;
        const data = res?.data?.data;
        setPlans(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setPlans([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { plans, loading };
};

export default usePublicSubscriptionPlans;
