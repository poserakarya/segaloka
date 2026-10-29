"use client";
import { resolveRegistrationDraft, getRegistrationDocumentTypes, loadExistingRegistrationDraft } from "@/lib/registration-draft-resume";

import { displayIndonesianLocationName } from "@/lib/location-display";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  FileCheck2,
  FileText,
  Globe2,
  Mail,
  MapPin,
  Network,
  PackageCheck,
  Phone,
  Plus,
  ShieldCheck,
  Store,
  Trash2,
  UploadCloud,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import CountryCallingCodePicker from "@/components/auth/CountryCallingCodePicker";
import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";

import {
  VENDOR_REGISTRATION_COPY,
  resolveVendorRegistrationLanguage,
} from "./vendor-registration.i18n";

type RegistrationStep = 1 | 2 | 3 | 4;

type VendorDraft = {
  businessName: string;
  legalName: string;
  businessType: string;
  registrationNumber: string;
  taxNumber: string;
  establishedYear: string;
  businessEmail: string;
  website: string;
  description: string;

  picName: string;
  picPosition: string;
  picPhone: string;
  picEmail: string;

  services: string[];

  address: string;
  city: string;
  province: string;
  country: string;
  countryId: string;
  provinceId: string;
  cityId: string;
  postalCode: string;
};

type DocumentKey =
  | "business"
  | "tax"
  | "identity"
  | "supporting";

type SelectedDocuments = Record<DocumentKey, File | null>;

const EMPTY_DRAFT: VendorDraft = {
  businessName: "",
  legalName: "",
  businessType: "",
  registrationNumber: "",
  taxNumber: "",
  establishedYear: "",
  businessEmail: "",
  website: "",
  description: "",

  picName: "",
  picPosition: "",
  picPhone: "",
  picEmail: "",

  services: [],

  address: "",
  city: "",
  province: "",
  country: "Indonesia",
  countryId: "",
  provinceId: "",
  cityId: "",
  postalCode: "",
};

const EMPTY_DOCUMENTS: SelectedDocuments = {
  business: null,
  tax: null,
  identity: null,
  supporting: null,
};

const STORAGE_KEY = "segaloka-vendor-registration-draft-v1";

const BENEFIT_ICONS = [
  UsersRound,
  PackageCheck,
  ShieldCheck,
  Network,
] as const;

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="vendor-reg-label">
      {children}
      {required ? <em>*</em> : null}
    </span>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="vendor-reg-review-row">
      <span>{label}</span>
      <strong>{value?.trim() || "—"}</strong>
    </div>
  );
}

export default function VendorRegistrationClient() {
  const { language } = useMarketplacePreferences();

  const lang = resolveVendorRegistrationLanguage(language);
  const t = VENDOR_REGISTRATION_COPY[lang];

  const vendorLocale = lang === "AR" ? "ar" : lang === "EN" ? "en" : "id";

  const vendorMessages = {
    id: {
      required: "Lengkapi persyaratan pada langkah ini",
      email: "Format email tidak valid",
      phone: "Nomor telepon harus berformat internasional",
      registration: "Pendaftaran gagal",
      document: "Dokumen gagal dibaca",
      upload: "Unggah dokumen gagal",
      finalize: "Finalisasi pendaftaran gagal",
      sending: "Mengirim...",
      reference: "Referensi",
      status: "Status",
      review: "Tinjau",
      loading: "Memuat...",
      unavailable: "Data tidak tersedia",
    },
    en: {
      required: "Complete the required fields in this step",
      email: "Invalid email format",
      phone: "Phone number must use international format",
      registration: "Registration failed",
      document: "Unable to read the document",
      upload: "Document upload failed",
      finalize: "Unable to finalize registration",
      sending: "Submitting...",
      reference: "Reference",
      status: "Status",
      review: "Review",
      loading: "Loading...",
      unavailable: "Data unavailable",
    },
    ar: {
      required: "يرجى إكمال الحقول المطلوبة في هذه الخطوة",
      email: "صيغة البريد الإلكتروني غير صحيحة",
      phone: "يجب إدخال رقم الهاتف بالصيغة الدولية",
      registration: "فشل التسجيل",
      document: "تعذرت قراءة المستند",
      upload: "فشل رفع المستند",
      finalize: "تعذر إكمال التسجيل",
      sending: "جارٍ الإرسال...",
      reference: "المرجع",
      status: "الحالة",
      review: "مراجعة",
      loading: "جارٍ التحميل...",
      unavailable: "البيانات غير متاحة",
    },
  };

  const vm = vendorMessages[vendorLocale];

  const countryDisplayNames = new Intl.DisplayNames(
    [vendorLocale],
    { type: "region" }
  );

  const displayVendorCountry = (country: {
    name: string;
    iso2?: string;
  }) => {
    const iso2 = country.iso2?.toUpperCase();
    if (!iso2 || !/^[A-Z]{2}$/.test(iso2)) return country.name;
    try {
      return countryDisplayNames.of(iso2) || country.name;
    } catch {
      return country.name;
    }
  };



  const [step, setStep] = useState<RegistrationStep>(1);
  const [draft, setDraft] = useState<VendorDraft>(EMPTY_DRAFT);
  const [documents, setDocuments] =
    useState<SelectedDocuments>(EMPTY_DOCUMENTS);
  const [serverDocumentTypes, setServerDocumentTypes] = useState<Set<string>>(new Set());
  const [documentMetadataError, setDocumentMetadataError] = useState(false);


  const [countries, setCountries] = useState<Array<{
    id: string; name: string; iso2?: string; regionCount?: number;
  }>>([]);
  const [regions, setRegions] = useState<Array<{id:string;name:string}>>([]);
  const [cities, setCities] = useState<Array<{id:string;name:string}>>([]);
  const [locationState, setLocationState] = useState("loading");
  const [regionsStatus, setRegionsStatus] = useState("idle");
  const [citiesStatus, setCitiesStatus] = useState("idle");
  const [phoneDial, setPhoneDial] = useState("+62");

  const selectedCountry = countries.find(x => x.id === draft.countryId);
  const hasRegions = selectedCountry
    ? selectedCountry.iso2 === "ID" || (selectedCountry.regionCount ?? 0) > 0
    : true;

  const nationalPhone = draft.picPhone.startsWith(phoneDial)
    ? draft.picPhone.slice(phoneDial.length).replace(/\D/g, "")
    : draft.picPhone.replace(/\D/g, "").replace(/^0+/, "");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/master-data/countries", {cache:"no-store",signal:controller.signal})
      .then(r => r.ok ? r.json() : Promise.reject(new Error("COUNTRIES_API")))
      .then(data => {
        if(!Array.isArray(data.items)) throw Error("COUNTRIES_INVALID");
        setCountries(data.items);
        setLocationState("ready");
        const indonesia=data.items.find((x:{iso2?:string})=>x.iso2==="ID");
        if(indonesia) setDraft(current=>current.countryId?current:{
          ...current,countryId:indonesia.id,country:indonesia.name
        });
      })
      .catch(e=>{if(e.name!=="AbortError")setLocationState("error")});
    return ()=>controller.abort();
  },[]);

  useEffect(()=>{
    setRegions([]);
    if(!draft.countryId || !selectedCountry || !hasRegions){
      setRegionsStatus("idle");
      return;
    }
    const controller=new AbortController();
    setRegionsStatus("loading");
    fetch("/api/master-data/countries/"+draft.countryId+"/regions",
      {cache:"no-store",signal:controller.signal})
      .then(r=>r.ok?r.json():Promise.reject(Error("REGIONS_API")))
      .then(data=>{
        if(!Array.isArray(data.items))throw Error("REGIONS_INVALID");
        setRegions(data.items);setRegionsStatus("ready");
      })
      .catch(e=>{if(e.name!=="AbortError")setRegionsStatus("error")});
    return ()=>controller.abort();
  },[draft.countryId,hasRegions,selectedCountry?.id]);

  useEffect(()=>{
    setCities([]);
    if(!draft.countryId || !selectedCountry ||
       (hasRegions && (!draft.provinceId || regionsStatus!=="ready"))){
      setCitiesStatus("idle");return;
    }
    const controller=new AbortController();
    setCitiesStatus("loading");
    const url=hasRegions
      ? "/api/master-data/regions/"+draft.provinceId+"/cities"
      : "/api/master-data/countries/"+draft.countryId+"/cities";
    fetch(url,{cache:"no-store",signal:controller.signal})
      .then(r=>r.ok?r.json():Promise.reject(Error("CITIES_API")))
      .then(data=>{
        if(!Array.isArray(data.items))throw Error("CITIES_INVALID");
        setCities(data.items);setCitiesStatus("ready");
      })
      .catch(e=>{if(e.name!=="AbortError")setCitiesStatus("error")});
    return ()=>controller.abort();
  },[draft.countryId,draft.provinceId,hasRegions,regionsStatus,selectedCountry?.id]);

  const [serviceInput, setServiceInput] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreDraft() {
      let localDraft: Partial<VendorDraft> | null = null;

      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            localDraft = parsed as Partial<VendorDraft>;
          }
        }
      } catch {
        localDraft = null;
      }

      let serverDraft: Awaited<ReturnType<typeof loadExistingRegistrationDraft>> = null;

      try {
        serverDraft = await loadExistingRegistrationDraft("vendor");
        if (serverDraft && !cancelled) {
          try {
            const types = await getRegistrationDocumentTypes(serverDraft.id);
            if (!cancelled) {
              setServerDocumentTypes(types);
              setDocumentMetadataError(false);
            }
          } catch (error) {
            if (!cancelled) {
              setDocumentMetadataError(true);
              console.error("REGISTRATION_DOCUMENT_METADATA_FAILED", error);
            }
          }
        }
      } catch (error) {
        console.error("REGISTRATION_DRAFT_LOAD_FAILED", error);
      }

      if (cancelled) return;

      const source = serverDraft?.payload ?? localDraft;

      if (source) {
        setDraft(current => {
          const changed = (Object.keys(EMPTY_DRAFT) as Array<keyof VendorDraft>)
            .some(key =>
              key !== "countryId" &&
              JSON.stringify(current[key]) !== JSON.stringify(EMPTY_DRAFT[key])
            );

          if (changed) return current;

          return {
            ...EMPTY_DRAFT,
            ...source,
            services: Array.isArray(source.services)
              ? source.services.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
          } as VendorDraft;
        });
      }

      setHydrated(true);
    }

    void restoreDraft();

    return () => {
      cancelled = true;
    };
  }, []);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");



  const stepMeta = useMemo(() => {
    if (step === 1) {
      return {
        eyebrow: t.step1Eyebrow,
        title: t.step1Title,
        description: t.step1Description,
      };
    }

    if (step === 2) {
      return {
        eyebrow: t.step2Eyebrow,
        title: t.step2Title,
        description: t.step2Description,
      };
    }

    if (step === 3) {
      return {
        eyebrow: t.step3Eyebrow,
        title: t.step3Title,
        description: t.step3Description,
      };
    }

    return {
      eyebrow: t.step4Eyebrow,
      title: t.step4Title,
      description: t.step4Description,
    };
  }, [step, t]);

  function updateField<K extends keyof VendorDraft>(
    key: K,
    value: VendorDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));

  }

  function addService() {
    const value = serviceInput.trim();

    if (!value) return;

    const exists = draft.services.some(
      (item) => item.toLocaleLowerCase() === value.toLocaleLowerCase(),
    );

    if (!exists) {
      updateField("services", [...draft.services, value]);
    }

    setServiceInput("");
  }

  function onServiceKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addService();
    }
  }

  function removeService(service: string) {
    updateField(
      "services",
      draft.services.filter((item) => item !== service),
    );
  }

  function selectDocument(
    key: DocumentKey,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > 4 * 1024 * 1024) {
      window.alert("Ukuran maksimal file adalah 4 MiB.");
      event.target.value = "";
      return;
    }

    if (file && serverDocumentTypes.has(key)) {
      window.alert("Dokumen jenis ini sudah tersimpan. Penggantian dokumen belum tersedia.");
      event.target.value = "";
      return;
    }
    setDocuments((current) => ({
      ...current,
      [key]: file,
    }));
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setStep((current) =>
      Math.min(4, current + 1) as RegistrationStep,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function validateStep(current: RegistrationStep) {
    if (current === 3 && documentMetadataError) {
      setSubmitState("error");
      setSubmitMessage("Dokumen tersimpan gagal diperiksa. Muat ulang halaman.");
      return false;
    }
    const values = current === 1 ? [draft.businessName, draft.legalName, draft.businessType, draft.businessEmail, draft.picName, draft.picPhone, draft.picEmail, draft.address, draft.cityId, ...(hasRegions ? [draft.provinceId] : []), draft.countryId] : current === 2 ? [draft.services.length ? "ok" : ""] : current === 3 ? ["business", "tax", "identity"].map(key => documents[key as keyof SelectedDocuments] || serverDocumentTypes.has(key)) : [];
    if (values.some(value => !value)) { setSubmitState("error"); setSubmitMessage(vm.required); return false; }
    if (current === 1 && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.businessEmail.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.picEmail.trim()))) { setSubmitState("error"); setSubmitMessage(vm.email); return false; }
    return true;
  }

  function previousStep() {
    setStep((current) =>
      Math.max(1, current - 1) as RegistrationStep,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function preventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitState === "loading") return;
    setSubmitState("loading"); setSubmitMessage("");
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.businessEmail.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.picEmail.trim())) throw new Error(vm.email);
      const normalizePhone = (value: string) => value.trim().replace(/[\s().-]/g, "").replace(/^0/, phoneDial);
      const payload = { ...draft, businessEmail: draft.businessEmail.trim().toLowerCase(), picEmail: draft.picEmail.trim().toLowerCase(), picPhone: normalizePhone(draft.picPhone) };
      if (!/^\+[1-9]\d{7,14}$/.test(payload.picPhone)) throw new Error(vm.phone);
      const applicationId = await resolveRegistrationDraft("vendor", payload);
      const existingDocumentTypes = await getRegistrationDocumentTypes(applicationId);
      if (Object.entries(documents).some(([key, file]) => file && existingDocumentTypes.has(key))) {
        throw new Error("Dokumen sudah tersimpan. Penggantian dokumen belum tersedia.");
      }
      for (const [documentType, file] of Object.entries(documents)) if (file && !existingDocumentTypes.has(documentType)) { const contentBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",").pop() || ""); reader.onerror = () => reject(new Error(vm.document)); reader.readAsDataURL(file); }); const upload = await fetch("/api/registration/documents/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ applicationId, documentType, originalName: file.name, contentBase64 }) }); if (!upload.ok) throw new Error(vm.upload); }
      const finalResponse = await fetch(`/api/registration/applications/${applicationId}/submit`, { method: "POST" }); const finalResult = await finalResponse.json(); if (!finalResponse.ok) throw new Error(finalResult.code || vm.finalize);
      setSubmitState("success"); setSubmitMessage(`${vm.reference}: ${finalResult.id} · ${vm.status}: ${finalResult.status}`);
    } catch (error) { setSubmitState("error"); setSubmitMessage(error instanceof Error ? error.message : vm.registration); }
  }

  return (
    <main
      className="vendor-reg-page"
      dir={lang === "AR" ? "rtl" : "ltr"}
    >
      <div className="vendor-reg-top">
        <Link href="/daftar-vendor" className="vendor-reg-back">
          <ArrowLeft size={16} />
          <span>{t.back}</span>
        </Link>
      </div>

      <div className="vendor-reg-shell">
        <aside className="vendor-reg-brand">
          <div className="vendor-reg-brand-decoration vendor-reg-brand-decoration-one" />
          <div className="vendor-reg-brand-decoration vendor-reg-brand-decoration-two" />

          <div className="vendor-reg-brand-content">
            <span className="vendor-reg-brand-badge">
              <Store size={15} />
              {t.badge}
            </span>

            <h1>{t.heroTitle}</h1>
            <p>{t.heroDescription}</p>

            <div className="vendor-reg-benefits">
              {t.benefits.map((benefit, index) => {
                const Icon = BENEFIT_ICONS[index];

                return (
                  <div
                    className="vendor-reg-benefit"
                    key={benefit.title}
                  >
                    <span className="vendor-reg-benefit-icon">
                      <Icon size={20} />
                    </span>

                    <div>
                      <strong>{benefit.title}</strong>
                      <p>{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="vendor-reg-brand-footer">
            <span>
              <CheckCircle2 size={15} />
              {t.footerVerified}
            </span>

            <span>
              <Globe2 size={15} />
              {t.footerEcosystem}
            </span>
          </div>
        </aside>

        <section className="vendor-reg-panel">
          <div className="vendor-reg-stepper">
            {t.steps.map((label, index) => {
              const number = (index + 1) as RegistrationStep;
              const active = number === step;
              const completed = number < step;

              return (
                <div
                  className={[
                    "vendor-reg-step",
                    active ? "is-active" : "",
                    completed ? "is-completed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={label}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (completed) setStep(number);
                    }}
                    disabled={!completed && !active}
                    aria-current={active ? "step" : undefined}
                  >
                    <span>
                      {completed ? (
                        <Check size={15} strokeWidth={3} />
                      ) : (
                        number
                      )}
                    </span>

                    <strong>{label}</strong>
                  </button>

                  {index < t.steps.length - 1 ? (
                    <i aria-hidden="true" />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="vendor-reg-heading">
            <span>{stepMeta.eyebrow}</span>
            <h2>{stepMeta.title}</h2>
            <p>{stepMeta.description}</p>
          </div>

          <form
            className="vendor-reg-form"
            onSubmit={preventSubmit}
          >
            {step === 1 ? (
              <>
                <section className="vendor-reg-section">
                  <div className="vendor-reg-section-title">
                    <span>
                      <Building2 size={18} />
                    </span>
                    <div>
                      <h3>{t.businessSection}</h3>
                      <p>{t.businessSectionDescription}</p>
                    </div>
                  </div>

                  <div className="vendor-reg-grid">
                    <label>
                      <FieldLabel required>
                        {t.businessName}
                      </FieldLabel>
                      <input
                        value={draft.businessName}
                        onChange={(event) =>
                          updateField(
                            "businessName",
                            event.target.value,
                          )
                        }
                        placeholder={t.businessNamePlaceholder}
                        autoComplete="organization"
                      />
                    </label>

                    <label>
                      <FieldLabel required>
                        {t.legalName}
                      </FieldLabel>
                      <input
                        value={draft.legalName}
                        onChange={(event) =>
                          updateField(
                            "legalName",
                            event.target.value,
                          )
                        }
                        placeholder={t.legalNamePlaceholder}
                        autoComplete="organization"
                      />
                    </label>

                    <label>
                      <FieldLabel required>
                        {t.businessType}
                      </FieldLabel>
                      <select
                        value={draft.businessType}
                        onChange={(event) =>
                          updateField(
                            "businessType",
                            event.target.value,
                          )
                        }
                      >
                        <option value="">{t.businessTypePlaceholder}</option>
                        <option value="PT">PT</option>
                        <option value="CV">CV</option>
                        <option value="Firma">{t.businessTypeFirm}</option>
                        <option value="Koperasi">{t.businessTypeCooperative}</option>
                        <option value="Perorangan">{t.businessTypeSole}</option>
                        <option value="Lainnya">{t.businessTypeOther}</option>
                      </select>
                    </label>

                    <label>
                      <FieldLabel>{t.registrationNumber}</FieldLabel>
                      <input
                        value={draft.registrationNumber}
                        onChange={(event) =>
                          updateField(
                            "registrationNumber",
                            event.target.value,
                          )
                        }
                        placeholder={t.registrationNumberPlaceholder}
                      />
                    </label>

                    <label>
                      <FieldLabel>{t.taxNumber}</FieldLabel>
                      <input
                        value={draft.taxNumber}
                        onChange={(event) =>
                          updateField(
                            "taxNumber",
                            event.target.value,
                          )
                        }
                        placeholder={t.taxNumberPlaceholder}
                        inputMode="numeric"
                      />
                    </label>

                    <label>
                      <FieldLabel>{t.establishedYear}</FieldLabel>
                      <input
                        type="number"
                        min="1900"
                        max="2100"
                        value={draft.establishedYear}
                        onChange={(event) =>
                          updateField(
                            "establishedYear",
                            event.target.value,
                          )
                        }
                        placeholder={t.establishedYearPlaceholder}
                      />
                    </label>

                    <label>
                      <FieldLabel required>{t.businessEmail}</FieldLabel>
                      <input
                        type="email"
                        value={draft.businessEmail}
                        onChange={(event) =>
                          updateField(
                            "businessEmail",
                            event.target.value,
                          )
                        }
                        placeholder={t.businessEmailPlaceholder}
                        autoComplete="email"
                      />
                    </label>

                    <label>
                      <FieldLabel>{t.website}</FieldLabel>
                      <input
                        type="url"
                        value={draft.website}
                        onChange={(event) =>
                          updateField(
                            "website",
                            event.target.value,
                          )
                        }
                        placeholder={t.websitePlaceholder}
                        autoComplete="url"
                      />
                    </label>

                    <label className="vendor-reg-span-2">
                      <FieldLabel>{t.businessDescription}</FieldLabel>
                      <textarea
                        value={draft.description}
                        onChange={(event) =>
                          updateField(
                            "description",
                            event.target.value,
                          )
                        }
                        placeholder={t.businessDescriptionPlaceholder}
                        rows={4}
                      />
                    </label>
                  </div>
                </section>

                <section className="vendor-reg-section">
                  <div className="vendor-reg-section-title">
                    <span>
                      <UserRound size={18} />
                    </span>

                    <div>
                      <h3>{t.picSection}</h3>
                      <p>{t.picSectionDescription}</p>
                    </div>
                  </div>

                  <div className="vendor-reg-grid">
                    <label>
                      <FieldLabel required>{t.picName}</FieldLabel>
                      <input
                        value={draft.picName}
                        onChange={(event) =>
                          updateField(
                            "picName",
                            event.target.value,
                          )
                        }
                        placeholder={t.picNamePlaceholder}
                        autoComplete="name"
                      />
                    </label>

                    <label>
                      <FieldLabel required>{t.picPosition}</FieldLabel>
                      <input
                        value={draft.picPosition}
                        onChange={(event) =>
                          updateField(
                            "picPosition",
                            event.target.value,
                          )
                        }
                        placeholder={t.picPositionPlaceholder}
                      />
                    </label>

                    <label>
                      <FieldLabel required>
                        {t.picPhone}
                      </FieldLabel>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <CountryCallingCodePicker
                          value={phoneDial}
                          onChange={dial=>{
                            setPhoneDial(dial);
                            updateField("picPhone",dial+nationalPhone);
                          }}
                          language={lang}
                          label={t.picPhone}
                        />
                        <input
                          type="tel"
                          value={nationalPhone}
                          onChange={event=>updateField(
                            "picPhone",
                            phoneDial+event.target.value.replace(/\D/g,"").replace(/^0+/,"")
                          )}
                          placeholder={t.picPhonePlaceholder}
                          autoComplete="tel-national"
                          style={{flex:1,minWidth:0}}
                        />
                      </div>
                    </label>

                    <label>
                      <FieldLabel required>{t.picEmail}</FieldLabel>
                      <div className="vendor-reg-input-icon">
                        <Mail size={17} />
                        <input
                          type="email"
                          value={draft.picEmail}
                          onChange={(event) =>
                            updateField(
                              "picEmail",
                              event.target.value,
                            )
                          }
                          placeholder={t.picEmailPlaceholder}
                          autoComplete="email"
                        />
                      </div>
                    </label>
                  </div>
                </section>

                <section className="vendor-reg-section">
                  <div className="vendor-reg-section-title">
                    <span>
                      <MapPin size={18} />
                    </span>

                    <div>
                      <h3>{t.addressSection}</h3>
                      <p>{t.addressSectionDescription}</p>
                    </div>
                  </div>

                  <div className="vendor-reg-grid">
                    <label className="vendor-reg-span-2">
                      <FieldLabel required>{t.fullAddress}</FieldLabel>
                      <textarea
                        value={draft.address}
                        onChange={(event) =>
                          updateField(
                            "address",
                            event.target.value,
                          )
                        }
                        placeholder={t.fullAddressPlaceholder}
                        rows={3}
                        autoComplete="street-address"
                      />
                    </label>


                    <label>
                      <FieldLabel required>{t.country}</FieldLabel>
                      <select value={draft.countryId}
                        disabled={locationState!=="ready"}
                        onChange={event=>{
                          const item=countries.find(x=>x.id===event.target.value);
                          setDraft(current=>({
                            ...current,countryId:event.target.value,
                            country:item?.name||"",provinceId:"",province:"",
                            cityId:"",city:""
                          }));
                        }}>
                        <option value="">{t.countryPlaceholder}</option>
                        {countries.map(x=><option key={x.id} value={x.id}>{displayVendorCountry(x)}</option>)}
                      </select>
                    </label>
                    {hasRegions && <label>
                      <FieldLabel required>{t.province}</FieldLabel>
                      <select value={draft.provinceId}
                        disabled={regionsStatus!=="ready"}
                        onChange={event=>{
                          const item=regions.find(x=>x.id===event.target.value);
                          setDraft(current=>({
                            ...current,provinceId:event.target.value,
                            province:item?.name||"",cityId:"",city:""
                          }));
                        }}>
                        <option value="">{t.provincePlaceholder}</option>
                        {regions.map(x=><option key={x.id} value={x.id}>{displayIndonesianLocationName(x.name, vendorLocale.toUpperCase(), selectedCountry?.iso2 || "")}</option>)}
                      </select>
                    </label>}
                    <label>
                      <FieldLabel required>{t.city}</FieldLabel>
                      <select value={draft.cityId}
                        disabled={citiesStatus!=="ready"}
                        onChange={event=>{
                          const item=cities.find(x=>x.id===event.target.value);
                          setDraft(current=>({
                            ...current,cityId:event.target.value,
                            city:item?.name||""
                          }));
                        }}>
                        <option value="">{t.cityPlaceholder}</option>
                        {cities.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </label>
                    <label>
                      <FieldLabel>{t.postalCode}</FieldLabel>
                      <input
                        value={draft.postalCode}
                        onChange={(event) =>
                          updateField(
                            "postalCode",
                            event.target.value,
                          )
                        }
                        placeholder={t.postalCodePlaceholder}
                        autoComplete="postal-code"
                      />
                    </label>
                  </div>
                </section>
              </>
            ) : null}

            {step === 2 ? (
              <section className="vendor-reg-section">
                <div className="vendor-reg-section-title">
                  <span>
                    <PackageCheck size={18} />
                  </span>

                  <div>
                    <h3>{t.serviceLabel}</h3>
                    <p>{t.serviceSectionDescription}</p>
                  </div>
                </div>

                <div className="vendor-reg-service-box">
                  <label>
                    <FieldLabel required>
                      {t.addServiceLabel}
                    </FieldLabel>

                    <div className="vendor-reg-service-input">
                      <input
                        value={serviceInput}
                        onChange={(event) =>
                          setServiceInput(event.target.value)
                        }
                        onKeyDown={onServiceKeyDown}
                        placeholder={t.servicePlaceholder}
                      />

                      <button
                        type="button"
                        onClick={addService}
                        disabled={!serviceInput.trim()}
                      >
                        <Plus size={17} />
                        {t.add}
                      </button>
                    </div>

                    <small>{t.serviceHelp}</small>
                  </label>

                  {draft.services.length > 0 ? (
                    <div className="vendor-reg-tags">
                      {draft.services.map((service) => (
                        <span key={service}>
                          {service}

                          <button
                            type="button"
                            onClick={() => removeService(service)}
                            aria-label={`${t.remove} ${service}`}
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="vendor-reg-empty">
                      <PackageCheck size={28} />
                      <strong>{t.noServiceTitle}</strong>
                      <p>{t.noServiceDescription}</p>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="vendor-reg-section">
                <div className="vendor-reg-section-title">
                  <span>
                    <FileCheck2 size={18} />
                  </span>

                  <div>
                    <h3>{t.step3Title}</h3>
                    <p>{t.documentsSectionDescription}</p>
                  </div>
                </div>

                <div className="vendor-reg-document-grid">
                  {(
                    [
                      {
                        key: "business",
                        title: t.businessDocument,
                        description: t.businessDocumentDescription,
                        required: true,
                      },
                      {
                        key: "tax",
                        title: t.taxDocument,
                        description: t.taxDocumentDescription,
                        required: false,
                      },
                      {
                        key: "identity",
                        title: t.identityDocument,
                        description: t.identityDocumentDescription,
                        required: true,
                      },
                      {
                        key: "supporting",
                        title: t.supportingDocument,
                        description: t.supportingDocumentDescription,
                        required: false,
                      },
                    ] as const
                  ).map((item) => {
                    const file = documents[item.key];

                    return (
                      <label
                        className={[
                          "vendor-reg-document",
                          file ? "has-file" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        key={item.key}
                      >
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) =>
                            selectDocument(item.key, event)
                          }
                        />

                        <span className="vendor-reg-document-icon">
                          {file ? (
                            <FileText size={23} />
                          ) : (
                            <UploadCloud size={23} />
                          )}
                        </span>

                        <div>
                          <strong>
                            {item.title}
                            {item.required ? <em>*</em> : null}
                          </strong>

                          <p>{item.description}</p>

                          <small>
                            {file
                              ? file.name
                              : t.fileTypes}
                          </small>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="vendor-reg-info">
                  <ShieldCheck size={18} />
                  <p>{t.documentNotice}</p>
                </div>
              </section>
            ) : null}

            {step === 4 ? (
              <>
                <section className="vendor-reg-section">
                  <div className="vendor-reg-section-title">
                    <span>
                      <CheckCircle2 size={18} />
                    </span>

                    <div>
                      <h3>{t.reviewVendorTitle}</h3>
                      <p>{t.reviewVendorDescription}</p>
                    </div>
                  </div>

                  <div className="vendor-reg-review">
                    <ReviewRow
                      label={t.reviewVendorName}
                      value={draft.businessName}
                    />
                    <ReviewRow
                      label={t.reviewLegalName}
                      value={draft.legalName}
                    />
                    <ReviewRow
                      label={t.reviewBusinessType}
                      value={draft.businessType}
                    />
                    <ReviewRow
                      label={t.reviewRegistration}
                      value={draft.registrationNumber}
                    />
                    <ReviewRow
                      label={t.reviewBusinessEmail}
                      value={draft.businessEmail}
                    />
                    <ReviewRow
                      label={t.reviewPic}
                      value={draft.picName}
                    />
                    <ReviewRow
                      label={t.reviewWhatsapp}
                      value={draft.picPhone}
                    />
                    <ReviewRow
                      label={t.reviewLocation}
                      value={
                        [draft.city, draft.province, draft.country]
                          .filter(Boolean)
                          .join(", ")
                      }
                    />
                  </div>
                </section>

                <section className="vendor-reg-section">
                  <div className="vendor-reg-section-title">
                    <span>
                      <PackageCheck size={18} />
                    </span>

                    <div>
                      <h3>{t.reviewServicesTitle}</h3>
                      <p>{t.reviewServicesDescription}</p>
                    </div>
                  </div>

                  {draft.services.length ? (
                    <div className="vendor-reg-tags is-review">
                      {draft.services.map((service) => (
                        <span key={service}>{service}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="vendor-reg-review-empty">
                      {t.reviewServicesEmpty}
                    </div>
                  )}
                </section>

                <section className="vendor-reg-section">
                  <div className="vendor-reg-section-title">
                    <span>
                      <FileCheck2 size={18} />
                    </span>

                    <div>
                      <h3>{t.reviewDocumentsTitle}</h3>
                      <p>{t.reviewDocumentsDescription}</p>
                    </div>
                  </div>

                  <div className="vendor-reg-review-documents">
                    {(
                      [
                        ["business", t.businessDocument],
                        ["tax", t.taxDocument],
                        ["identity", t.identityDocument],
                        ["supporting", t.supportingDocument],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>
                        <FileText size={17} />
                        <span>{label}</span>
                        <strong>
                          {documents[key]?.name || t.notSelected}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="vendor-reg-submit-notice">
                  <ShieldCheck size={20} />
                  <div>
                    <strong>{t.verificationTitle}</strong>
                    <p>{t.finishNotice}</p>
                  </div>
                </div>
              </>
            ) : null}

            <div className="vendor-reg-actions">
              <div className="vendor-reg-actions-left">
                {step > 1 ? (
                  <button
                    type="button"
                    className="vendor-reg-button vendor-reg-button-secondary"
                    onClick={previousStep}
                  >
                    <ChevronLeft size={17} />
                    {t.previous}
                  </button>
                ) : null}

              </div>

              <div className="vendor-reg-actions-right">
                {step < 4 ? (
                  <button
                    type="button"
                    className="vendor-reg-button vendor-reg-button-primary"
                    onClick={nextStep}
                  >
                    {t.continue}
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="vendor-reg-button vendor-reg-button-primary"
                    disabled={submitState === "loading" || !draft.businessName || !draft.legalName || !draft.businessType || !draft.businessEmail || !draft.picName || !draft.picPhone || !draft.picEmail || !draft.address || !draft.cityId || (hasRegions && !draft.provinceId) || !draft.countryId || draft.services.length === 0}
                    onClick={() => void preventSubmit({ preventDefault() {} } as FormEvent<HTMLFormElement>)}
                  >
                    {submitState === "loading" ? vm.sending : t.finish}
                    <ArrowRight size={17} />
                  </button>
                )}
              </div>
            </div>
            {submitMessage ? <p role="status">{submitMessage}</p> : null}
          </form>
        </section>
      </div>
    </main>
  );
}
