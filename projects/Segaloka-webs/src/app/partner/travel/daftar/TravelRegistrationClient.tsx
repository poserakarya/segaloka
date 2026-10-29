"use client";
import { resolveRegistrationDraft, getRegistrationDocumentTypes, loadExistingRegistrationDraft } from "@/lib/registration-draft-resume";

import { displayIndonesianLocationName } from "@/lib/location-display";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  MapPin,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent, useRef } from "react";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";

type LicenseType = "BPW" | "PPIU" | "PIHK";

type StepId = 1 | 2 | 3 | 4;

type RegistrationForm = {
  businessName: string;
  legalName: string;
  licenseType: LicenseType;
  licenseNumber: string;
  directorName: string;
  email: string;
  phone: string;
  province: string;
  city: string;
  countryId: string;
  provinceId: string;
  cityId: string;
  country: string;
  address: string;
  website: string;
};

const initialForm: RegistrationForm = {
  businessName: "",
  legalName: "",
  licenseType: "BPW",
  licenseNumber: "",
  directorName: "",
  email: "",
  phone: "",
  province: "",
  city: "",
  countryId: "",
  provinceId: "",
  cityId: "",
  country: "Indonesia",
  address: "",
  website: "",
};

const steps = [
  {
    id: 1 as StepId,
    label: "Data Travel",
    shortLabel: "Travel",
    icon: Building2,
  },
  {
    id: 2 as StepId,
    label: "Perizinan",
    shortLabel: "Izin",
    icon: ShieldCheck,
  },
  {
    id: 3 as StepId,
    label: "Dokumen",
    shortLabel: "Dokumen",
    icon: FileText,
  },
  {
    id: 4 as StepId,
    label: "Review",
    shortLabel: "Review",
    icon: CheckCircle2,
  },
];

const licenseOptions: Array<{
  id: LicenseType;
  title: string;
  subtitle: string;
  description: string;
}> = [
  {
    id: "BPW",
    title: "BPW",
    subtitle: "Biro Perjalanan Wisata",
    description:
      "Untuk Travel yang menjalankan perjalanan domestik, internasional, dan halal tour.",
  },
  {
    id: "PPIU",
    title: "PPIU",
    subtitle: "Penyelenggara Perjalanan Ibadah Umrah",
    description:
      "Untuk Travel berizin penyelenggaraan perjalanan ibadah Umrah.",
  },
  {
    id: "PIHK",
    title: "PIHK",
    subtitle: "Penyelenggara Ibadah Haji Khusus",
    description:
      "Untuk Travel berizin penyelenggaraan ibadah Haji Khusus.",
  },
];

const TRAVEL_COPY = {
  ID: { back:"Kembali ke Segaloka untuk Travel",title:"Daftarkan Travel Anda",intro:"Lengkapi informasi bisnis Travel untuk memulai proses verifikasi dan aktivasi di ekosistem Segaloka.",steps:["Data Travel","Perizinan","Dokumen","Tinjauan"],shortSteps:["Travel","Izin","Dokumen","Tinjauan"],step:"Langkah",info:"Informasi Travel",infoDesc:"Masukkan identitas utama bisnis Travel yang akan didaftarkan.",brand:"Nama brand Travel",brandPh:"Contoh: Segaloka Travel",legal:"Nama badan usaha",legalPh:"PT / badan usaha",director:"Nama direktur",directorPh:"Nama lengkap direktur",email:"Surel bisnis",emailPh:"nama@travel.com",phone:"Nomor WhatsApp",phonePh:"+62",website:"Situs Web",websitePh:"https://",country:"Negara",region:"Provinsi / Negara Bagian",city:"Kota / Kabupaten",address:"Alamat kantor",addressPh:"Alamat lengkap kantor Travel",chooseCountry:"Pilih negara",chooseRegion:"Pilih provinsi / negara bagian",chooseCity:"Pilih kota / kabupaten",loading:"Memuat…",required:"Lengkapi semua kolom wajib terlebih dahulu",invalidContact:"Periksa format surel dan nomor telepon",invalidWebsite:"Format alamat situs web tidak valid",docs:"Dokumen wajib belum lengkap",cancel:"Batal",backBtn:"Kembali",next:"Lanjutkan",submit:"Kirim untuk Verifikasi",sending:"Mengirim...",licenseTitle:"Perizinan Travel",licenseDesc:"Pilih jenis perizinan utama yang dimiliki Travel.",licenseNumber:"Nomor izin",licenseNumberPh:"Masukkan nomor izin",licenseInfo:"Data perizinan akan diverifikasi sebelum akun Travel dapat diaktifkan.",docsTitle:"Dokumen Verifikasi",docsDesc:"Siapkan dokumen badan usaha dan dokumen perizinan sesuai jenis Travel.",businessDoc:"Dokumen badan usaha",businessDocDesc:"Dokumen legalitas badan usaha Travel.",licenseDoc:"Dokumen izin",licenseDocDesc:"Dokumen izin yang masih berlaku.",directorDoc:"Identitas direktur",directorDocDesc:"Dokumen identitas direktur atau penanggung jawab.",supportingDoc:"Dokumen pendukung",supportingDocDesc:"Dokumen tambahan apabila diperlukan untuk proses verifikasi.",optional:"Opsional",reviewTitle:"Tinjauan Pendaftaran",reviewDesc:"Periksa kembali data sebelum dikirim untuk proses verifikasi.",notFilled:"Belum diisi",sendingInfo:"Data akan dikirim setelah proses verifikasi dikonfirmasi.",verifyTitle:"Proses verifikasi Travel",verifyDesc:"Setiap Travel melalui pemeriksaan data bisnis, izin, dan dokumen sebelum aktivasi.",helpTitle:"Butuh Bantuan?",helpDesc:"Hubungi tim Segaloka jika Anda membutuhkan bantuan.",licenses:{BPW:["Biro Perjalanan Wisata","Untuk Travel yang menjalankan perjalanan domestik, internasional, dan wisata halal."],PPIU:["Penyelenggara Perjalanan Ibadah Umrah","Untuk Travel berizin penyelenggaraan perjalanan ibadah Umrah."],PIHK:["Penyelenggara Ibadah Haji Khusus","Untuk Travel berizin penyelenggaraan ibadah Haji Khusus."]}},
  EN: {back:"Back to Segaloka for Travel",title:"Register Your Travel Business",intro:"Complete your Travel business information to start verification and activation in the Segaloka ecosystem.",steps:["Travel Information","Licensing","Documents","Review"],shortSteps:["Travel","License","Documents","Review"],step:"Step",info:"Travel Information",infoDesc:"Enter the primary identity of the Travel business to be registered.",brand:"Travel brand name",brandPh:"Example: Segaloka Travel",legal:"Legal business name",legalPh:"Company / legal entity",director:"Director name",directorPh:"Director's full name",email:"Business email",emailPh:"name@travel.com",phone:"WhatsApp number",phonePh:"+62",website:"Website",websitePh:"https://",country:"Country",region:"State / Province",city:"City / Regency",address:"Office address",addressPh:"Complete Travel office address",chooseCountry:"Select country",chooseRegion:"Select state / province",chooseCity:"Select city / regency",loading:"Loading…",required:"Complete all required fields",invalidContact:"Check the email and phone format",invalidWebsite:"Invalid website format",docs:"Required documents are incomplete",cancel:"Cancel",backBtn:"Back",next:"Continue",submit:"Submit for Verification",sending:"Submitting...",licenseTitle:"Travel Licensing",licenseDesc:"Select the primary license held by the Travel business.",licenseNumber:"License number",licenseNumberPh:"Enter license number",licenseInfo:"License data will be verified before the Travel account can be activated.",docsTitle:"Verification Documents",docsDesc:"Prepare business and licensing documents for this Travel.",businessDoc:"Business document",businessDocDesc:"Legal document for the Travel business.",licenseDoc:"License document",licenseDocDesc:"A valid licensing document.",directorDoc:"Director identity",directorDocDesc:"Identity document of the director or responsible person.",supportingDoc:"Supporting document",supportingDocDesc:"Additional document if required for verification.",optional:"Optional",reviewTitle:"Registration Review",reviewDesc:"Check your information before sending it for verification.",notFilled:"Not filled",sendingInfo:"Data will be sent after verification is confirmed.",verifyTitle:"Travel verification process",verifyDesc:"Every Travel business is reviewed for business data, licenses, and documents before activation.",helpTitle:"Need help?",helpDesc:"Contact Segaloka if you need assistance.",licenses:{BPW:["Travel Agency","For domestic, international, and halal tour Travel businesses."],PPIU:["Umrah Travel Organizer","For Travel businesses licensed to organize Umrah trips."],PIHK:["Special Hajj Organizer","For Travel businesses licensed to organize special Hajj trips."]}},
  AR: {back:"العودة إلى Segaloka للسفر",title:"تسجيل شركة السفر",intro:"أكمل معلومات شركة السفر لبدء التحقق والتفعيل في منظومة Segaloka.",steps:["معلومات السفر","التراخيص","المستندات","المراجعة"],shortSteps:["السفر","الترخيص","المستندات","المراجعة"],step:"المرحلة",info:"معلومات السفر",infoDesc:"أدخل الهوية الأساسية لشركة السفر المراد تسجيلها.",brand:"اسم علامة السفر",brandPh:"مثال: Segaloka Travel",legal:"الاسم القانوني للنشاط",legalPh:"الشركة / الكيان القانوني",director:"اسم المدير",directorPh:"الاسم الكامل للمدير",email:"البريد الإلكتروني للنشاط",emailPh:"name@travel.com",phone:"رقم واتساب",phonePh:"+62",website:"الموقع الإلكتروني",websitePh:"https://",country:"الدولة",region:"الولاية / المنطقة",city:"المدينة / المقاطعة",address:"عنوان المكتب",addressPh:"العنوان الكامل لمكتب السفر",chooseCountry:"اختر الدولة",chooseRegion:"اختر الولاية / المنطقة",chooseCity:"اختر المدينة / المقاطعة",loading:"جارٍ التحميل…",required:"أكمل جميع الحقول المطلوبة",invalidContact:"تحقق من البريد ورقم الهاتف",invalidWebsite:"تنسيق الموقع غير صالح",docs:"المستندات المطلوبة غير مكتملة",cancel:"إلغاء",backBtn:"رجوع",next:"متابعة",submit:"إرسال للتحقق",sending:"جارٍ الإرسال...",licenseTitle:"تراخيص السفر",licenseDesc:"اختر الترخيص الرئيسي لشركة السفر.",licenseNumber:"رقم الترخيص",licenseNumberPh:"أدخل رقم الترخيص",licenseInfo:"سيتم التحقق من بيانات الترخيص قبل تفعيل حساب السفر.",docsTitle:"مستندات التحقق",docsDesc:"جهّز مستندات النشاط والتراخيص لشركة السفر.",businessDoc:"مستند النشاط",businessDocDesc:"المستند القانوني لشركة السفر.",licenseDoc:"مستند الترخيص",licenseDocDesc:"مستند ترخيص ساري المفعول.",directorDoc:"هوية المدير",directorDocDesc:"مستند هوية المدير أو المسؤول.",supportingDoc:"مستند داعم",supportingDocDesc:"مستند إضافي عند الحاجة للتحقق.",optional:"اختياري",reviewTitle:"مراجعة التسجيل",reviewDesc:"راجع بياناتك قبل إرسالها للتحقق.",notFilled:"غير مكتمل",sendingInfo:"سيتم إرسال البيانات بعد تأكيد التحقق.",verifyTitle:"عملية التحقق من السفر",verifyDesc:"تخضع كل شركة سفر لمراجعة بيانات النشاط والتراخيص والمستندات قبل التفعيل.",helpTitle:"هل تحتاج إلى مساعدة؟",helpDesc:"تواصل مع فريق Segaloka إذا احتجت إلى مساعدة.",licenses:{BPW:["وكالة سفر","للرحلات المحلية والدولية ورحلات الحلال."],PPIU:["منظم رحلات العمرة","للشركات المرخصة بتنظيم رحلات العمرة."],PIHK:["منظم الحج الخاص","للشركات المرخصة بتنظيم الحج الخاص."]}},
} as const;

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="travel-registration-field">
      <span className="travel-registration-field-label">
        {label}
        {required && <b aria-hidden="true">*</b>}
      </span>

      {children}
    </label>
  );
}

export default function TravelRegistrationClient() {
  const searchParams = useSearchParams();
  const { language } = useMarketplacePreferences();
  const copy = TRAVEL_COPY[language === "EN" ? "EN" : language === "AR" ? "AR" : "ID"];

  const [step, setStep] = useState<StepId>(1);
  const [form, setForm] =
    useState<RegistrationForm>(initialForm);
  const [documents, setDocuments] = useState<Record<string, File | null>>({});
  const [serverDocumentTypes, setServerDocumentTypes] = useState<Set<string>>(new Set());
  const [documentMetadataError, setDocumentMetadataError] = useState(false);
  const [reviewPreview, setReviewPreview] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);
  const [countries, setCountries] = useState<Array<{id:string;name:string;iso2?:string;phoneCode?:string;regionCount?:number;cityCount?:number}>>([]);
  const [countryPhoneCode, setCountryPhoneCode] = useState("+62");
  const [phoneCountryIso, setPhoneCountryIso] = useState("ID");
  const [phonePickerOpen, setPhonePickerOpen] = useState(false);
  const phonePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!phonePickerOpen) return;

    const handleOutsideClick = (event: PointerEvent) => {
      if (
        phonePickerRef.current &&
        !phonePickerRef.current.contains(event.target as Node)
      ) {
        setPhonePickerOpen(false);
        setPhoneCountrySearch("");
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPhonePickerOpen(false);
        setPhoneCountrySearch("");
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [phonePickerOpen]);
  const [phoneCountrySearch, setPhoneCountrySearch] = useState("");
  const phoneNationalNumber = form.phone.startsWith(countryPhoneCode)
    ? form.phone.slice(countryPhoneCode.length).replace(/\D/g, "")
    : form.phone.replace(/\D/g, "").replace(/^0+/, "");
  const [regions, setRegions] = useState<Array<{id:string;name:string}>>([]);
  const locationLabels = {
    ID: {
      ID: ["Provinsi", "Kota / Kabupaten"],
      MY: ["Negeri / Wilayah Persekutuan", "Daerah / Bandar"],
      JP: ["Prefektur", "Kota"],
      US: ["Negara Bagian", "Kota"],
      AE: ["Emirat", "Kota"],
      SG: ["", "Area / Lokasi"]
    },
    EN: {
      ID: ["Province", "City / Regency"],
      MY: ["State / Federal Territory", "District / City"],
      JP: ["Prefecture", "City"],
      US: ["State", "City"],
      AE: ["Emirate", "City"],
      SG: ["", "Area / Location"]
    },
    AR: {
      ID: ["المقاطعة", "المدينة / المديرية"],
      MY: ["الولاية / الإقليم الاتحادي", "المنطقة / المدينة"],
      JP: ["المحافظة", "المدينة"],
      US: ["الولاية", "المدينة"],
      AE: ["الإمارة", "المدينة"],
      SG: ["", "المنطقة / الموقع"]
    }
  } as const;

  const activeLocationLanguage =
    language === "AR" ? "AR" : language === "EN" ? "EN" : "ID";

  const selectedLocationCountry = countries.find(
    item => item.id === form.countryId
  );

  const locationCountryCode =
    selectedLocationCountry?.iso2 || "ID";

  const locationLabelPair =
    locationLabels[activeLocationLanguage][
      locationCountryCode as keyof typeof locationLabels.ID
    ];

  const regionLabel = locationLabelPair?.[0] || copy.region;
  const cityLabel = locationLabelPair?.[1] || copy.city;
  const [cities, setCities] = useState<Array<{id:string;name:string}>>([]);
  const hasLocationRegions = selectedLocationCountry
    ? selectedLocationCountry.iso2 === "ID" ||
      (selectedLocationCountry.regionCount ?? 0) > 0
    : true;

  const [regionsStatus, setRegionsStatus] =
    useState<"idle"|"loading"|"ready"|"error">("idle");

  const [citiesStatus, setCitiesStatus] =
    useState<"idle"|"loading"|"ready"|"error">("idle");

  const regionPlaceholder = hasLocationRegions
    ? `${activeLocationLanguage === "ID" ? "Pilih" : activeLocationLanguage === "EN" ? "Select" : "اختر"} ${regionLabel}`
    : "";

  const cityPlaceholder =
    `${activeLocationLanguage === "ID" ? "Pilih" : activeLocationLanguage === "EN" ? "Select" : "اختر"} ${cityLabel}`;

  const displayLocationName = (name: string) =>
    displayIndonesianLocationName(
      name,
      activeLocationLanguage,
      locationCountryCode
    );
  const countryDisplayNames = new Intl.DisplayNames(
    [activeLocationLanguage.toLowerCase()],
    { type: "region" }
  );

  const locationCollator = new Intl.Collator(
    activeLocationLanguage.toLowerCase(),
    { sensitivity: "base", numeric: true }
  );

  const sortedCountries = [...countries].sort((a, b) =>
    locationCollator.compare(
      a.iso2 ? countryDisplayNames.of(a.iso2) || a.name : a.name,
      b.iso2 ? countryDisplayNames.of(b.iso2) || b.name : b.name
    )
  );

  const sortedRegions = [...regions].sort((a, b) =>
    locationCollator.compare(
      displayLocationName(a.name),
      displayLocationName(b.name)
    )
  );

  const sortedCities = [...cities].sort((a, b) =>
    locationCollator.compare(
      displayLocationName(a.name),
      displayLocationName(b.name)
    )
  );
  const [locationState, setLocationState] = useState<"loading"|"ready"|"error">("loading");

  useEffect(() => {
    let cancelled = false;

    loadExistingRegistrationDraft("travel")
      .then(async existing => {
        if (!existing || cancelled) return;
        try {
          const types = await getRegistrationDocumentTypes(existing.id);
          if (cancelled) return;
          setServerDocumentTypes(types);
          setDocumentMetadataError(false);
        } catch (error) {
          if (cancelled) return;
          setDocumentMetadataError(true);
          console.error("REGISTRATION_DOCUMENT_METADATA_FAILED", error);
        }
        if (cancelled || !existing) return;

        setForm(current => {
          const changed = (Object.keys(initialForm) as Array<keyof RegistrationForm>)
            .some(key =>
              key !== "countryId" &&
              current[key] !== initialForm[key]
            );

          if (changed) return current;

          return {
            ...initialForm,
            ...existing.payload,
          } as RegistrationForm;
        });
      })
      .catch(error => {
        console.error("REGISTRATION_DRAFT_LOAD_FAILED", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  const requestedPlan = searchParams.get("plan");

  useEffect(() => { setLocationState("loading"); fetch("/api/master-data/countries", { cache: "no-store" }).then(r => r.ok ? r.json() : Promise.reject()).then(d => { const items = d.items || []; setCountries(items); setLocationState("ready"); const indonesia = items.find((x: {iso2?:string;name?:string}) => x.iso2 === "ID" || x.name === "Indonesia"); if (indonesia && !form.countryId) {  setForm(current => ({ ...current, countryId: indonesia.id, country: indonesia.name })); } }).catch(() => setLocationState("error")); }, []);
  useEffect(() => {
    setRegions([]);
    if (!form.countryId || !selectedLocationCountry) {
      setRegionsStatus("idle");
      return;
    }
    if (!hasLocationRegions) {
      setRegionsStatus("ready");
      return;
    }

    const controller = new AbortController();
    setRegionsStatus("loading");

    fetch(`/api/master-data/countries/${form.countryId}/regions`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(response => {
        if (!response.ok) throw new Error("REGIONS_API_FAILED");
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data.items) || data.items.length === 0) {
          throw new Error("REGIONS_EMPTY");
        }
        setRegions(data.items);
        setRegionsStatus("ready");
      })
      .catch(error => {
        if (error.name !== "AbortError") setRegionsStatus("error");
      });

    return () => controller.abort();
  }, [form.countryId, selectedLocationCountry?.regionCount]);
  useEffect(() => {
    setCities([]);

    if (!form.countryId || !selectedLocationCountry) {
      setCitiesStatus("idle");
      return;
    }

    if ((selectedLocationCountry.cityCount ?? 0) === 0) {
      setCitiesStatus("error");
      return;
    }

    if (hasLocationRegions && (!form.provinceId || regionsStatus !== "ready")) {
      setCitiesStatus("idle");
      return;
    }

    const controller = new AbortController();
    setCitiesStatus("loading");

    const endpoint = hasLocationRegions
      ? `/api/master-data/regions/${form.provinceId}/cities`
      : `/api/master-data/countries/${form.countryId}/cities`;

    fetch(endpoint, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(response => {
        if (!response.ok) throw new Error("CITIES_API_FAILED");
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data.items) || data.items.length === 0) {
          throw new Error("CITIES_EMPTY");
        }
        setCities(data.items);
        setCitiesStatus("ready");
      })
      .catch(error => {
        if (error.name !== "AbortError") setCitiesStatus("error");
      });

    return () => controller.abort();
  }, [
    form.countryId,
    form.provinceId,
    selectedLocationCountry?.cityCount,
    hasLocationRegions,
    regionsStatus
  ]);

  const selectedPlan = useMemo(() => {
    if (requestedPlan === "starter") return "Starter";
    if (requestedPlan === "growth") return "Growth";
    return null;
  }, [requestedPlan]);

  const setValue = (
    key: keyof RegistrationForm,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((current) =>
      Math.min(4, current + 1) as StepId,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const validateStep = (current: StepId) => {
    if (current === 3 && documentMetadataError) {
      setSubmitState("error");
      setSubmitMessage("Dokumen tersimpan gagal diperiksa. Muat ulang halaman.");
      return false;
    }
    const required = current === 1 ? [form.businessName, form.legalName, form.directorName, form.email, form.phone, form.countryId, ...(hasLocationRegions ? [form.provinceId] : []), form.cityId, form.address] : current === 2 ? [form.licenseType, form.licenseNumber] : current === 3 ? ["business", "license", "identity"].map(key => documents[key] || serverDocumentTypes.has(key)) : [];
    if (required.some(value => !value)) { setSubmitState("error"); setSubmitMessage(current === 3 ? copy.docs : copy.required); return false; }
    if (current === 1 && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || !/^\+[1-9]\d{7,14}$/.test(form.phone.trim().replace(/[\s().-]/g, "").replace(/^0/, countryPhoneCode)))) { setSubmitState("error"); setSubmitMessage(copy.invalidContact); return false; }
    if (form.website && !/^https?:\/\/[^\s]+$/i.test(form.website.trim())) { setSubmitState("error"); setSubmitMessage("Format website tidak valid"); return false; }
    return true;
  };

  const goToStep = (target: StepId) => { for (let i = 1 as StepId; i < target; i = (i + 1) as StepId) if (!validateStep(i)) return; setStep(target); };

  const previous = () => {
    setStep((current) =>
      Math.max(1, current - 1) as StepId,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const selectDocument = (key: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    const extensionAllowed = /\.(pdf|jpe?g|png)$/i.test(file.name);

    if (!allowed.includes(file.type) || !extensionAllowed) {
      window.alert(
        activeLocationLanguage === "AR"
          ? "يُسمح فقط بملفات PDF وJPG وPNG."
          : activeLocationLanguage === "EN"
            ? "Only PDF, JPG and PNG files are allowed."
            : "Hanya file PDF, JPG, dan PNG yang diperbolehkan."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      window.alert(
        activeLocationLanguage === "AR"
          ? "الحد الأقصى لحجم الملف هو 4 ميغابايت."
          : activeLocationLanguage === "EN"
            ? "Maximum file size is 4 MiB."
            : "Ukuran maksimal file adalah 4 MiB."
      );
      event.target.value = "";
      return;
    }

    if (file && serverDocumentTypes.has(key)) {
      window.alert("Dokumen jenis ini sudah tersimpan. Penggantian dokumen belum tersedia.");
      event.target.value = "";
      return;
    }
    setDocuments((current) => ({ ...current, [key]: file }));
  };
  const submit = async () => {
    setSubmitState("loading"); setSubmitMessage("");
    try {
      const phone = form.phone.trim().replace(/[\s().-]/g, "").replace(/^00/, "+").replace(/^0/, countryPhoneCode);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) throw new Error("Format email bisnis tidak valid");
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Nomor telepon harus berformat internasional");
      const payload = { ...form, email: form.email.trim().toLowerCase(), phone };
      const applicationId = await resolveRegistrationDraft("travel", payload);
      const existingDocumentTypes = await getRegistrationDocumentTypes(applicationId);
      if (Object.entries(documents).some(([key, file]) => file && existingDocumentTypes.has(key))) {
        throw new Error("Dokumen sudah tersimpan. Penggantian dokumen belum tersedia.");
      }
      for (const [documentType, file] of Object.entries(documents)) if (file && !existingDocumentTypes.has(documentType)) {
        const contentBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",").pop() || ""); reader.onerror = () => reject(new Error("Dokumen gagal dibaca")); reader.readAsDataURL(file); });
        const upload = await fetch("/api/registration/documents/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ applicationId, documentType, originalName: file.name, contentBase64 }) });
        if (!upload.ok) throw new Error("Upload dokumen gagal");
      }
      const finalResponse = await fetch(`/api/registration/applications/${applicationId}/submit`, { method: "POST" });
      const finalResult = await finalResponse.json();
      if (!finalResponse.ok) throw new Error(finalResult.code || "Finalisasi gagal");
      setSubmitState("success"); setSubmitMessage(`Referensi: ${finalResult.id} · Status: ${finalResult.status}`);
    } catch (error) { setSubmitState("error"); setSubmitMessage(error instanceof Error ? error.message : "Pendaftaran gagal"); }
  };

  return (
    <main
      className="travel-registration-page"
      dir={language === "AR" ? "rtl" : "ltr"}
    >
      <div className="travel-registration-shell">
        <Link
          href="/partner/travel"
          className="travel-registration-back"
        >
          <ArrowLeft size={16} />
          <span>{copy.back}</span>
        </Link>

        <header className="travel-registration-header">
          <div className="travel-registration-header-copy">
            <span className="travel-registration-eyebrow">
              SEGALOKA FOR TRAVEL
            </span>

            <h1>{copy.title}</h1>

            <p>
              {copy.intro}
            </p>
          </div>

          {selectedPlan && (
            <div className="travel-registration-plan">
              <span>{language === "EN" ? "Selected plan" : language === "AR" ? "الخطة المختارة" : "Paket dipilih"}</span>
              <strong>{selectedPlan}</strong>
            </div>
          )}
        </header>

        <nav
          className="travel-registration-steps"
          aria-label={copy.steps.join(", ")}
        >
          {steps.map((item, index) => {
            const Icon = item.icon;
            const active = item.id === step;
            const completed = item.id < step;

            return (
              <div
                key={item.id}
                className={[
                  "travel-registration-step",
                  active ? "is-active" : "",
                  completed ? "is-completed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => goToStep(item.id)}
                role="button"
                tabIndex={0}
              >
                <div className="travel-registration-step-icon">
                  {completed ? (
                    <Check size={17} />
                  ) : (
                    <Icon size={17} />
                  )}
                </div>

                <div>
                  <small>{copy.step} {item.id}</small>
                  <strong className="desktop-step-label">
                    {copy.steps[index]}
                  </strong>
                  <strong className="mobile-step-label">
                    {copy.shortSteps[index]}
                  </strong>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="travel-registration-layout">
          <section className="travel-registration-card">
            {step === 1 && (
              <>
                <div className="travel-registration-section-heading">
                  <div className="travel-registration-heading-icon">
                    <Building2 size={20} />
                  </div>

                  <div>
                    <h2>{copy.info}</h2>
                    <p>
                      {copy.infoDesc}
                    </p>
                  </div>
                </div>

                <div className="travel-registration-form-grid">
                  <Field
                    label={copy.brand}
                    required
                  >
                    <input
                      value={form.businessName}
                      onChange={(event) =>
                        setValue(
                          "businessName",
                          event.target.value,
                        )
                      }
                      placeholder={copy.brandPh}
                    />
                  </Field>

                  <Field
                    label={copy.legal}
                    required
                  >
                    <input
                      value={form.legalName}
                      onChange={(event) =>
                        setValue(
                          "legalName",
                          event.target.value,
                        )
                      }
                      placeholder={copy.legalPh}
                    />
                  </Field>

                  <Field
                    label={copy.director}
                    required
                  >
                    <input
                      value={form.directorName}
                      onChange={(event) =>
                        setValue(
                          "directorName",
                          event.target.value,
                        )
                      }
                      placeholder={copy.directorPh}
                    />
                  </Field>

                  <Field
                    label={copy.email}
                    required
                  >
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setValue(
                          "email",
                          event.target.value,
                        )
                      }
                      placeholder={copy.emailPh}
                    />
                  </Field>

                  <Field
                    label={copy.phone}
                    required
                  >
                    <div style={{ display: "flex", gap: 8, width: "100%" }} dir="ltr">
                      <div ref={phonePickerRef} style={{ position: "relative", width: 112, flexShrink: 0 }}>
                        <button
                          type="button"
                          aria-label={activeLocationLanguage === "AR" ? "اختر رمز الاتصال" : activeLocationLanguage === "EN" ? "Choose calling code" : "Pilih kode telepon"}
                          aria-expanded={phonePickerOpen}
                          onClick={() => setPhonePickerOpen(!phonePickerOpen)}
                          style={{
                            width: "100%",
                            height: "100%",
                            minHeight: 40,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 6,
                            padding: "0 9px",
                            border: "1px solid #cbd5e1",
                            borderRadius: 10,
                            background: "#fff",
                            cursor: "pointer"
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <img
                              src={`https://flagcdn.com/w40/${phoneCountryIso.toLowerCase()}.png`}
                              alt=""
                              width={25}
                              height={17}
                              style={{ objectFit: "cover", borderRadius: 2 }}
                            />
                            <span>{countryPhoneCode}</span>
                          </span>
                          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m6 9 6 6 6-6" /></svg>
                        </button>

                        {phonePickerOpen && (
                          <div
                            style={{
                              position: "absolute",
                              zIndex: 50,
                              top: "calc(100% + 5px)",
                              left: 0,
                              width: 300,
                              maxWidth: "min(300px, 90vw)",
                              padding: 8,
                              background: "#fff",
                              border: "1px solid #cbd5e1",
                              borderRadius: 10,
                              boxShadow: "0 12px 28px rgba(15,23,42,.14)"
                            }}
                          >
                            <input
                              type="search"
                              autoFocus
                              value={phoneCountrySearch}
                              onChange={(event) => setPhoneCountrySearch(event.target.value)}
                              placeholder={activeLocationLanguage === "AR" ? "ابحث عن دولة أو رمز" : activeLocationLanguage === "EN" ? "Search country or code" : "Cari negara atau kode"}
                              style={{
                                width: "100%",
                                height: 36,
                                padding: "0 10px",
                                border: "1px solid #cbd5e1",
                                borderRadius: 7,
                                marginBottom: 7
                              }}
                            />
                            <div style={{ maxHeight: 240, overflowY: "auto" }}>
                              {sortedCountries
                                .filter((x) => x.iso2 && x.phoneCode)
                                .filter((x) => {
                                  const name = x.iso2
                                    ? countryDisplayNames.of(x.iso2) || x.name
                                    : x.name;
                                  const query = phoneCountrySearch.toLocaleLowerCase().trim();
                                  return (
                                    !query ||
                                    name.toLocaleLowerCase().includes(query) ||
                                    x.iso2?.toLocaleLowerCase().includes(query) ||
                                    x.phoneCode?.includes(query)
                                  );
                                })
                                .map((x) => (
                                  <button
                                    key={x.id}
                                    type="button"
                                    onClick={() => {
                                      setPhoneCountryIso(x.iso2!);
                                      setCountryPhoneCode(x.phoneCode!);
                                      setValue("phone", x.phoneCode! + phoneNationalNumber);
                                      setPhonePickerOpen(false);
                                      setPhoneCountrySearch("");
                                    }}
                                    style={{
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 9,
                                      padding: "8px",
                                      border: 0,
                                      background: x.iso2 === phoneCountryIso ? "#eff6ff" : "#fff",
                                      textAlign: "left",
                                      cursor: "pointer",
                                      borderRadius: 6
                                    }}
                                  >
                                    <img
                                      src={`https://flagcdn.com/w40/${x.iso2!.toLowerCase()}.png`}
                                      alt=""
                                      width={25}
                                      height={17}
                                      style={{ objectFit: "cover", borderRadius: 2 }}
                                    />
                                    <span style={{ flex: 1 }}>
                                      {countryDisplayNames.of(x.iso2!) || x.name}
                                    </span>
                                    <span>{x.phoneCode}</span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        aria-label={copy.phone}
                        value={phoneNationalNumber}
                        onChange={(event) => {
                          const national = event.target.value.replace(/\D/g, "").replace(/^0+/, "");
                          setValue("phone", countryPhoneCode + national);
                        }}
                        placeholder="81234567890"
                        style={{ minWidth: 0, flex: 1 }}
                      />
                    </div>
                  </Field>

                  <Field label={copy.website}>
                    <input
                      type="url"
                      value={form.website}
                      onChange={(event) =>
                        setValue(
                          "website",
                          event.target.value,
                        )
                      }
                      placeholder={copy.websitePh}
                    />
                  </Field>

                  <div className="travel-registration-location-grid"><Field label={copy.country} required><select value={form.countryId} disabled={locationState !== "ready"} onChange={event => { const item = countries.find(x => x.id === event.target.value);  setForm(current => ({ ...current, countryId: event.target.value, country: item?.name || "", provinceId: "", province: "", cityId: "", city: "" })); }}><option value="">{locationState === "loading" ? copy.loading : copy.chooseCountry}</option>{sortedCountries.map(x => <option key={x.id} value={x.id}>{x.iso2 ? countryDisplayNames.of(x.iso2) || x.name : x.name}</option>)}</select></Field>
                  {hasLocationRegions && <Field label={regionLabel} required><select value={form.provinceId} disabled={!form.countryId || !regions.length} onChange={event => { const item = regions.find(x => x.id === event.target.value); setForm(current => ({ ...current, provinceId: event.target.value, province: item?.name || "", cityId: "", city: "" })); }}><option value="">{regionsStatus === "loading" ? copy.loading : regionPlaceholder}</option>{sortedRegions.map(x => <option key={x.id} value={x.id}>{displayLocationName(x.name)}</option>)}</select></Field>}
                  <Field label={cityLabel} required><select value={form.cityId} disabled={citiesStatus !== "ready" || !cities.length} onChange={event => { const item = cities.find(x => x.id === event.target.value); setForm(current => ({ ...current, cityId: event.target.value, city: item?.name || "" })); }}><option value="">{citiesStatus === "loading" ? copy.loading : cityPlaceholder}</option>{sortedCities.map(x => <option key={x.id} value={x.id}>{displayLocationName(x.name)}</option>)}</select></Field>

                  </div>
                  <div className="travel-registration-field-full">
                    <Field
                      label={copy.address}
                      required
                    >
                      <textarea
                        rows={4}
                        value={form.address}
                        onChange={(event) =>
                          setValue(
                            "address",
                            event.target.value,
                          )
                        }
                        placeholder={copy.addressPh}
                      />
                    </Field>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="travel-registration-section-heading">
                  <div className="travel-registration-heading-icon">
                    <ShieldCheck size={20} />
                  </div>

                  <div>
                    <h2>{copy.licenseTitle}</h2>
                    <p>
                      {copy.licenseDesc}
                    </p>
                  </div>
                </div>

                <div className="travel-license-options">
                  {licenseOptions.map((license) => (
                    <button
                      type="button"
                      key={license.id}
                      className={[
                        "travel-license-card",
                        form.licenseType === license.id
                          ? "is-selected"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() =>
                        setValue(
                          "licenseType",
                          license.id,
                        )
                      }
                    >
                      <span className="travel-license-radio">
                        {form.licenseType ===
                          license.id && <Check size={14} />}
                      </span>

                      <span className="travel-license-copy">
                        <strong>{license.title}</strong>
                        <small>{copy.licenses[license.id][0]}</small>
                        <p>{copy.licenses[license.id][1]}</p>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="travel-registration-form-grid license-number-grid">
                  <Field
                    label={`${copy.licenseNumber} ${form.licenseType}`}
                    required
                  >
                    <input
                      value={form.licenseNumber}
                      onChange={(event) =>
                        setValue(
                          "licenseNumber",
                          event.target.value,
                        )
                      }
                      placeholder={`${copy.licenseNumberPh} ${form.licenseType}`}
                    />
                  </Field>
                </div>

                <div className="travel-registration-info">
                  <ShieldCheck size={19} />

                  <p>
                    {copy.licenseInfo}
                  </p>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="travel-registration-section-heading">
                  <div className="travel-registration-heading-icon">
                    <FileCheck2 size={20} />
                  </div>

                  <div>
                    <h2>{copy.docsTitle}</h2>
                    <p>
                      {copy.docsDesc}
                    </p>
                  </div>
                </div>

                <div className="travel-document-list">
                  <DocumentUpload
                    title={copy.businessDoc}
                    description={copy.businessDocDesc}
                    file={documents.business}
                     language={activeLocationLanguage}
                     onChange={(event) => selectDocument("business", event)}
                  />

                  <DocumentUpload
                    title={`${copy.licenseDoc} ${form.licenseType}`}
                    description={`${copy.licenseDocDesc} ${form.licenseType}.`}
                    file={documents.license}
                     language={activeLocationLanguage}
                     onChange={(event) => selectDocument("license", event)}
                  />

                  <DocumentUpload
                    title={copy.directorDoc}
                    description={copy.directorDocDesc}
                    file={documents.identity}
                     language={activeLocationLanguage}
                     onChange={(event) => selectDocument("identity", event)}
                  />

                  <DocumentUpload
                    title={copy.supportingDoc}
                    description={copy.supportingDocDesc}
                    optional
                    optionalLabel={copy.optional}
                    file={documents.supporting}
                     language={activeLocationLanguage}
                     onChange={(event) => selectDocument("supporting", event)}
                  />
                </div>

                <div className="travel-registration-info">
                  <ShieldCheck size={19} />

                  <p>
                    {activeLocationLanguage === "AR"
  ? "يرجى رفع مستندات شركتكم لأغراض التحقق. ستُحفظ المستندات بسرية ولن تُستخدم إلا لأغراض التحقق وفقًا لسياسة الخصوصية الخاصة بسيجالوكا."
  : activeLocationLanguage === "EN"
    ? "Please upload your company documents for verification. Your documents will be kept confidential and used solely for verification purposes in accordance with Segaloka's Privacy Policy."
    : "Silakan unggah dokumen perusahaan Anda untuk keperluan verifikasi. Dokumen dijaga kerahasiaannya dan hanya digunakan untuk proses verifikasi sesuai kebijakan privasi Segaloka."}
                  </p>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="travel-registration-section-heading">
                  <div className="travel-registration-heading-icon">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h2>{copy.reviewTitle}</h2>
                    <p>{copy.reviewDesc}</p>
                  </div>
                </div>

                <div dir={activeLocationLanguage === "AR" ? "rtl" : "ltr"}>

                  <section style={{
                    marginTop: 18,
                    padding: 12,
                    border: "1px solid #e2e8f0",
                    borderRadius: 12
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 12,
                      padding: "10px 12px",
                      background: "#f1f7ff",
                      borderRadius: 8
                    }}>
                      <strong style={{ color: "#163a70" }}>
                        <Building2 size={16} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 8 }} />
                        {copy.info}
                      </strong>
                      <button type="button" onClick={() => setStep(1)}
                        style={{ color: "#0874e8", fontWeight: 600 }}>
                        {activeLocationLanguage === "AR" ? "تعديل" : activeLocationLanguage === "EN" ? "Edit" : "Ubah"}
                      </button>
                    </div>

                    <div className="travel-review-grid">
                      {([
                        [copy.brand, form.businessName],
                        [copy.legal, form.legalName],
                        [copy.director, form.directorName],
                        [copy.email, form.email],
                        [copy.phone, form.phone],
                        [copy.website, form.website],
                        [copy.country, form.country],
                        ...(hasLocationRegions ? [[copy.region, form.province]] : []),
                        [copy.city, form.city],
                        [copy.address, form.address],
                      ] as string[][]).map(([label, value], index) => (
                        <ReviewItem
                          key={`travel-${index}`}
                          label={label}
                          value={value || copy.notFilled}
                        />
                      ))}
                    </div>
                  </section>

                  <section style={{
                    marginTop: 14,
                    padding: 12,
                    border: "1px solid #e2e8f0",
                    borderRadius: 12
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 12,
                      padding: "10px 12px",
                      background: "#f1f7ff",
                      borderRadius: 8
                    }}>
                      <strong style={{ color: "#163a70" }}>
                        <ShieldCheck size={16} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 8 }} />
                        {copy.licenseTitle}
                      </strong>
                      <button type="button" onClick={() => setStep(2)}
                        style={{ color: "#0874e8", fontWeight: 600 }}>
                        {activeLocationLanguage === "AR" ? "تعديل" : activeLocationLanguage === "EN" ? "Edit" : "Ubah"}
                      </button>
                    </div>

                    <div className="travel-review-grid">
                      <ReviewItem
                        label={copy.licenseTitle}
                        value={`${form.licenseType} — ${copy.licenses[form.licenseType][0]}`}
                      />
                      <ReviewItem
                        label={copy.licenseNumber}
                        value={form.licenseNumber || copy.notFilled}
                      />
                    </div>
                  </section>

                  <section style={{
                    marginTop: 14,
                    padding: 12,
                    border: "1px solid #e2e8f0",
                    borderRadius: 12
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 12,
                      padding: "10px 12px",
                      background: "#f1f7ff",
                      borderRadius: 8
                    }}>
                      <strong style={{ color: "#163a70" }}>
                        <FileText size={16} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 8 }} />
                        {copy.docsTitle}
                      </strong>
                      <button type="button" onClick={() => setStep(3)}
                        style={{ color: "#0874e8", fontWeight: 600 }}>
                        {activeLocationLanguage === "AR" ? "تعديل" : activeLocationLanguage === "EN" ? "Edit" : "Ubah"}
                      </button>
                    </div>

                    <div className="travel-review-grid">
                      {([
                        ["business", copy.businessDoc],
                        ["license", `${copy.licenseDoc} ${form.licenseType}`],
                        ["identity", copy.directorDoc],
                        ["supporting", copy.supportingDoc],
                      ] as const).map(([key, label]) => {
                        const file = documents[key];

                        return (
                          <div className="travel-review-item" key={key}>
                            <span>{label}</span>
                            <strong style={{ overflowWrap: "anywhere" }}>
                              {file?.name || (
                                activeLocationLanguage === "AR" ? "لم يتم اختيار ملف"
                                : activeLocationLanguage === "EN" ? "Not selected"
                                : "Belum dipilih"
                              )}
                            </strong>
                            {file && (
                              <>
                                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                <button type="button"
                                  onClick={() => {
                                    const url = URL.createObjectURL(file);
                                    setReviewPreview({ url, name: file.name, type: file.type });
                                  }}
                                  style={{
                                    marginTop: 8,
                                    padding: "7px 12px",
                                    alignSelf: "flex-start",
                                    background: "#eff6ff",
                                    color: "#0969da",
                                    border: "1px solid #bfdbfe",
                                    borderRadius: 7,
                                    cursor: "pointer",
                                    fontWeight: 600
                                  }}>
                                  {activeLocationLanguage === "AR" ? "عرض المستند"
                                    : activeLocationLanguage === "EN" ? "View Document"
                                    : "Lihat Dokumen"}
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <div className="travel-review-notice">
                  <ShieldCheck size={22} />
                  <div>
                    <strong>{copy.sendingInfo}</strong>
                    <p>{copy.reviewDesc}</p>
                  </div>
                </div>

                {reviewPreview && (
                  <div
                    role="presentation"
                    onClick={() => {
                      URL.revokeObjectURL(reviewPreview.url);
                      setReviewPreview(null);
                    }}
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 9999,
                      background: "rgba(15,23,42,.75)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 20
                    }}
                  >
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-label={reviewPreview.name}
                      onClick={(event) => event.stopPropagation()}
                      style={{
                        width: "min(960px,100%)",
                        height: "min(780px,90vh)",
                        background: "#fff",
                        borderRadius: 12,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden"
                      }}
                    >
                      <div style={{
                        padding: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        borderBottom: "1px solid #e2e8f0"
                      }}>
                        <strong style={{ overflowWrap: "anywhere" }}>
                          {reviewPreview.name}
                        </strong>
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(reviewPreview.url);
                            setReviewPreview(null);
                          }}
                          style={{
                            padding: "8px 12px",
                            background: "#f1f5f9",
                            borderRadius: 8
                          }}
                        >
                          {activeLocationLanguage === "AR" ? "إغلاق"
                            : activeLocationLanguage === "EN" ? "Close"
                            : "Tutup"}
                        </button>
                      </div>
                      {reviewPreview.type.startsWith("image/") ? (
                        <img
                          src={reviewPreview.url}
                          alt={reviewPreview.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            minHeight: 0
                          }}
                        />
                      ) : (
                        <iframe
                          src={reviewPreview.url}
                          title={reviewPreview.name}
                          style={{
                            width: "100%",
                            flex: 1,
                            border: 0,
                            minHeight: 0
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {submitMessage ? <p className="travel-registration-form-message" role="alert">{submitMessage}</p> : null}
            <div className="travel-registration-actions">
              {step > 1 ? (
                <button
                  type="button"
                  className="travel-registration-button secondary"
                  onClick={previous}
                  >
                    <ArrowLeft size={17} />
                  {copy.backBtn}
                </button>
              ) : (
                <Link
                  href="/partner/travel"
                  className="travel-registration-button secondary"
                >
                  {copy.cancel}
                </Link>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  className="travel-registration-button primary"
                  onClick={next}
                >
                  {copy.next}
                  <ArrowRight size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  className="travel-registration-button primary"
                  disabled={submitState === "loading" || !form.businessName || !form.legalName || !form.licenseNumber || !form.directorName || !form.email || !form.phone || !form.countryId || (hasLocationRegions && !form.provinceId) || !form.cityId || !form.address || !documents.business || !documents.license || !documents.identity}
                  onClick={submit}
                >
                  {submitState === "loading" ? copy.sending : copy.submit}
                </button>
              )}
            </div>
          </section>

          <aside className="travel-registration-aside">
            <div className="travel-registration-aside-card">
              <div className="travel-registration-aside-icon">
                <ShieldCheck size={21} />
              </div>

              <h3>{copy.verifyTitle}</h3>

              <p>
                {copy.verifyDesc}
              </p>

              <div className="travel-registration-aside-points">
                <span>
                  <Check size={15} />
                  {copy.businessDoc}
                </span>

                <span>
                  <Check size={15} />
                  {copy.licenseTitle}
                </span>

                <span>
                  <Check size={15} />
                  {copy.supportingDoc}
                </span>

                <span>
                  <Check size={15} />
                  {copy.sendingInfo}
                </span>
              </div>
            </div>

            <div className="travel-registration-help">
              <UserRound size={18} />

              <div>
                <strong>{copy.helpTitle}</strong>
                <p>
                  {copy.helpDesc}
                </p>

                <a
                  className="travel-registration-help-email"
                  href="mailto:partner@segaloka.com"
                >
                  partner@segaloka.com
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function DocumentUpload({
  title,
  description,
  optional,
  optionalLabel = "Optional",
  onChange,
  file,
  language,
}: {
  title: string;
  description: string;
  optional?: boolean;
  optionalLabel?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  file?: File | null;
  language?: string;
}) {
  return (
    <div className="travel-document-card">
      <div className="travel-document-icon">
        <FileText size={20} />
      </div>

      <div className="travel-document-copy">
        <strong>
          {title}
          {optional && <small>{optionalLabel}</small>}
        </strong>

        <p>{description}</p>
        {file && (
          <p
            title={file.name}
            style={{
              color: "#087443",
              overflowWrap: "anywhere",
              marginTop: 4,
            }}
          >
            ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <label
        className="travel-document-upload"
        style={{
          cursor: "pointer",
          backgroundColor: file ? "#6B7280" : "#0868DF",
          borderColor: file ? "#6B7280" : "#0868DF",
          color: "#FFFFFF",
          fontWeight: 600,
          transition: "background-color 0.2s ease, border-color 0.2s ease",
        }}
      >
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          className="sr-only"
          style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
          onChange={onChange}
        />
        <Upload size={16} />
        {file ? (language === "AR" ? "تغيير الملف" : language === "EN" ? "Change file" : "Ganti file") : typeof document !== "undefined" && document.documentElement.lang.startsWith("ar")
          ? "اختر ملفًا"
          : typeof document !== "undefined" && document.documentElement.lang.startsWith("en")
            ? "Choose file"
            : "Pilih file"}
      </label>
    </div>
  );
}

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="travel-review-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
