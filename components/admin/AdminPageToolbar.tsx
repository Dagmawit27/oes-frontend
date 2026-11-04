"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table as TableIcon,
  Kanban,
  List,
  Search,
  SlidersHorizontal,
  Settings2,
  MoreHorizontal,
  Download,
  ChevronDown,
  X,
} from "lucide-react";

interface AdminPageToolbarProps {
  title: string;
  subtitle: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  viewMode?: "table" | "board" | "list";
  onViewModeChange?: (mode: "table" | "board" | "list") => void;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  onExport?: () => void;
  filterChips?: React.ReactNode;
}

export function AdminPageToolbar({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  viewMode = "table",
  onViewModeChange,
  primaryActionLabel,
  onPrimaryAction,
  onExport,
  filterChips,
}: AdminPageToolbarProps) {
  const [showSearchInput, setShowSearchInput] = useState(Boolean(searchValue));
  const [showCustomizeNotice, setShowCustomizeNotice] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <div className="space-y-4">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>

      {/* Primary Toolbar Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Left: View Mode Tabs */}
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start">
          <button
            type="button"
            onClick={() => onViewModeChange?.("table")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-slate-600" />
            Table
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange?.("board")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "board"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Kanban className="w-3.5 h-3.5 text-slate-500" />
            Board
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange?.("list")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "list"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <List className="w-3.5 h-3.5 text-slate-500" />
            List
          </button>
        </div>

        {/* Right: Actions Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search Bar / Trigger */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-36 sm:w-48 transition-all shadow-2xs"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Hide button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCustomizeNotice(!showCustomizeNotice)}
            className="h-8 px-2.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 font-medium gap-1 shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            Hide
          </Button>

          {/* Customize button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCustomizeNotice(!showCustomizeNotice)}
            className="h-8 px-2.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 font-medium gap-1 shadow-2xs"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500" />
            Customize
          </Button>

          {/* More options button */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="h-8 w-8 p-0 text-slate-600 border-slate-200 hover:bg-slate-50 shadow-2xs"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            {showMoreMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 text-xs text-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    onExport?.();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Quick CSV Export
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                >
                  Print View
                </button>
              </div>
            )}
          </div>

          {/* Export Button */}
          {onExport && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-8 px-3 text-xs font-medium text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
            >
              Export
            </Button>
          )}

          {/* Primary Action Button (e.g. Add User ▾) */}
          <Button
            type="button"
            size="sm"
            onClick={onPrimaryAction}
            className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1 shadow-sm"
          >
            {primaryActionLabel}
            <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      {filterChips && (
        <div className="flex items-center flex-wrap gap-2 pt-1">
          {filterChips}
        </div>
      )}
    </div>
  );
}
