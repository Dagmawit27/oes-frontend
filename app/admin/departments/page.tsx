"use client";

import React, { useEffect, useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { academicApi } from "@/lib/api/academic";
import { Department } from "@/types/academic";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Building,
  ChevronDown,
  Plus,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { AdminPageToolbar } from "@/components/admin/AdminPageToolbar";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { exportToCsv } from "@/lib/utils/exportCsv";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "board" | "list">("table");

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination State - Default 20
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await academicApi.getDepartments();
      if (res.success) {
        setDepartments(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await academicApi.createDepartment({
        name,
        code,
        description,
        isActive: true,
      });

      if (res.success) {
        setSuccess("Department created successfully!");
        setName("");
        setCode("");
        setDescription("");
        setShowModal(false);
        fetchDepartments();
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Failed to create department");
    }
  };

  // Filtered list
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const matchesSearch =
        search === "" ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.code.toLowerCase().includes(search.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "" ||
        (statusFilter === "active" && d.isActive) ||
        (statusFilter === "inactive" && !d.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [departments, search, statusFilter]);

  // Paginated list
  const paginatedDepartments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredDepartments.slice(startIndex, startIndex + pageSize);
  }, [filteredDepartments, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredDepartments.length / pageSize) || 1;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedDepartments.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    exportToCsv(
      "departments_export",
      filteredDepartments.map((d) => ({
        ID: d.id,
        Code: d.code,
        Name: d.name,
        Description: d.description || "N/A",
        Status: d.isActive ? "Active" : "Inactive",
      })),
      [
        { key: "ID", label: "ID" },
        { key: "Code", label: "Department Code" },
        { key: "Name", label: "Department Name" },
        { key: "Description", label: "Description" },
        { key: "Status", label: "Status" },
      ]
    );
  };

  return (
    <DashboardShell allowedRoles={["ROLE_ADMIN"]}>
      <div className="space-y-5">
        {/* Header Toolbar */}
        <AdminPageToolbar
          title="Departments"
          subtitle="Manage academic departments and faculty divisions across the college."
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search departments..."
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          primaryActionLabel="Add Department"
          onPrimaryAction={() => setShowModal(true)}
          onExport={handleExport}
          filterChips={
            <>
              {/* Status Filter Pill */}
              <div className="relative inline-flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 transition-colors">
                  <Building className="w-3.5 h-3.5 text-slate-600" />
                  <span>Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter departments by status"
                    className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Reset filter */}
              <button
                type="button"
                onClick={() => {
                  if (statusFilter || search) {
                    setStatusFilter("");
                    setSearch("");
                    setCurrentPage(1);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1"
              >
                {statusFilter || search ? (
                  <span className="flex items-center gap-1 text-red-600 font-semibold">
                    <X className="w-3 h-3" /> Reset Filters
                  </span>
                ) : (
                  <>
                    <Plus className="w-3 h-3 text-slate-400" />
                    Add filter
                  </>
                )}
              </button>
            </>
          }
        />

        {success && (
          <Alert variant="success" className="bg-emerald-50 border-emerald-200 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800 font-medium">{success}</AlertDescription>
          </Alert>
        )}

        {viewMode === "table" ? (
          /* White Table Container */
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="py-20 text-center text-sm font-medium text-slate-600">
                Loading departments...
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="py-20 text-center">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No departments found</h3>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all departments on this page"
                          checked={
                            paginatedDepartments.length > 0 &&
                            paginatedDepartments.every((d) => selectedIds.includes(d.id))
                          }
                          onChange={handleSelectAll}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Department Name</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedDepartments.map((dept) => {
                      const isSelected = selectedIds.includes(dept.id);
                      return (
                        <tr
                          key={dept.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? "bg-blue-50/40" : "bg-white"
                          }`}
                        >
                          <td className="py-3 px-4 w-10">
                            <input
                              type="checkbox"
                              aria-label={`Select ${dept.name}`}
                              checked={isSelected}
                              onChange={() => handleToggleSelect(dept.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-semibold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                              {dept.code}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {dept.name}
                          </td>
                          <td className="py-3 px-4 text-slate-700 text-xs max-w-sm truncate font-medium">
                            {dept.description || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={dept.isActive ? "success" : "secondary"}
                              className="font-semibold text-[11px]"
                            >
                              {dept.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <AdminTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredDepartments.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[20, 50, 100]}
            />
          </div>
        ) : viewMode === "board" ? (
          /* Board View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {dept.code}
                  </span>
                  <Badge variant={dept.isActive ? "success" : "secondary"}>
                    {dept.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{dept.name}</h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {dept.description || "No description provided."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs">
            {paginatedDepartments.map((dept) => (
              <div key={dept.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-mono font-bold text-xs">
                    {dept.code}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{dept.name}</h4>
                    <p className="text-xs text-slate-600 truncate max-w-md">{dept.description || "—"}</p>
                  </div>
                </div>
                <Badge variant={dept.isActive ? "success" : "secondary"}>
                  {dept.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
            <AdminTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredDepartments.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[20, 50, 100]}
            />
          </div>
        )}

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Add Academic Department
              </h3>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Department Code
                  </label>
                  <Input
                    placeholder="e.g. CS"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Department Name
                  </label>
                  <Input
                    placeholder="e.g. Computer Science"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Description
                  </label>
                  <Input
                    placeholder="Department overview or division scope"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    Create Department
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
