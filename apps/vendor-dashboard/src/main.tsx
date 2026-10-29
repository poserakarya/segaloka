import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type User = {
  id: string;
  email: string;
  fullName?: string;
  status?: string;
};

type Membership = {
  role: string;
  organizationId: string | null;
};

type Session = {
  authenticated: boolean;
  user: User;
  memberships: Membership[];
};

async function request(
  path: string,
  options: RequestInit = {}
) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
      result.code ||
      'Permintaan gagal.'
    );
  }

  return result;
}

const navigation = [
  'Ringkasan',
  'Keberangkatan',
  'Booking',
  'Peserta',
  'Sertifikat Perjalanan',
  'Pengaturan'
];

function App() {
  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [active, setActive] = useState('Ringkasan');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    request('/bff/me')
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();

    setSubmitting(true);
    setError('');

    try {
      const result = await request('/bff/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      setSession(result);
      setPassword('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Login gagal.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    setSubmitting(true);

    try {
      await request('/bff/logout', {
        method: 'POST'
      });

      setSession(null);
      setActive('Ringkasan');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Logout gagal.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Memeriksa sesi Segaloka...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="login-layout">
        <section className="login-brand">
          <div className="brand-logo">S</div>
          <div>
            <h1>Segaloka</h1>
            <p>Vendor Management Platform</p>
          </div>

          <div className="brand-message">
            <span className="eyebrow">VENDOR DASHBOARD</span>
            <h2>
              Kelola perjalanan dalam satu sistem.
            </h2>
            <p>
              Operasional vendor, pesanan, layanan,
              keberangkatan, dan sertifikat perjalanan
              dalam satu dashboard terintegrasi.
            </p>
          </div>

          <div className="brand-footer">
            © Segaloka
          </div>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div className="mobile-brand">Segaloka</div>

            <span className="eyebrow">
              AKSES VENDOR
            </span>

            <h2>Masuk ke Dashboard</h2>

            <p className="muted">
              Gunakan akun Vendor Segaloka yang
              sudah terdaftar.
            </p>

            <form onSubmit={login}>
              <label htmlFor="email">
                Alamat Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@vendor.com"
                autoComplete="username"
                required
              />

              <label htmlFor="password">
                Kata Sandi
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                autoComplete="current-password"
                required
              />

              {error && (
                <div className="error-message" role="alert">
                  {error}
                </div>
              )}

              <button
                className="primary-button"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? 'Memproses...'
                  : 'Masuk ke Dashboard'}
              </button>
            </form>

            <p className="login-note">
              Akses hanya untuk pengguna dengan
              izin Dashboard Vendor.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const organization = session.memberships.find(
    membership =>
      membership.role === 'vendor'
  );

  return (
    <div className="dashboard-layout">
      <aside className={
        `sidebar ${sidebarOpen ? 'open' : ''}`
      }>
        <div className="sidebar-brand">
          <span className="sidebar-symbol">S</span>
          <div>
            <strong>Segaloka</strong>
            <small>Vendor Dashboard</small>
          </div>
        </div>

        <div className="sidebar-section-label">
          MENU UTAMA
        </div>

        <nav>
          {navigation.map(item => (
            <button
              key={item}
              type="button"
              className={
                active === item ? 'nav-active' : ''
              }
              onClick={() => {
                setActive(item);
                setSidebarOpen(false);
              }}
            >
              <span className="nav-dot" />
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="account-name">
            {session.user.fullName ||
              session.user.email}
          </div>
          <small>{session.user.email}</small>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <button
            className="menu-toggle"
            type="button"
            onClick={() =>
              setSidebarOpen(!sidebarOpen)
            }
            aria-label="Buka menu"
          >
            ☰
          </button>

          <div className="topbar-title">
            <strong>{active}</strong>
            <span>Dashboard Vendor</span>
          </div>

          <div className="topbar-actions">
            <span className="account-badge">
              {session.user.fullName ||
                session.user.email}
            </span>

            <button
              className="logout-button"
              type="button"
              onClick={logout}
              disabled={submitting}
            >
              Keluar
            </button>
          </div>
        </header>

        <main className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                SEGALOKA VENDOR
              </span>
              <h1>{active}</h1>
              <p>
                {active === 'Ringkasan'
                  ? 'Informasi akun dan akses operasional Vendor.'
                  : `Modul ${active} akan dihubungkan dengan API operasional Segaloka.`}
              </p>
            </div>
          </div>

          {active === 'Ringkasan' ? (
            <div className="info-grid">
              <article className="info-card">
                <span>Nama Pengguna</span>
                <strong>
                  {session.user.fullName ||
                    session.user.email}
                </strong>
                <small>Akun terautentikasi</small>
              </article>

              <article className="info-card">
                <span>Hak Akses</span>
                <strong>
                  {organization?.role || 'Vendor'}
                </strong>
                <small>Role dari backend</small>
              </article>

              <article className="info-card">
                <span>Organisasi</span>
                <strong className="long-value">
                  {organization?.organizationId ||
                    'Belum tersedia'}
                </strong>
                <small>ID organisasi</small>
              </article>
            </div>
          ) : (
            <article className="module-card">
              <h2>{active}</h2>
              <p>
                Halaman telah disiapkan.
                Belum ada data yang ditampilkan
                karena integrasi modul belum selesai.
              </p>
            </article>
          )}

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
        </main>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Tutup menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
