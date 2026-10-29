"use client";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";
import { visaBookingCopy } from "@/ui/visa-booking/visa-booking.i18n";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  getVisaProductBySlug,
} from "@/ui/visa-detail";

import { translateVisaValue } from "@/ui/visa-detail/visa-detail.presentation";

type VisaSnapshot = {
  country: string;
  productSlug: string;
  vendorSlug: string;
  applicants: number;
  paymentTerm: "full" | "dp";
  departureDate: string;
  returnDate: string;
};

type VisaBookingClientProps = {
  slug: string;
  snapshot: VisaSnapshot;
};


export function VisaBookingClient({
  slug,
  snapshot,
}: VisaBookingClientProps) {
  const router = useRouter();

  const {
    language,
    formatCurrency,
  } = useMarketplacePreferences();

  const copy =
    visaBookingCopy[language];
  const product =
    getVisaProductBySlug(
      snapshot.productSlug || slug,
    );

  const [step, setStep] =
    useState(1);

  const [
    selectedPaymentMethod,
    setSelectedPaymentMethod,
  ] = useState<string>("");

  const applicantCount =
    Math.max(
      1,
      snapshot.applicants,
    );

  const createApplicant = (
    index: number,
  ) => ({
    id: `applicant-${index + 1}`,
    fullName: "",
    gender: "",
    birthPlace: "",
    birthDate: "",
    nationality: "Indonesia",
    passportNumber: "",
    passportIssueDate: "",
    passportExpiryDate: "",
  });

  const [applicantList, setApplicantList] =
    useState(() =>
      Array.from(
        { length: applicantCount },
        (_, index) =>
          createApplicant(index),
      ),
    );

  const [bookingData, setBookingData] =
    useState({
      email: "",
      phone: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      destinationCity: "",
      travelPurpose: "",
      departureDate:
        snapshot.departureDate || "",
      returnDate:
        snapshot.returnDate || "",
    });

  function updateApplicant(
    index: number,
    field:
      | "fullName"
      | "gender"
      | "birthPlace"
      | "birthDate"
      | "nationality"
      | "passportNumber"
      | "passportIssueDate"
      | "passportExpiryDate",
    value: string,
  ) {
    setApplicantList(
      (current) =>
        current.map(
          (item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  [field]: value,
                }
              : item,
        ),
    );
  }
  const steps =
    copy.steps;

  const applicants =
    applicantList.length;

  const unitPrice =
    product?.price ?? 0;

  const totalPrice =
    unitPrice * applicants;

  /*
   * DP HANYA ada jika Vendor memang
   * mengaktifkan depositPolicy.
   *
   * Tidak ada fallback DP.
   * Tidak ada hardcode DP 30%.
   */
  const hasDp =
    product?.depositPolicy?.enabled ===
    true;

  const dpPerApplicant =
    hasDp &&
    product?.depositPolicy
      ? product.depositPolicy.type ===
        "percentage"
        ? Math.round(
            unitPrice *
              (
                product.depositPolicy.value /
                100
              ),
          )
        : Math.min(
            product.depositPolicy.value,
            unitPrice,
          )
      : null;

  const dpTotal =
    dpPerApplicant !== null
      ? dpPerApplicant * applicants
      : null;

  /*
   * Query paymentTerm tidak boleh
   * memaksa DP jika produknya tidak
   * memiliki depositPolicy.
   */
  const paymentTerm:
    | "full"
    | "dp" =
    hasDp &&
    snapshot.paymentTerm === "dp"
      ? "dp"
      : "full";

  const paymentNow =
    paymentTerm === "dp" &&
    dpTotal !== null
      ? dpTotal
      : totalPrice;

  const remaining =
    Math.max(
      0,
      totalPrice - paymentNow,
    );

  const requirements =
    product?.requirements ?? [];

  const documents =
    product?.documents ?? [];

  const applicantValid =
    applicantList.length ===
      applicantCount &&
    applicantList.every(
      (item) =>
        Boolean(
          item.fullName.trim() &&
          item.gender &&
          item.birthPlace.trim() &&
          item.birthDate &&
          item.nationality.trim() &&
          item.passportNumber.trim() &&
          item.passportIssueDate &&
          item.passportExpiryDate,
        ),
    );

  const summaryRows =
    useMemo(
      () =>
        applicantList.map(
          (item, index) => ({
            id: item.id,
            title:
              applicantList.length > 1
                ? copy.applicantNumber(index + 1)
                : copy.applicant,
            fullName:
              item.fullName || "-",
            gender:
              item.gender === "male"
                ? copy.male
                : item.gender === "female"
                  ? copy.female
                  : "-",
            birthPlace:
              item.birthPlace || "-",
            birthDate:
              item.birthDate || "-",
            nationality:
              item.nationality || "-",
            passportNumber:
              item.passportNumber || "-",
            passportIssueDate:
              item.passportIssueDate || "-",
            passportExpiryDate:
              item.passportExpiryDate || "-",
          }),
        ),
      [
        applicantList,
        copy.applicant,
        copy.applicantNumber,
        copy.female,
        copy.male,
      ],
    );

  if (!product) {
    return (
      <main
        style={{
          minHeight: "70vh",
          padding: "48px 16px",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          <h1>
            Produk Visa tidak ditemukan
          </h1>

          <p>
            Produk yang dipilih belum
            tersedia untuk proses booking.
          </p>
        </div>
      </main>
    );
  }

  function nextStep() {
    if (
      step === 1 &&
      !applicantValid
    ) {
      return;
    }

    setStep(
      (current) =>
        Math.min(
          5,
          current + 1,
        ),
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function previousStep() {
    setStep(
      (current) =>
        Math.max(
          1,
          current - 1,
        ),
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const handleConfirmOrder = () => {
    const params = new URLSearchParams();

    params.set("type", "visa");
    params.set("country", snapshot.country);
    params.set(
      "visaProduct",
      snapshot.productSlug || slug,
    );
    params.set(
      "vendor",
      snapshot.vendorSlug,
    );
    params.set(
      "applicants",
      String(applicantList.length),
    );
    params.set(
      "paymentTerm",
      snapshot.paymentTerm,
    );
    params.set(
      "paymentStatus",
      "pending",
    );

    router.push(
      `/booking/${encodeURIComponent(
        snapshot.productSlug || slug,
      )}/pesanan?${params.toString()}`,
    );
  };

  return (
    <main className="visa-booking">
      <section className="visa-booking__hero">
        <div className="visa-booking__hero-inner">
          <div className="visa-booking__breadcrumb">
            Visa
            <span>›</span>
            {product.countrySlug}
            <span>›</span>
            {translateVisaValue(product.title, language)}
          </div>

          <h1>
            {product.countrySlug
              .charAt(0)
              .toUpperCase() +
              product.countrySlug.slice(1)}
          </h1>

          <p>{translateVisaValue(product.title, language)}</p>
        </div>
      </section>

      <section className="visa-booking__steps">
        {steps.map(
          (title, index) => {
            const number =
              index + 1;

            const done =
              step > number;

            const active =
              step === number;

            return (
              <div
                key={title}
                className={[
                  "visa-booking__step",
                  active
                    ? "is-active"
                    : "",
                  done
                    ? "is-done"
                    : "",
                ].join(" ")}
              >
                <span>
                  {done ? (
                    <Check size={15} />
                  ) : (
                    number
                  )}
                </span>

                <strong>
                  {title}
                </strong>
              </div>
            );
          },
        )}
      </section>

      <div className="visa-booking__layout">
        <section className="visa-booking__content">
          {step === 1 && (
            <article className="visa-booking__card visa-booking__applicant-card">
              <header className="visa-booking__page-heading">
                <h2>{copy.applicantData}</h2>
                <p>
                  {copy.applicantDataDescription}
                </p>
              </header>

              {applicantList.map((applicant, index) => (
                <section
                  className="visa-booking__form-section"
                  key={applicant.id}
                >
                  <h3>
                    {applicantList.length > 1
                      ? copy.personalDataApplicant(index + 1)
                      : copy.personalData}
                  </h3>

                  <div className="visa-booking__form">
                    <label className="full">
                      <span>{copy.fullNamePassport}</span>
                      <input
                        value={applicant.fullName}
                        onChange={(event) =>
                          updateApplicant(
                            index,
                            "fullName",
                            event.target.value,
                          )
                        }
                        placeholder={copy.fullNamePlaceholder}
                      />
                    </label>

                    <label>
                      <span>{copy.genderRequired}</span>
                      <select
                        value={applicant.gender}
                        onChange={(event) =>
                          updateApplicant(
                            index,
                            "gender",
                            event.target.value,
                          )
                        }
                      >
                        <option value="">{copy.selectGender}</option>
                        <option value="male">{copy.male}</option>
                        <option value="female">{copy.female}</option>
                      </select>
                    </label>

                    <label>
                      <span>{copy.birthPlaceRequired}</span>
                      <input
                        value={applicant.birthPlace}
                        onChange={(event) =>
                          updateApplicant(
                            index,
                            "birthPlace",
                            event.target.value,
                          )
                        }
                        placeholder={copy.birthPlacePlaceholder}
                      />
                    </label>

                    <label>
                      <span>{copy.birthDateRequired}</span>
                      <input
                        type="date"
                        value={applicant.birthDate}
                        onChange={(event) =>
                          updateApplicant(
                            index,
                            "birthDate",
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.nationalityRequired}</span>
                      <input
                        value={applicant.nationality}
                        onChange={(event) =>
                          updateApplicant(
                            index,
                            "nationality",
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.passportNumberRequired}</span>
                      <input
                        value={applicant.passportNumber}
                        onChange={(event) =>
                          updateApplicant(
                            index,
                            "passportNumber",
                            event.target.value,
                          )
                        }
                        placeholder={copy.passportNumberPlaceholder}
                      />
                    </label>

                    <label>
                      <span>{copy.passportIssueDateRequired}</span>
                      <input
                        type="date"
                        value={applicant.passportIssueDate}
                        onChange={(event) =>
                          updateApplicant(
                            index,
                            "passportIssueDate",
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.passportExpiryDateRequired}</span>
                      <input
                        type="date"
                        value={applicant.passportExpiryDate}
                        onChange={(event) =>
                          updateApplicant(
                            index,
                            "passportExpiryDate",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                </section>
              ))}

              <section className="visa-booking__form-section">
                <h3>{copy.travelPlan}</h3>

                <div className="visa-booking__form">
                  <label>
                    <span>{copy.destinationCountry}</span>
                    <input
                      value={
                        product.countrySlug.charAt(0).toUpperCase() +
                        product.countrySlug.slice(1)
                      }
                      readOnly
                    />
                  </label>

                  <label>
                    <span>{copy.destinationCity}</span>
                    <input
                      value={bookingData.destinationCity}
                      onChange={(event) =>
                        setBookingData((current) => ({
                          ...current,
                          destinationCity: event.target.value,
                        }))
                      }
                      placeholder={copy.destinationCityPlaceholder}
                    />
                  </label>

                  <label>
                    <span>{copy.departureEstimate}</span>
                    <input
                      type="date"
                      value={bookingData.departureDate}
                      onChange={(event) =>
                        setBookingData((current) => ({
                          ...current,
                          departureDate: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    <span>{copy.returnEstimate}</span>
                    <input
                      type="date"
                      value={bookingData.returnDate}
                      onChange={(event) =>
                        setBookingData((current) => ({
                          ...current,
                          returnDate: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="full">
                    <span>{copy.travelPurposeRequired}</span>
                    <select
                      value={bookingData.travelPurpose}
                      onChange={(event) =>
                        setBookingData((current) => ({
                          ...current,
                          travelPurpose: event.target.value,
                        }))
                      }
                    >
                      <option value="">{copy.selectTravelPurpose}</option>
                      <option value="tourism">{copy.tourism}</option>
                      <option value="business">{copy.business}</option>
                      <option value="visit">{copy.visit}</option>
                      <option value="other">{copy.other}</option>
                    </select>
                  </label>
                </div>

                <div className="visa-booking__section-note">
                  <CalendarDays size={18} />
                  <p>
                    {copy.travelEstimateNote}
                  </p>
                </div>
              </section>

              <section className="visa-booking__form-section">
                <h3>{copy.contactInformation}</h3>

                <div className="visa-booking__form">
                  <label>
                    <span>{copy.emailRequired}</span>
                    <input
                      type="email"
                      value={bookingData.email}
                      onChange={(event) =>
                        setBookingData((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="nama@email.com"
                    />
                  </label>

                  <label>
                    <span>{copy.phoneRequired}</span>
                    <input
                      type="tel"
                      value={bookingData.phone}
                      onChange={(event) =>
                        setBookingData((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="+62"
                    />
                  </label>
                </div>

                <div className="visa-booking__section-note">
                  <ShieldCheck size={18} />
                  <p>
                    {copy.contactNote}
                  </p>
                </div>
              </section>

              <section className="visa-booking__form-section">
                <h3>{copy.domicileAddress}</h3>

                <div className="visa-booking__form">
                  <label className="full">
                    <span>{copy.fullAddressRequired}</span>
                    <input
                      value={bookingData.address}
                      onChange={(event) =>
                        setBookingData((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      placeholder={copy.fullAddressPlaceholder}
                    />
                  </label>

                  <label>
                    <span>{copy.cityRequired}</span>
                    <input
                      value={bookingData.city}
                      onChange={(event) =>
                        setBookingData((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                      placeholder={copy.city}
                    />
                  </label>

                  <label>
                    <span>{copy.provinceRequired}</span>
                    <input
                      value={bookingData.province}
                      onChange={(event) =>
                        setBookingData((current) => ({
                          ...current,
                          province: event.target.value,
                        }))
                      }
                      placeholder={copy.province}
                    />
                  </label>

                  <label>
                    <span>{copy.postalCodeRequired}</span>
                    <input
                      inputMode="numeric"
                      value={bookingData.postalCode}
                      onChange={(event) =>
                        setBookingData((current) => ({
                          ...current,
                          postalCode: event.target.value,
                        }))
                      }
                      placeholder={copy.postalCode}
                    />
                  </label>
                </div>
              </section>
            </article>
          )}
          {step === 2 && (
            <>
              <article className="visa-booking__card">
                <header className="visa-booking__card-heading">
                  <CalendarDays size={23} />

                  <div>
                    <h2>{copy.documentsAndDeparture}</h2>

                    <p>
                      {copy.documentsDepartureDescription}
                    </p>
                  </div>
                </header>

                <div className="visa-booking__dates">
                  <div>
                    <span>{copy.departureDateLabel}</span>

                    <strong>
                      {bookingData.departureDate || copy.notSelected}
                    </strong>
                  </div>

                  <div>
                    <span>{copy.returnDateLabel}</span>

                    <strong>
                      {bookingData.returnDate || copy.notSelected}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="visa-booking__card">
                <header className="visa-booking__card-heading">
                  <FileText size={23} />

                  <div>
                    <h2>{copy.applicationDocuments}</h2>

                    <p>
                      {copy.applicationDocumentsDescription}
                    </p>
                  </div>
                </header>

                {requirements.length > 0 && (
                  <div className="visa-booking__requirements">
                    <h3>{copy.requirements}</h3>

                    {requirements.map((item) => (
                      <div key={item}>
                        <Check size={16} />

                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {documents.length > 0 ? (
                  <div className="visa-booking__documents">
                    <div className="visa-booking__requirements">
                      <h3>{copy.documentsToUpload}</h3>
                    </div>

                    {applicantList.map((applicant, index) => (
                      <div
                        className="visa-booking__requirements"
                        key={applicant.id}
                      >
                        <h3>
                          {applicantList.length > 1
                            ? `${copy.applicantNumber(index + 1)} — ${applicant.fullName || copy.applicantNameEmpty}`
                            : applicant.fullName || copy.applicantDocuments}
                        </h3>

                        {documents.map((item) => (
                          <div key={`${applicant.id}-${item}`}>
                            <FileText size={16} />

                            <span>{item}</span>

                            <button type="button">
                              {copy.uploadFile}
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="visa-booking__section-note">
                    <FileText size={18} />

                    <p>
                      {copy.noDocuments}

                    </p>
                  </div>
                )}

                {requirements.length === 0 &&
                  documents.length === 0 && (
                    <div className="visa-booking__section-note">
                      <ShieldCheck size={18} />

                      <p>
                        {copy.noMandatoryDocuments}

                      </p>
                    </div>
                  )}
              </article>
            </>
          )}
          {step === 3 && (
            <>
              <article className="visa-booking__card">
                <header className="visa-booking__card-heading">
                  <ShieldCheck size={23} />

                  <div>
                    <h2>{copy.reviewData}</h2>

                    <p>
                      {copy.reviewDescription}
                    </p>
                  </div>
                </header>

                <div className="visa-booking__requirements">
                  <h3>{copy.applicantData}</h3>
                </div>

                {applicantList.map((applicant, index) => (
                  <div key={applicant.id}>
                    {applicantList.length > 1 && (
                      <div className="visa-booking__requirements">
                        <h3>{copy.applicantNumber(index + 1)}</h3>
                      </div>
                    )}

                    <div className="visa-booking__review">
                      <div>
                        <span>{copy.fullName}</span>
                        <strong>{applicant.fullName || "-"}</strong>
                      </div>

                      <div>
                        <span>{copy.gender}</span>
                        <strong>
                          {applicant.gender === "male"
                            ? copy.male
                            : applicant.gender === "female"
                              ? copy.female
                              : "-"}
                        </strong>
                      </div>

                      <div>
                        <span>{copy.birthPlace}</span>
                        <strong>{applicant.birthPlace || "-"}</strong>
                      </div>

                      <div>
                        <span>{copy.birthDate}</span>
                        <strong>{applicant.birthDate || "-"}</strong>
                      </div>

                      <div>
                        <span>{copy.nationality}</span>
                        <strong>{applicant.nationality || "-"}</strong>
                      </div>

                      <div>
                        <span>{copy.passportNumber}</span>
                        <strong>{applicant.passportNumber || "-"}</strong>
                      </div>

                      <div>
                        <span>{copy.passportIssueDate}</span>
                        <strong>{applicant.passportIssueDate || "-"}</strong>
                      </div>

                      <div>
                        <span>{copy.passportExpiryDate}</span>
                        <strong>{applicant.passportExpiryDate || "-"}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </article>

              <article className="visa-booking__card">
                <header className="visa-booking__card-heading">
                  <CalendarDays size={23} />

                  <div>
                    <h2>{copy.travelDetails}</h2>

                    <p>
                      {copy.travelDetailsDescription}
                    </p>
                  </div>
                </header>

                <div className="visa-booking__review">
                  <div>
                    <span>{copy.destinationCountry}</span>
                    <strong>
                      {product.countrySlug.charAt(0).toUpperCase() +
                        product.countrySlug.slice(1)}
                    </strong>
                  </div>

                  <div>
                    <span>{copy.destinationCity}</span>
                    <strong>{bookingData.destinationCity || "-"}</strong>
                  </div>

                  <div>
                    <span>{copy.departure}</span>
                    <strong>{bookingData.departureDate || "-"}</strong>
                  </div>

                  <div>
                    <span>{copy.return}</span>
                    <strong>{bookingData.returnDate || "-"}</strong>
                  </div>

                  <div>
                    <span>{copy.travelPurpose}</span>
                    <strong>
                      {bookingData.travelPurpose === "tourism"
                        ? copy.tourism
                        : bookingData.travelPurpose === "business"
                          ? copy.business
                          : bookingData.travelPurpose === "visit"
                            ? copy.visit
                            : bookingData.travelPurpose === "other"
                              ? copy.other
                              : "-"}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="visa-booking__card">
                <header className="visa-booking__card-heading">
                  <UserRound size={23} />

                  <div>
                    <h2>{copy.contactAndDomicile}</h2>

                    <p>
                      {copy.contactAndDomicileDescription}
                    </p>
                  </div>
                </header>

                <div className="visa-booking__review">
                  <div>
                    <span>{copy.email}</span>
                    <strong>{bookingData.email || "-"}</strong>
                  </div>

                  <div>
                    <span>{copy.phone}</span>
                    <strong>{bookingData.phone || "-"}</strong>
                  </div>

                  <div>
                    <span>{copy.address}</span>
                    <strong>{bookingData.address || "-"}</strong>
                  </div>

                  <div>
                    <span>{copy.city}</span>
                    <strong>{bookingData.city || "-"}</strong>
                  </div>

                  <div>
                    <span>{copy.province}</span>
                    <strong>{bookingData.province || "-"}</strong>
                  </div>

                  <div>
                    <span>{copy.postalCode}</span>
                    <strong>{bookingData.postalCode || "-"}</strong>
                  </div>
                </div>
              </article>

              <div className="visa-booking__info">
                <ShieldCheck size={20} />

                <p>
                  {copy.reviewFinalNote}

                </p>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <article className="visa-booking__card">
                <header className="visa-booking__card-heading">
                  <ShieldCheck size={23} />

                  <div>
                    <h2>
                      {copy.selectPaymentMethod}
                    </h2>

                    <p>
                      {copy.selectPaymentMethodDescription}
                    </p>
                  </div>
                </header>

                <div className="visa-booking__payment-total">
                  <div>
                    <span>
                      {copy.paymentNow}
                    </span>

                    <small>
                      {paymentTerm === "dp"
                        ? copy.initialPaymentNote
                        : copy.fullPayment}
                    </small>
                  </div>

                  <strong>
                    {formatCurrency(
                      paymentNow,
                    )}
                  </strong>
                </div>

                <div className="visa-booking__price-lines">
                  <div>
                    <span>
                      {copy.visaPrice}
                      {" "}
                      ({copy.applicantUnit(applicants)})
                    </span>

                    <strong>
                      {formatCurrency(
                        totalPrice,
                      )}
                    </strong>
                  </div>

                  {hasDp &&
                    dpTotal !== null &&
                    paymentTerm ===
                      "dp" && (
                      <div>
                        <span>
                          {copy.downPayment}
                        </span>

                        <strong>
                          {formatCurrency(
                            dpTotal,
                          )}
                        </strong>
                      </div>
                    )}

                  {hasDp &&
                    paymentTerm ===
                      "dp" &&
                    remaining > 0 && (
                      <div>
                        <span>
                          {copy.remainingBill}
                        </span>

                        <strong>
                          {formatCurrency(
                            remaining,
                          )}
                        </strong>
                      </div>
                    )}

                  <div className="total">
                    <span>
                      {copy.paidNow}
                    </span>

                    <strong>
                      {formatCurrency(
                        paymentNow,
                      )}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="visa-booking__card">
                <header className="visa-booking__card-heading">
                  <ShieldCheck size={23} />

                  <div>
                    <h2>
                      {copy.paymentMethod}
                    </h2>

                    <p>
                      {copy.paymentMethodDescription}
                    </p>
                  </div>
                </header>

                <div className="visa-booking__methods">
                  {[
                    {
                      id: "bank-transfer",
                      title: copy.bankTransfer,
                      description:
                        copy.bankTransferDescription,
                    },
                    {
                      id: "virtual-account",
                      title: copy.virtualAccount,
                      description:
                        copy.virtualAccountDescription,
                    },
                    {
                      id: "e-wallet",
                      title: copy.eWallet,
                      description:
                        copy.eWalletDescription,
                    },
                    {
                      id: "card",
                      title:
                        copy.creditDebitCard,
                      description:
                        copy.creditDebitCardDescription,
                    },
                  ].map((method) => {
                    const selected =
                      selectedPaymentMethod ===
                      method.id;

                    return (
                      <button
                        key={method.id}
                        type="button"
                        className={
                          selected
                            ? "is-selected"
                            : undefined
                        }
                        aria-pressed={
                          selected
                        }
                        onClick={() =>
                          setSelectedPaymentMethod(
                            method.id,
                          )
                        }
                      >
                        <span
                          className="visa-booking__method-radio"
                          aria-hidden="true"
                        />

                        <span className="visa-booking__method-copy">
                          <strong>
                            {method.title}
                          </strong>

                          <small>
                            {method.description}
                          </small>
                        </span>

                        {selected && (
                          <Check
                            size={18}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="visa-booking__section-note">
                  <ShieldCheck size={18} />

                  <p>
                    {copy.paymentProcessedBySegaloka}
                  </p>
                </div>
              </article>
            </>
          )}
          {step === 5 && (
            <>
              <article className="visa-booking__card">
                <header className="visa-booking__card-heading">
                  <Check size={23} />

                  <div>
                    <h2>{copy.orderConfirmation}</h2>

                    <p>
                      {copy.orderConfirmationDescription}
                    </p>
                  </div>
                </header>

                <div className="visa-booking__requirements">
                  <h3>{copy.applicantData}</h3>
                </div>

                {applicantList.map((applicant, index) => (
                  <div key={applicant.id}>
                    {applicantList.length > 1 && (
                      <div className="visa-booking__requirements">
                        <h3>{copy.applicantNumber(index + 1)}</h3>
                      </div>
                    )}

                    <div className="visa-booking__review">
                      <div>
                        <span>{copy.fullName}</span>
                        <strong>{applicant.fullName || "-"}</strong>
                      </div>

                      <div>
                        <span>{copy.gender}</span>
                        <strong>
                          {applicant.gender === "male"
                            ? copy.male
                            : applicant.gender === "female"
                              ? copy.female
                              : "-"}
                        </strong>
                      </div>

                      <div>
                        <span>{copy.birthPlace}</span>
                        <strong>{applicant.birthPlace || "-"}</strong>
                      </div>

                      <div>
                        <span>{copy.birthDate}</span>
                        <strong>{applicant.birthDate || "-"}</strong>
                      </div>

                      <div>
                        <span>{copy.nationality}</span>
                        <strong>{applicant.nationality || "-"}</strong>
                      </div>

                      <div>
                        <span>{copy.passportNumber}</span>
                        <strong>{applicant.passportNumber || "-"}</strong>
                      </div>

                      <div>
                        <span>{copy.passportIssueDate}</span>
                        <strong>{applicant.passportIssueDate || "-"}</strong>
                      </div>

                      <div>
                        <span>{copy.passportExpiryDate}</span>
                        <strong>{applicant.passportExpiryDate || "-"}</strong>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="visa-booking__requirements">
                  <h3>{copy.contactInformation}</h3>
                </div>

                <div className="visa-booking__review">
                  <div>
                    <span>{copy.email}</span>
                    <strong>{bookingData.email || "-"}</strong>
                  </div>

                  <div>
                    <span>{copy.phone}</span>
                    <strong>{bookingData.phone || "-"}</strong>
                  </div>
                </div>
              </article>

              <article className="visa-booking__card">
                <header className="visa-booking__card-heading">
                  <CalendarDays size={23} />

                  <div>
                    <h2>{copy.travelDetails}</h2>

                    <p>
                      {copy.confirmationTravelDescription}
                    </p>
                  </div>
                </header>

                <div className="visa-booking__review">
                  <div>
                    <span>{copy.destinationCountry}</span>
                    <strong>
                      {product.countrySlug.charAt(0).toUpperCase() +
                        product.countrySlug.slice(1)}
                    </strong>
                  </div>

                  <div>
                    <span>{copy.destinationCity}</span>
                    <strong>{bookingData.destinationCity || "-"}</strong>
                  </div>

                  <div>
                    <span>{copy.departureDateLabel}</span>
                    <strong>{bookingData.departureDate || "-"}</strong>
                  </div>

                  <div>
                    <span>{copy.returnDateLabel}</span>
                    <strong>{bookingData.returnDate || "-"}</strong>
                  </div>

                  <div>
                    <span>{copy.travelPurpose}</span>
                    <strong>
                      {bookingData.travelPurpose === "tourism"
                        ? copy.tourism
                        : bookingData.travelPurpose === "business"
                          ? copy.business
                          : bookingData.travelPurpose === "visit"
                            ? copy.visit
                            : bookingData.travelPurpose === "other"
                              ? copy.other
                              : "-"}
                    </strong>
                  </div>

                  <div>
                    <span>{copy.applicantCount}</span>
                    <strong>{copy.applicantUnit(applicants)}</strong>
                  </div>
                </div>
              </article>

              <article className="visa-booking__card">
                <header className="visa-booking__card-heading">
                  <ShieldCheck size={23} />

                  <div>
                    <h2>{copy.serviceAndPayment}</h2>

                    <p>
                      {copy.servicePaymentDescription}
                    </p>
                  </div>
                </header>

                <div className="visa-booking__review">
                  <div>
                    <span>{copy.visaService}</span>
                    <strong>{translateVisaValue(product.title, language)}</strong>
                  </div>

                  <div>
                    <span>{copy.vendor}</span>
                    <strong>{product.vendor.name}</strong>
                  </div>

                  <div>
                    <span>{copy.paymentMethod}</span>

                    <strong>
                      {selectedPaymentMethod === "bank-transfer"
                        ? copy.bankTransfer
                        : selectedPaymentMethod === "virtual-account"
                          ? copy.virtualAccount
                          : selectedPaymentMethod === "e-wallet"
                            ? copy.eWallet
                            : selectedPaymentMethod === "card"
                              ? copy.creditDebitCard
                              : copy.notSelectedPayment}
                    </strong>
                  </div>

                  <div>
                    <span>{copy.visaPriceApplicants(applicants)}</span>
                    <strong>{formatCurrency(totalPrice)}</strong>
                  </div>

                  {hasDp &&
                    dpTotal !== null &&
                    paymentTerm === "dp" && (
                      <div>
                        <span>{copy.downPayment}</span>
                        <strong>{formatCurrency(dpTotal)}</strong>
                      </div>
                    )}

                  {hasDp &&
                    paymentTerm === "dp" &&
                    remaining > 0 && (
                      <div>
                        <span>{copy.remainingBill}</span>
                        <strong>{formatCurrency(remaining)}</strong>
                      </div>
                    )}
                </div>

                <div className="visa-booking__payment-total">
                  <div>
                    <span>{copy.paymentNow}</span>

                    <small>
                      {paymentTerm === "dp"
                        ? copy.initialPaymentNote
                        : copy.fullPayment}
                    </small>
                  </div>

                  <strong>{formatCurrency(paymentNow)}</strong>
                </div>
              </article>

              <div className="visa-booking__info">
                <ShieldCheck size={20} />

                <p>
                  {copy.confirmationAgreement}


                </p>
              </div>

              <div className="visa-booking__info">
                <ShieldCheck size={20} />

                <p>
                  {hasDp && paymentTerm === "dp"
                    ? copy.consultationAfterDp(product.vendor.name)
                    : copy.consultationAfterPayment(product.vendor.name)}
                </p>
              </div>
            </>
          )}
        <div className="visa-booking__navigation">
            {step > 1 ? (
              <button
                type="button"
                className="secondary"
                onClick={
                  previousStep
                }
              >
                <ArrowLeft
                  size={17}
                />
                {copy.back}
              </button>
            ) : (
              <a
                className="secondary"
                href={`/visa/${product.countrySlug}/${product.slug}?vendor=${product.vendor.slug}`}
              >
                <ArrowLeft
                  size={17}
                />
                {copy.back}
              </a>
            )}

            {step < 5 ? (
              <button
                type="button"
                className="primary"
                disabled={
                  step === 1 &&
                  !applicantValid
                }
                onClick={nextStep}
              >
                {step === 3
                  ? copy.continuePayment
                  : copy.continue}

                <ArrowRight
                  size={17}
                />
              </button>
            ) : (
              <button
                type="button"
                className="primary"
                onClick={handleConfirmOrder}
              >
                {copy.confirmOrder}
                <ArrowRight
                  size={17}
                />
              </button>
            )}
          </div>
        </section>

        <aside className="visa-booking__sidebar">
          <article className="visa-booking__summary">
            <h2>{copy.serviceSummary}</h2>

            <div className="visa-booking__service">
              <img
                src={`/images/visa/countries/${product.countrySlug}.jpg`}
                alt={translateVisaValue(product.title, language)}
              />

              <div>
                <span>
                  {product.countrySlug
                    .charAt(0)
                    .toUpperCase() +
                    product.countrySlug.slice(1)}
                </span>

                <h3>{translateVisaValue(product.title, language)}</h3>

                <p>{product.vendor.name}</p>
              </div>
            </div>

            <div className="visa-booking__service-facts">
              {product.entryType ? (
                <div>
                  <span>{copy.entryType}</span>
                  <strong>{translateVisaValue(product.entryType, language)}</strong>
                </div>
              ) : null}

              <div>
                <span>{copy.validity}</span>
                <strong>{translateVisaValue(product.validity, language)}</strong>
              </div>

              <div>
                <span>{copy.maxStay}</span>
                <strong>{translateVisaValue(product.stayDuration, language)}</strong>
              </div>

              <div>
                <span>{copy.processingTime}</span>
                <strong>{translateVisaValue(product.processTime, language)}</strong>
              </div>

              {product.purpose ? (
                <div>
                  <span>{copy.purpose}</span>
                  <strong>{translateVisaValue(product.purpose, language)}</strong>
                </div>
              ) : null}
            </div>

            <div className="visa-booking__summary-price">
              <div>
                <span>
                  {copy.visaPriceApplicants(applicants)}
                </span>

                <strong>
                  {formatCurrency(totalPrice)}
                </strong>
              </div>

              {hasDp &&
              dpTotal !== null &&
              paymentTerm === "dp" ? (
                <div>
                  <span>{copy.downPayment}</span>

                  <strong>
                    {formatCurrency(dpTotal)}
                  </strong>
                </div>
              ) : null}

              <div className="total">
                <span>
                  {copy.paymentNow}
                </span>

                <strong>
                  {formatCurrency(paymentNow)}
                </strong>
              </div>
            </div>

            <div className="visa-booking__consultation">
              <ShieldCheck size={18} />

              <p>
                {hasDp && paymentTerm === "dp"
                  ? copy.consultationAfterDp(product.vendor.name)
                  : copy.consultationAfterPayment(product.vendor.name)}
              </p>
            </div>

            <div className="visa-booking__secure">
              <ShieldCheck size={15} />

              <span>
                {copy.secureData}
              </span>
            </div>
          </article>
        </aside>
      </div>
    </main>
  );
}
