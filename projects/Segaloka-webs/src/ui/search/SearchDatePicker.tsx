"use client";

import {
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

export type SearchDatePickerLabels = {
  title?: string;
  previousMonth?: string;
  nextMonth?: string;
  selectMonth?: string;
  selectYear?: string;
  close?: string;
};

export type SearchDatePickerProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  onClose: () => void;
  locale?: string;
  labels?: SearchDatePickerLabels;
  className?: string;
};

type CalendarMonthProps = {
  year: number;
  month: number;
  selectedDate: Date | null;
  locale: string;
  onSelect: (date: Date) => void;
};

function startOfToday() {
  const value = new Date();

  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  );
}

function startOfMonth(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    1,
  );
}

function sameDate(
  first: Date,
  second: Date,
) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function calendarDays(
  year: number,
  month: number,
) {
  const firstDay = new Date(
    year,
    month,
    1,
  ).getDay();

  const totalDays = new Date(
    year,
    month + 1,
    0,
  ).getDate();

  const values: Array<number | null> = [];

  for (
    let index = 0;
    index < firstDay;
    index += 1
  ) {
    values.push(null);
  }

  for (
    let day = 1;
    day <= totalDays;
    day += 1
  ) {
    values.push(day);
  }

  while (values.length % 7 !== 0) {
    values.push(null);
  }

  return values;
}

function monthNames(locale: string) {
  return Array.from(
    { length: 12 },
    (_, month) =>
      new Intl.DateTimeFormat(
        locale,
        {
          month: "long",
        },
      ).format(
        new Date(2026, month, 1),
      ),
  );
}

function weekdayNames(locale: string) {
  /*
   * 2026-10-04 adalah Minggu.
   * Dengan ini urutan calendar tetap:
   * Minggu -> Sabtu.
   */
  const sunday = new Date(
    2026,
    9,
    4,
  );

  return Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date(sunday);

      date.setDate(
        sunday.getDate() + index,
      );

      return new Intl.DateTimeFormat(
        locale,
        {
          weekday: "short",
        },
      ).format(date);
    },
  );
}

function CalendarMonth({
  year,
  month,
  selectedDate,
  locale,
  onSelect,
}: CalendarMonthProps) {
  const today = startOfToday();

  const days = useMemo(
    () => calendarDays(year, month),
    [
      year,
      month,
    ],
  );

  const weekdays = useMemo(
    () => weekdayNames(locale),
    [locale],
  );

  const title =
    new Intl.DateTimeFormat(
      locale,
      {
        month: "long",
        year: "numeric",
      },
    ).format(
      new Date(year, month, 1),
    );

  return (
    <div className="segaloka-search-calendar__month">
      <strong className="segaloka-search-calendar__month-title">
        {title}
      </strong>

      <div className="segaloka-search-calendar__weekdays">
        {weekdays.map(
          (weekday, index) => (
            <span
              key={`${weekday}-${index}`}
              className={
                index === 0
                  ? "is-sunday"
                  : undefined
              }
            >
              {weekday}
            </span>
          ),
        )}
      </div>

      <div className="segaloka-search-calendar__days">
        {days.map(
          (day, index) => {
            if (day === null) {
              return (
                <span
                  key={`empty-${index}`}
                  className="is-empty"
                />
              );
            }

            const date =
              new Date(
                year,
                month,
                day,
              );

            const disabled =
              date.getTime() <
              today.getTime();

            const selected =
              selectedDate
                ? sameDate(
                    date,
                    selectedDate,
                  )
                : false;

            const sunday =
              date.getDay() === 0;

            return (
              <button
                key={`${year}-${month}-${day}`}
                type="button"
                disabled={disabled}
                className={[
                  selected
                    ? "is-selected"
                    : "",
                  sunday
                    ? "is-sunday"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (!disabled) {
                    onSelect(date);
                  }
                }}
              >
                {day}
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

export function SearchDatePicker({
  value,
  onChange,
  onClose,
  locale = "id-ID",
  labels,
  className,
}: SearchDatePickerProps) {
  const today = useMemo(
    () => startOfToday(),
    [],
  );

  const initialCursor =
    value &&
    value.getTime() >=
      today.getTime()
      ? startOfMonth(value)
      : startOfMonth(today);

  const [
    cursor,
    setCursor,
  ] = useState(initialCursor);

  useEffect(() => {
    if (
      value &&
      value.getTime() >=
        today.getTime()
    ) {
      setCursor(
        startOfMonth(value),
      );
    }
  }, [
    value,
    today,
  ]);

  const months = useMemo(
    () => monthNames(locale),
    [locale],
  );

  const years = useMemo(
    () => {
      const currentYear =
        today.getFullYear();

      return Array.from(
        { length: 7 },
        (_, index) =>
          currentYear + index,
      );
    },
    [today],
  );

  const secondMonth =
    new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      1,
    );

  const canGoPrevious =
    cursor.getTime() >
    startOfMonth(today).getTime();

  function moveMonth(
    offset: number,
  ) {
    const next =
      new Date(
        cursor.getFullYear(),
        cursor.getMonth() + offset,
        1,
      );

    if (
      next.getTime() <
      startOfMonth(today).getTime()
    ) {
      return;
    }

    setCursor(next);
  }

  function changeMonth(
    month: number,
  ) {
    const next =
      new Date(
        cursor.getFullYear(),
        month,
        1,
      );

    if (
      next.getTime() <
      startOfMonth(today).getTime()
    ) {
      setCursor(
        startOfMonth(today),
      );

      return;
    }

    setCursor(next);
  }

  function changeYear(
    year: number,
  ) {
    const next =
      new Date(
        year,
        cursor.getMonth(),
        1,
      );

    if (
      next.getTime() <
      startOfMonth(today).getTime()
    ) {
      setCursor(
        startOfMonth(today),
      );

      return;
    }

    setCursor(next);
  }

  return (
    <div
      className={[
        "segaloka-search-calendar",
        className || "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="segaloka-search-calendar__header">
        <strong>
          {labels?.title ??
            "Tentukan tanggal"}
        </strong>

        <button
          type="button"
          className="segaloka-search-calendar__close"
          aria-label={
            labels?.close ??
            "Tutup kalender"
          }
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>

      <div className="segaloka-search-calendar__navigation">
        <button
          type="button"
          className="segaloka-search-calendar__nav"
          disabled={!canGoPrevious}
          aria-label={
            labels?.previousMonth ??
            "Bulan sebelumnya"
          }
          onClick={() =>
            moveMonth(-1)
          }
        >
          <ChevronLeft size={19} />
        </button>

        <div className="segaloka-search-calendar__selectors">
          <select
            value={cursor.getMonth()}
            aria-label={
              labels?.selectMonth ??
              "Pilih bulan"
            }
            onChange={(event) =>
              changeMonth(
                Number(
                  event.target.value,
                ),
              )
            }
          >
            {months.map(
              (month, index) => (
                <option
                  key={month}
                  value={index}
                >
                  {month}
                </option>
              ),
            )}
          </select>

          <select
            value={cursor.getFullYear()}
            aria-label={
              labels?.selectYear ??
              "Pilih tahun"
            }
            onChange={(event) =>
              changeYear(
                Number(
                  event.target.value,
                ),
              )
            }
          >
            {years.map(
              (year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              ),
            )}
          </select>
        </div>

        <button
          type="button"
          className="segaloka-search-calendar__nav"
          aria-label={
            labels?.nextMonth ??
            "Bulan berikutnya"
          }
          onClick={() =>
            moveMonth(1)
          }
        >
          <ChevronRight size={19} />
        </button>
      </div>

      <div className="segaloka-search-calendar__grid">
        <CalendarMonth
          year={cursor.getFullYear()}
          month={cursor.getMonth()}
          selectedDate={value}
          locale={locale}
          onSelect={onChange}
        />

        <CalendarMonth
          year={secondMonth.getFullYear()}
          month={secondMonth.getMonth()}
          selectedDate={value}
          locale={locale}
          onSelect={onChange}
        />
      </div>
    </div>
  );
}

export default SearchDatePicker;
