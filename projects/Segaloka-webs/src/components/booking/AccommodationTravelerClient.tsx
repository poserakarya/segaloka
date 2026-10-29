"use client";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileCheck2,
  IdCard,
  LockKeyhole,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";

import styles from "./AccommodationTraveler.module.css";

type Props = {
  slug: string;
  travelerCount: number;
  startDate?: string;
  endDate?: string;
  roomType?: string;
  rooms?: number;
  snapshot?: {
    periodId: string;
    pricePerPax: number;
    total: number;
    bookingDeadline: string;
  };
};

type TravelerForm = {
  fullName: string;
  gender: string;
  birthPlace: string;
  birthDate: string;
  nationality: string;
  passportNumber: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  passportIssuePlace: string;
  passportIssueCountry: string;
  passportFileName: string;
};

function createTraveler(): TravelerForm {
  return {
    fullName: "",
    gender: "",
    birthPlace: "",
    birthDate: "",
    nationality: "Indonesia",
    passportNumber: "",
    passportIssueDate: "",
    passportExpiryDate: "",
    passportIssuePlace: "",
    passportIssueCountry: "Indonesia",
    passportFileName: "",
  };
}

function formatDate(value?: string) {
  if (!value) return "-";

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function roomLabel(value?: string) {
  if (value === "double") return "Double";
  if (value === "triple") return "Triple";
  return "Quad";
}

function isComplete(item: TravelerForm) {
  return Boolean(
    item.fullName.trim() &&
      item.gender &&
      item.birthPlace.trim() &&
      item.birthDate &&
      item.nationality.trim() &&
      item.passportNumber.trim() &&
      item.passportIssueDate &&
      item.passportExpiryDate &&
      item.passportIssuePlace.trim() &&
      item.passportIssueCountry.trim() &&
      item.passportFileName
  );
}

export function AccommodationTravelerClient({
  slug,
  travelerCount,
  startDate,
  endDate,
  roomType,
  rooms = 1,
  snapshot,
}: Props) {
  const safeCount = Math.max(
    1,
    Math.min(20, travelerCount || 1),
  );

  const [travelers, setTravelers] = useState<TravelerForm[]>(
    () =>
      Array.from(
        { length: safeCount },
        () => createTraveler(),
      ),
  );

  const [activeTraveler, setActiveTraveler] =
    useState(0);

  const [submitted, setSubmitted] =
    useState(false);

  const completedCount = useMemo(
    () =>
      travelers.filter((traveler) =>
        isComplete(traveler),
      ).length,
    [travelers],
  );

  const current =
    travelers[activeTraveler] ??
    travelers[0];

  const updateCurrent = (
    key: keyof TravelerForm,
    value: string,
  ) => {
    setSubmitted(false);

    setTravelers((previous) =>
      previous.map((traveler, index) =>
        index === activeTraveler
          ? {
              ...traveler,
              [key]: value,
            }
          : traveler,
      ),
    );
  };

  const handlePassportFile = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    updateCurrent(
      "passportFileName",
      file?.name ?? "",
    );
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (completedCount !== travelers.length) {
      setSubmitted(true);
      return;
    }

    /*
     * UI ONLY.
     *
     * Data traveler/paspor sengaja TIDAK disimpan
     * ke localStorage/sessionStorage.
     *
     * Saat backend diaktifkan:
     * kirim melalui authenticated server action/API,
     * validasi server-side, RLS dan encrypted storage.
     */
    setSubmitted(true);
  };

  const sharedQuery =
    new URLSearchParams({
      periodId: snapshot?.periodId ?? "",
      traveler: String(safeCount),
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      roomType: roomType ?? "quad",
      rooms: String(rooms),
      pricePerPax: String(
        snapshot?.pricePerPax ?? 0,
      ),
      total: String(
        snapshot?.total ?? 0,
      ),
      bookingDeadline:
        snapshot?.bookingDeadline ?? "",
    }).toString();

  const orderHref =
    `/booking/${slug}/pesanan?${sharedQuery}`;

  const packageInfoHref =
    `/booking/${slug}/paket-info?${sharedQuery}`;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/">
            Beranda
          </Link>

          <span>/</span>

          <Link href="/akomodasi">
            Akomodasi & LA
          </Link>

          <span>/</span>

          <Link href={orderHref}>
            Detail Pesanan
          </Link>

          <span>/</span>

          <strong>
            Data Traveler
          </strong>
        </nav>

        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>
              DATA TRAVELER & PASPOR
            </span>

            <h1>
              Lengkapi data traveler
            </h1>

            <p>
              Data ini digunakan untuk proses
              operasional Land Arrangement,
              visa dan dokumen perjalanan.
            </p>
          </div>

          <div className={styles.security}>
            <ShieldCheck size={19} />

            <div>
              <strong>
                Data sensitif
              </strong>

              <span>
                Tidak disimpan di browser
              </span>
            </div>
          </div>
        </section>

        <section className={styles.orderStrip}>
          <div>
            <CalendarDays size={17} />

            <span>
              Periode
            </span>

            <strong>
              {formatDate(startDate)}
              {" — "}
              {formatDate(endDate)}
            </strong>
          </div>

          <div>
            <UsersRound size={17} />

            <span>
              Traveler
            </span>

            <strong>
              {safeCount} orang
            </strong>
          </div>

          <div>
            <IdCard size={17} />

            <span>
              Kamar
            </span>

            <strong>
              {roomLabel(roomType)}
              {" · "}
              {rooms} kamar
            </strong>
          </div>
        </section>

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sideHeading}>
              <span>
                TRAVELER
              </span>

              <strong>
                {completedCount}/{safeCount}
                {" "}lengkap
              </strong>
            </div>

            <div className={styles.travelerList}>
              {travelers.map(
                (traveler, index) => {
                  const complete =
                    isComplete(traveler);

                  return (
                    <button
                      key={index}
                      type="button"
                      className={
                        index === activeTraveler
                          ? styles.travelerActive
                          : styles.travelerButton
                      }
                      onClick={() =>
                        setActiveTraveler(index)
                      }
                    >
                      <span
                        className={
                          complete
                            ? styles.avatarComplete
                            : styles.avatar
                        }
                      >
                        {complete ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          <UserRound size={17} />
                        )}
                      </span>

                      <span>
                        <strong>
                          Traveler {index + 1}
                        </strong>

                        <small>
                          {traveler.fullName ||
                            "Belum diisi"}
                        </small>
                      </span>

                      <ChevronDown
                        size={15}
                        className={
                          styles.chevron
                        }
                      />
                    </button>
                  );
                },
              )}
            </div>

            <div className={styles.deadlineNote}>
              <CircleAlert size={17} />

              <div>
                <strong>
                  Wajib dilengkapi
                </strong>

                <p>
                  Batas pengisian nantinya
                  mengikuti konfigurasi periode
                  dari Travel/Vendor, misalnya
                  H-30 atau H-21.
                </p>
              </div>
            </div>
          </aside>

          <form
            className={styles.formCard}
            onSubmit={handleSubmit}
          >
            <div className={styles.formHeading}>
              <div>
                <span>
                  TRAVELER {activeTraveler + 1}
                </span>

                <h2>
                  Identitas sesuai paspor
                </h2>

                <p>
                  Pastikan seluruh data sama
                  persis dengan paspor.
                </p>
              </div>

              {isComplete(current) ? (
                <span className={styles.completeBadge}>
                  <CheckCircle2 size={14} />
                  Lengkap
                </span>
              ) : (
                <span className={styles.pendingBadge}>
                  Belum lengkap
                </span>
              )}
            </div>

            <section className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <UserRound size={18} />

                <div>
                  <h3>
                    Data Pribadi
                  </h3>

                  <p>
                    Identitas utama traveler.
                  </p>
                </div>
              </div>

              <div className={styles.grid}>
                <label className={styles.full}>
                  <span>
                    Nama Lengkap Sesuai Paspor *
                  </span>

                  <input
                    value={current.fullName}
                    onChange={(event) =>
                      updateCurrent(
                        "fullName",
                        event.target.value,
                      )
                    }
                    placeholder="Contoh: MUHAMMAD FAJAR"
                  />
                </label>

                <label>
                  <span>
                    Jenis Kelamin *
                  </span>

                  <select
                    value={current.gender}
                    onChange={(event) =>
                      updateCurrent(
                        "gender",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Pilih
                    </option>

                    <option value="male">
                      Laki-laki
                    </option>

                    <option value="female">
                      Perempuan
                    </option>
                  </select>
                </label>

                <label>
                  <span>
                    Kewarganegaraan *
                  </span>

                  <input
                    value={current.nationality}
                    onChange={(event) =>
                      updateCurrent(
                        "nationality",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    Tempat Lahir *
                  </span>

                  <input
                    value={current.birthPlace}
                    onChange={(event) =>
                      updateCurrent(
                        "birthPlace",
                        event.target.value,
                      )
                    }
                    placeholder="Kota kelahiran"
                  />
                </label>

                <label>
                  <span>
                    Tanggal Lahir *
                  </span>

                  <input
                    type="date"
                    value={current.birthDate}
                    onChange={(event) =>
                      updateCurrent(
                        "birthDate",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>
            </section>

            <section className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <IdCard size={18} />

                <div>
                  <h3>
                    Data Paspor
                  </h3>

                  <p>
                    Masukkan informasi paspor
                    yang masih berlaku.
                  </p>
                </div>
              </div>

              <div className={styles.grid}>
                <label className={styles.full}>
                  <span>
                    Nomor Paspor *
                  </span>

                  <input
                    value={
                      current.passportNumber
                    }
                    onChange={(event) =>
                      updateCurrent(
                        "passportNumber",
                        event.target.value
                          .toUpperCase(),
                      )
                    }
                    placeholder="Nomor paspor"
                  />
                </label>

                <label>
                  <span>
                    Tanggal Terbit *
                  </span>

                  <input
                    type="date"
                    value={
                      current.passportIssueDate
                    }
                    onChange={(event) =>
                      updateCurrent(
                        "passportIssueDate",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    Tanggal Kedaluwarsa *
                  </span>

                  <input
                    type="date"
                    value={
                      current.passportExpiryDate
                    }
                    onChange={(event) =>
                      updateCurrent(
                        "passportExpiryDate",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    Tempat Penerbitan *
                  </span>

                  <input
                    value={
                      current.passportIssuePlace
                    }
                    onChange={(event) =>
                      updateCurrent(
                        "passportIssuePlace",
                        event.target.value,
                      )
                    }
                    placeholder="Contoh: Makassar"
                  />
                </label>

                <label>
                  <span>
                    Negara Penerbit *
                  </span>

                  <input
                    value={
                      current.passportIssueCountry
                    }
                    onChange={(event) =>
                      updateCurrent(
                        "passportIssueCountry",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>
            </section>

            <section className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <FileCheck2 size={18} />

                <div>
                  <h3>
                    Dokumen Paspor
                  </h3>

                  <p>
                    Unggah halaman identitas
                    paspor traveler.
                  </p>
                </div>
              </div>

              <label className={styles.uploadBox}>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handlePassportFile}
                />

                <span className={styles.uploadIcon}>
                  <Upload size={21} />
                </span>

                <span>
                  <strong>
                    {current.passportFileName ||
                      "Unggah paspor"}
                  </strong>

                  <small>
                    JPG, PNG atau PDF
                  </small>
                </span>
              </label>
            </section>

            {submitted &&
              completedCount !==
                travelers.length && (
                <div className={styles.errorBox}>
                  <CircleAlert size={18} />

                  <span>
                    Lengkapi seluruh data
                    Traveler 1 sampai Traveler{" "}
                    {safeCount} sebelum
                    melanjutkan.
                  </span>
                </div>
              )}

            {submitted &&
              completedCount ===
                travelers.length && (
                <div className={styles.successBox}>
                  <CheckCircle2 size={18} />

                  <div>
                    <strong>
                      Data UI sudah lengkap
                    </strong>

                    <p>
                      Belum dikirim ke server
                      karena integrasi backend
                      belum diaktifkan.
                    </p>
                  </div>
                </div>
              )}

            <div className={styles.actions}>
              <Link
                href={orderHref}
                className={styles.secondary}
              >
                <ArrowLeft size={16} />
                Detail Pesanan
              </Link>

              <button
                type="submit"
                className={styles.primary}
              >
                <Save size={16} />
                Simpan Data Traveler
              </button>
            </div>

            <div className={styles.privacy}>
              <LockKeyhole size={15} />

              <p>
                Informasi paspor adalah data
                sensitif. Pada tahap UI ini
                data hanya berada di state
                halaman dan akan hilang ketika
                halaman ditutup atau direfresh.
              </p>
            </div>

            {completedCount === safeCount && (
              <Link
                href={packageInfoHref}
                className={styles.packageInfoLink}
              >
                Lanjut ke Paket Info
              </Link>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}