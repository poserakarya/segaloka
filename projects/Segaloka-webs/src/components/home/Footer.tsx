import {
  Camera,
  MessageCircle,
} from "lucide-react";
import { MarketplaceText } from "@/components/marketplace/MarketplaceText";

const paymentMethods = [
  {
    name: "VISA",
    image: "/images/footer/payment/visa.png",
  },
  {
    name: "Mastercard",
    image: "/images/footer/payment/mastercard.png",
  },
  {
    name: "JCB",
    image: null,
  },
  {
    name: "BCA",
    image: null,
  },
  {
    name: "BRI",
    image: null,
  },
  {
    name: "BNI",
    image: null,
  },
  {
    name: "Mandiri",
    image: null,
  },
  {
    name: "BSI",
    image: null,
  },
  {
    name: "GoPay",
    image: null,
  },
  {
    name: "OVO",
    image: null,
  },
  {
    name: "QRIS",
    image: null,
  },
  {
    name: "Virtual Account",
    image: null,
  },
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
                    key={method.name}
                    className="sg-footer-payment-item"
                    aria-label={method.name}
                    title={method.name}
                  >
                    {method.image ? (
                      <img
                        src={method.image}
                        alt={method.name}
                        className="sg-footer-payment-logo"
                      />
                    ) : (
                      <span>{method.name}</span>
                    )}
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

<div className="sg-footer-social-section">
              <h3>
                <MarketplaceText messageKey="footer.follow" />
              </h3>

              <div className="sg-footer-social-list">

                <a href="#" aria-label="Facebook Segaloka">
                  <img
                    src="/images/footer/social/facebook.png"
                    alt=""
                    aria-hidden="true"
                    className="sg-footer-social-icon"
                  />
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

            <a href="/search?category=umrah">
              <MarketplaceText messageKey="footer.umrah" />
            </a>

            <a href="/search?category=haji">
              <MarketplaceText messageKey="footer.hajj" />
            </a>

            <a href="/search?category=halal-tour">
              <MarketplaceText messageKey="footer.halalTour" />
            </a>

            <a href="/search?category=domestic">
              <MarketplaceText messageKey="footer.domestic" />
            </a>

            <a href="/search?category=international">
              <MarketplaceText messageKey="footer.international" />
            </a>

            <a href="/segadeals">
              <MarketplaceText messageKey="footer.segaDeals" />
            </a>

            <a href="/akomodasi">
              <MarketplaceText messageKey="footer.accommodationLa" />
            </a>

            <a href="/search?category=visa">
              <MarketplaceText messageKey="footer.visa" />
            </a>

            <a href="/#destinasi-atraksi">
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

            <a href="/syarat-ketentuan" target="_blank" rel="noopener noreferrer"><MarketplaceText messageKey="footer.terms" /></a>

            <a href="/kebijakan-privasi" target="_blank" rel="noopener noreferrer"><MarketplaceText messageKey="footer.privacy" /></a>

            <a href="/bantuan">
              <MarketplaceText messageKey="footer.helpCenter" />
            </a>


            <div className="sg-footer-app">
              <h3>
                <MarketplaceText messageKey="footer.app" />
              </h3>

              <div className="sg-footer-coming-soon"><MarketplaceText messageKey="footer.comingSoon" /></div>
            </div>
          </div>

        </div>

        <div className="sg-footer-bottom">

          <span><MarketplaceText messageKey="footer.copyright" /></span>

          

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
          <span><MarketplaceText messageKey="footer.home" /></span>
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
          <span><MarketplaceText messageKey="footer.promo" /></span>
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
          <span><MarketplaceText messageKey="footer.orders" /></span>
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
          <span><MarketplaceText messageKey="footer.notifications" /></span>
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
          <span><MarketplaceText messageKey="footer.account" /></span>
        </a>
      </nav>
    </>
  );
}
