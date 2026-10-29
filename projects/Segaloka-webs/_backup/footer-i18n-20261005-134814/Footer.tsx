import {
  Camera,
  MessageCircle,
} from "lucide-react";
import { MarketplaceText } from "@/components/marketplace/MarketplaceText";

const paymentMethods = [
  "VISA",
  "Mastercard",
  "JCB",
  "BCA",
  "BRI",
  "BNI",
  "Mandiri",
  "BSI",
  "GoPay",
  "OVO",
  "QRIS",
  "Virtual Account",
];

export function Footer() {
  return (
    <>
      <footer className="sg-footer">
      <div className="sg-footer-shell">

        <div className="sg-footer-grid">

          <div className="sg-footer-brand-column">
            <a href="/" className="sg-footer-real-logo" aria-label="Segaloka">
              <img
                src="/images/brand/segaloka-logo.png"
                alt="Segaloka"
              />
            </a>

            <p className="sg-footer-description">
              <MarketplaceText messageKey="footer.description" />
            </p>

            <a
              href="/partner/travel"
              className="sg-footer-partner-button"
            >
              <span className="sg-footer-partner-symbol" aria-hidden="true">↗</span>
              <MarketplaceText messageKey="footer.partner" />
            </a>


            <div className="sg-footer-payment">
              <h3>
                <MarketplaceText messageKey="footer.payment" />
              </h3>

              <div className="sg-footer-payment-grid">
                {paymentMethods.map((method) => (
                  <div
                    key={method}
                    className="sg-footer-payment-item"
                  >
                    {method}
                  </div>
                ))}
              </div>
            </div>
          </div>


          <div className="sg-footer-menu-column">
            <h3>
              <MarketplaceText messageKey="footer.about" />
            </h3>

            <a href="/cara-pesan">
              <MarketplaceText messageKey="footer.howToBook" />
            </a>

            <a href="/bantuan">
              <MarketplaceText messageKey="footer.contactUs" />
            </a>

            <a href="/pusat-bantuan">
              <MarketplaceText messageKey="footer.helpCenter" />
            </a>

            <a href="/karier">
              <MarketplaceText messageKey="footer.career" />
            </a>

            <a href="/tentang-kami">
              <MarketplaceText messageKey="footer.aboutUs" />
            </a>

            <a href="/mitra">
              Mitra
            </a>


            <div className="sg-footer-social-section">
              <h3>
                <MarketplaceText messageKey="footer.follow" />
              </h3>

              <div className="sg-footer-social-list">

                <a href="#" aria-label="Facebook Segaloka">
                  <span className="sg-footer-social-symbol" aria-hidden="true">f</span>
                  <span>Facebook</span>
                </a>

                <a href="#" aria-label="Instagram Segaloka">
                  <Camera size={18} />
                  <span>Instagram</span>
                </a>

                <a href="#" aria-label="TikTok Segaloka">
                  <span className="sg-footer-social-symbol" aria-hidden="true">♪</span>
                  <span>TikTok</span>
                </a>

                <a href="#" aria-label="YouTube Segaloka">
                  <span className="sg-footer-social-symbol sg-footer-social-play" aria-hidden="true">▶</span>
                  <span>YouTube</span>
                </a>

                <a href="#" aria-label="WhatsApp Segaloka">
                  <MessageCircle size={18} />
                  <span>WhatsApp</span>
                </a>

              </div>
            </div>
          </div>


          <div className="sg-footer-menu-column">
            <h3>
              <MarketplaceText messageKey="footer.products" />
            </h3>

            <a href="/umrah">
              Umrah
            </a>

            <a href="/haji">
              Haji
            </a>

            <a href="/halal-tour">
              Halal Tour
            </a>

            <a href="/tour-domestic">
              Tour Domestic
            </a>

            <a href="/tour-international">
              Tour International
            </a>

            <a href="/segadeals">
              SegaDeals
            </a>

            <a href="/akomodasi">
              Akomodasi & LA
            </a>

            <a href="/atraksi">
              <MarketplaceText messageKey="footer.destinationsAttractions" />
            </a>
          </div>


          <div className="sg-footer-menu-column">
            <h3>
              <MarketplaceText messageKey="footer.other" />
            </h3>

            <a href="/affiliate">
              <MarketplaceText messageKey="footer.affiliate" />
            </a>

            <a href="/mitra">
              <MarketplaceText messageKey="footer.travelPartner" />
            </a>

            <a href="/daftar-travel">
              <MarketplaceText messageKey="footer.registerTravel" />
            </a>

            <a href="/daftar-vendor">
              <MarketplaceText messageKey="footer.registerVendor" />
            </a>

            <a href="/syarat-ketentuan" target="_blank" rel="noopener noreferrer">
              Syarat & Ketentuan
            </a>

            <a href="/kebijakan-privasi" target="_blank" rel="noopener noreferrer">
              Kebijakan Privasi
            </a>

            <a href="/bantuan">
              <MarketplaceText messageKey="footer.helpCenter" />
            </a>


            <div className="sg-footer-app">
              <h3>
                <MarketplaceText messageKey="footer.app" />
              </h3>

              <div className="sg-footer-coming-soon">
                Segera Hadir
              </div>
            </div>
          </div>

        </div>

        <div className="sg-footer-bottom">

          <span>
            © 2026 Segaloka. Seluruh hak dilindungi.
          </span>

          

        </div>

      </div>
    </footer>

      <nav
        className="sg-mobile-bottom-nav"
        aria-label="Navigasi mobile"
      >
        <a
          href="/"
          className="sg-mobile-bottom-item active"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"
              fill="currentColor"
            />
          </svg>
          <span>Beranda</span>
        </a>

        <a
          href="#promo"
          className="sg-mobile-bottom-item"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="m9 15 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="15" cy="14" r="1" fill="currentColor" />
          </svg>
          <span>Promo</span>
        </a>

        <a
          href="/pesanan"
          className="sg-mobile-bottom-item"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 4h14v16H5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M8 8h8M8 12h8M8 16h5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span>Pesanan</span>
        </a>

        <a
          href="/notifikasi"
          className="sg-mobile-bottom-item"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M10 21h4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span>Notifikasi</span>
        </a>

        <a
          href="/masuk"
          className="sg-mobile-bottom-item"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle
              cx="12"
              cy="8"
              r="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M4 21c.6-4.4 3.2-7 8-7s7.4 2.6 8 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span>Akun</span>
        </a>
      </nav>
    </>
  );
}
