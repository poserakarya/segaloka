(function () {
  'use strict';

  async function jsonRequest(path, options) {
    const response = await fetch(path, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...(options || {})
    });
    const body = await response.json();

    if (!response.ok) {
      const error = new Error(body.code || 'REQUEST_FAILED');
      error.status = response.status;
      throw error;
    }

    return body;
  }

  window.SegalokaTravelSessionReady = (async function () {
    try {
      const [access, profile] = await Promise.all([
        jsonRequest('/bff/dashboard/access'),
        jsonRequest('/bff/me')
      ]);

      const travelDashboards = (
        Array.isArray(access.dashboards)
          ? access.dashboards
          : []
      ).filter(item =>
        item.dashboard === 'travel' &&
        item.role === 'travel' &&
        typeof item.organizationId === 'string'
      );

      if (access.authenticated !== true || travelDashboards.length === 0) {
        throw new Error('TRAVEL_ACCESS_REQUIRED');
      }

      const account = document.getElementById('travel-account-button');
      const accountName = account?.querySelector(
        '.travel-account-copy strong'
      );
      const accountStatus = account?.querySelector(
        '.travel-account-copy small'
      );
      const runtimeLabel = document.querySelector(
        '.travel-runtime-indicator span:last-child'
      );

      if (accountName) {
        accountName.textContent =
          profile.user?.fullName || profile.user?.email || 'Travel';
      }
      if (accountStatus) {
        accountStatus.textContent =
          travelDashboards.length === 1
            ? 'Travel · terautentikasi'
            : 'Travel · beberapa organisasi';
      }
      if (account) {
        account.disabled = false;
        account.setAttribute('aria-label', 'Keluar dari Dashboard Travel');
      }
      if (runtimeLabel) {
        runtimeLabel.textContent = 'API Segaloka · terhubung';
      }

      if (account) {
        account.addEventListener('click', async function () {
          account.disabled = true;
          try {
            await jsonRequest('/bff/logout', { method: 'POST' });
            window.location.replace('/');
          } catch (error) {
            account.disabled = false;
            if (runtimeLabel) {
              runtimeLabel.textContent = 'Logout gagal · ' +
                (error.message || 'API tidak tersedia');
            }
            console.error('[Travel session] Logout gagal.', error);
          }
        });
      }

      return {
        user: profile.user,
        dashboards: travelDashboards
      };
    } catch (error) {
      if (error.status === 401) {
        window.location.replace('/');
      } else {
        const runtimeLabel = document.querySelector(
          '.travel-runtime-indicator span:last-child'
        );
        if (runtimeLabel) {
          runtimeLabel.textContent = 'API · tidak terverifikasi';
        }
        console.error('[Travel session] Validasi akses gagal.', error);
      }
      throw error;
    }
  })();
})();
