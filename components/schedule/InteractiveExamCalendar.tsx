"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarFilterMode = "single" | "range" | "all";

export interface CalendarFilterState {
  mode: CalendarFilterMode;
  startDateKey: string | null; // "YYYY-MM-DD" in local time
  endDateKey: string | null; // "YYYY-MM-DD" in local time (for range mode)
}

/**
 * Converts a Date or ISO timestamp into a local "YYYY-MM-DD" key without UTC shift.
 */
export function toLocalDateKey(input: Date | string): string {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a "YYYY-MM-DD" key into a local Date at midnight.
 */
export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Checks whether a schedule timestamp matches the active calendar date filter.
 */
export function matchesCalendarFilter(
  dateInput: Date | string,
  filter: CalendarFilterState
): boolean {
  if (filter.mode === "all" || !filter.startDateKey) {
    return true;
  }

  const itemKey = toLocalDateKey(dateInput);
  if (!itemKey) return false;

  if (filter.mode === "single") {
    return itemKey === filter.startDateKey;
  }

  // Range mode
  if (filter.endDateKey) {
    const [minKey, maxKey] =
      filter.startDateKey <= filter.endDateKey
        ? [filter.startDateKey, filter.endDateKey]
        : [filter.endDateKey, filter.startDateKey];
    return itemKey >= minKey && itemKey <= maxKey;
  }

  return itemKey === filter.startDateKey;
}

/**
 * Returns a human-readable summary of the active date selection.
 */
export function formatCalendarFilterLabel(filter: CalendarFilterState): string {
  if (filter.mode === "all" || !filter.startDateKey) {
    return "All Scheduled Dates";
  }

  const fmtOpts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  if (filter.mode === "single") {
    return parseLocalDateKey(filter.startDateKey).toLocaleDateString("en-US", fmtOpts);
  }

  const startStr = parseLocalDateKey(filter.startDateKey).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (!filter.endDateKey) {
    return `From ${startStr} (select end date)`;
  }

  const [minKey, maxKey] =
    filter.startDateKey <= filter.endDateKey
      ? [filter.startDateKey, filter.endDateKey]
      : [filter.endDateKey, filter.startDateKey];

  const minLabel = parseLocalDateKey(minKey).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const maxLabel = parseLocalDateKey(maxKey).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return minKey === maxKey ? parseLocalDateKey(minKey).toLocaleDateString("en-US", fmtOpts) : `${minLabel} - ${maxLabel}`;
}

interface InteractiveExamCalendarProps {
  examDateKeys: Set<string>;
  filter: CalendarFilterState;
  onFilterChange: (next: CalendarFilterState) => void;
  todayKey: string;
}

export function InteractiveExamCalendar({
  examDateKeys,
  filter,
  onFilterChange,
  todayKey,
}: InteractiveExamCalendarProps) {
  // Visible month state, safely anchored initially then synced once to todayKey on client mount
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    if (filter.startDateKey) {
      const d = parseLocalDateKey(filter.startDateKey);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date(2026, 10, 1);
  });
  const hasSyncedInitialMonthRef = React.useRef(false);

  useEffect(() => {
    if (todayKey && !hasSyncedInitialMonthRef.current) {
      hasSyncedInitialMonthRef.current = true;
      const d = parseLocalDateKey(filter.startDateKey || todayKey);
      setVisibleMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [todayKey, filter.startDateKey]);

  const calendarCells = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const cells: Array<{
      day: number;
      dateKey: string;
      isCurrentMonth: boolean;
      targetMonthYear: { year: number; month: number };
    }> = [];

    // Leading days from previous month
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const d = new Date(prevYear, prevMonth, dayNum);
      cells.push({
        day: dayNum,
        dateKey: toLocalDateKey(d),
        isCurrentMonth: false,
        targetMonthYear: { year: prevYear, month: prevMonth },
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      cells.push({
        day: i,
        dateKey: toLocalDateKey(d),
        isCurrentMonth: true,
        targetMonthYear: { year, month },
      });
    }

    // Trailing days from next month to fill complete week rows
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const trailingCount = 7 - remainder;
      const nextYear = month === 11 ? year + 1 : year;
      const nextMonth = month === 11 ? 0 : month + 1;
      for (let i = 1; i <= trailingCount; i++) {
        const d = new Date(nextYear, nextMonth, i);
        cells.push({
          day: i,
          dateKey: toLocalDateKey(d),
          isCurrentMonth: false,
          targetMonthYear: { year: nextYear, month: nextMonth },
        });
      }
    }

    return cells;
  }, [visibleMonth]);

  const handlePrevMonth = () => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleTodayClick = () => {
    const key = todayKey || toLocalDateKey(new Date());
    const d = parseLocalDateKey(key);
    setVisibleMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    onFilterChange({
      mode: "single",
      startDateKey: key,
      endDateKey: null,
    });
  };

  const handleModeSwitch = (mode: CalendarFilterMode) => {
    if (mode === "all") {
      onFilterChange({
        mode: "all",
        startDateKey: filter.startDateKey,
        endDateKey: filter.endDateKey,
      });
      return;
    }

    const baseKey = filter.startDateKey || todayKey || toLocalDateKey(new Date());
    if (mode === "single") {
      onFilterChange({
        mode: "single",
        startDateKey: baseKey,
        endDateKey: null,
      });
      return;
    }

    // Switching to range mode preserves start date so the student/officer can just pick the end date
    onFilterChange({
      mode: "range",
      startDateKey: filter.startDateKey || null,
      endDateKey: filter.endDateKey || null,
    });
  };

  const handleCellClick = (
    dateKey: string,
    isCurrentMonth: boolean,
    targetMonthYear: { year: number; month: number },
    shiftKey: boolean
  ) => {
    if (!isCurrentMonth) {
      setVisibleMonth(new Date(targetMonthYear.year, targetMonthYear.month, 1));
    }

    // Shift+Click from any selected day forms a range cleanly
    if (shiftKey && filter.startDateKey && filter.mode !== "all") {
      const [minKey, maxKey] =
        filter.startDateKey <= dateKey
          ? [filter.startDateKey, dateKey]
          : [dateKey, filter.startDateKey];
      onFilterChange({
        mode: "range",
        startDateKey: minKey,
        endDateKey: maxKey,
      });
      return;
    }

    if (filter.mode === "range") {
      if (!filter.startDateKey || (filter.startDateKey && filter.endDateKey)) {
        onFilterChange({
          mode: "range",
          startDateKey: dateKey,
          endDateKey: null,
        });
      } else {
        const [minKey, maxKey] =
          filter.startDateKey <= dateKey
            ? [filter.startDateKey, dateKey]
            : [dateKey, filter.startDateKey];
        onFilterChange({
          mode: "range",
          startDateKey: minKey,
          endDateKey: maxKey,
        });
      }
      return;
    }

    onFilterChange({
      mode: "single",
      startDateKey: dateKey,
      endDateKey: null,
    });
  };

  // Compute normalized range bounds for cell styling
  const normalizedRange = useMemo(() => {
    if (filter.mode !== "range" || !filter.startDateKey) return null;
    if (!filter.endDateKey) {
      return { min: filter.startDateKey, max: filter.startDateKey };
    }
    return filter.startDateKey <= filter.endDateKey
      ? { min: filter.startDateKey, max: filter.endDateKey }
      : { min: filter.endDateKey, max: filter.startDateKey };
  }, [filter]);

  return (
    <Card className="border border-slate-200 shadow-xs rounded-2xl overflow-hidden bg-white">
      <CardContent className="p-5 space-y-4">
        {/* Month Title & Navigation */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {visibleMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Mode Controls: Single Day / Range (e.g. 5 - 10) / All / Today */}
        <div className="flex items-center justify-between gap-1.5 pb-1">
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleModeSwitch("single")}
              className={`px-2 py-1 rounded-md transition-all whitespace-nowrap ${
                filter.mode === "single"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Single Day
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("range")}
              className={`px-2 py-1 rounded-md transition-all whitespace-nowrap ${
                filter.mode === "range"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Range
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("all")}
              className={`px-2 py-1 rounded-md transition-all whitespace-nowrap ${
                filter.mode === "all"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
          </div>

          <button
            type="button"
            onClick={handleTodayClick}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
          >
            Today
          </button>
        </div>

        {/* Helpful Range Selection Hint */}
        {filter.mode === "range" && (
          <div className="text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-emerald-800 font-medium">
            {!filter.startDateKey
              ? "Click a start date (e.g., day 5), then an end date (e.g., day 10)."
              : !filter.endDateKey
              ? `Start: ${parseLocalDateKey(filter.startDateKey).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })} — now click end date.`
              : `Range: ${formatCalendarFilterLabel(filter)}`}
          </div>
        )}

        {/* Day Labels */}
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        {/* Date Grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {calendarCells.map((cell) => {
            const hasExam = examDateKeys.has(cell.dateKey);
            const isToday = cell.dateKey === todayKey;
            const isSingleSelected =
              filter.mode === "single" && filter.startDateKey === cell.dateKey;
            const isRangeEndpoint =
              normalizedRange !== null &&
              (cell.dateKey === normalizedRange.min || cell.dateKey === normalizedRange.max);
            const isInRangeMiddle =
              normalizedRange !== null &&
              cell.dateKey > normalizedRange.min &&
              cell.dateKey < normalizedRange.max;

            const isPrimarySelected = isSingleSelected || isRangeEndpoint;

            let cellClasses = "text-slate-700 hover:bg-slate-100 rounded-lg";
            if (!cell.isCurrentMonth && !isPrimarySelected && !isInRangeMiddle) {
              cellClasses = "text-slate-300 hover:bg-slate-50 rounded-lg";
            }
            if (isPrimarySelected) {
              cellClasses = "bg-emerald-600 text-white font-bold rounded-xl shadow-xs";
            } else if (isInRangeMiddle) {
              cellClasses = "bg-emerald-100 text-emerald-900 font-semibold rounded-lg";
            } else if (isToday && cell.isCurrentMonth) {
              cellClasses =
                "ring-1 ring-emerald-500 bg-emerald-50/50 text-emerald-800 font-bold rounded-xl hover:bg-emerald-100/70";
            }

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={(e) =>
                  handleCellClick(
                    cell.dateKey,
                    cell.isCurrentMonth,
                    cell.targetMonthYear,
                    e.shiftKey
                  )
                }
                title={
                  filter.mode === "single"
                    ? "Click to filter by this day (Shift+Click to select a range)"
                    : "Click to select range"
                }
                className={`h-9 flex flex-col items-center justify-center relative font-medium transition-colors cursor-pointer ${cellClasses}`}
              >
                <span>{cell.day}</span>
                {hasExam && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                      isPrimarySelected ? "bg-white" : "bg-emerald-500"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-400 text-center">
          Tip: Switch to <strong>Range</strong> or <strong>Shift+Click</strong> two dates (e.g. 5 – 10) to view exams across a range.
        </p>
      </CardContent>
    </Card>
  );
}
