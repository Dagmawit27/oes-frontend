"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";
import { User, RoleName, ApiResponse } from "@/types/auth";
import {
  Users as UsersIcon,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Shield,
  UserCheck,
  ShieldAlert,
  ChevronDown,
  Filter,
  Plus,
  X,
  Mail,
  Phone,
  Check,
} from "lucide-react";
import { AdminPageToolbar } from "@/components/admin/AdminPageToolbar";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { exportToCsv } from "@/lib/utils/exportCsv";

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "board" | "list">("table");

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination State - Default 20 as requested
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleName>("ROLE_STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<{ content: User[] }>>("/users", {
        params: {
          search: search.trim() || undefined,
          role: roleFilter || undefined,
          size: 200, // Fetch up to 200 to allow smooth client-side pagination with 20/50 sizing
        },
      });
      if (res.data.success) {
        setUsers(res.data.data.content);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await apiClient.post<ApiResponse<User>>("/users", {
        firstName,
        lastName,
        email,
        password,
        phone,
        roles: [selectedRole],
      });

      if (res.data.success) {
        setSuccess(`User ${firstName} ${lastName} created successfully!`);
        setShowModal(false);
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setPhone("");
        fetchUsers();
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Failed to create user");
    }
  };

  // Filtered by search and status
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        search === "" ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.phone && u.phone.includes(search));

      const matchesStatus =
        statusFilter === "" ||
        (statusFilter === "active" && u.isActive) ||
        (statusFilter === "disabled" && !u.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

  // Paginated slice
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;

  // Toggle selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedUsers.map((u) => u.id));
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
      "users_export",
      filteredUsers.map((u) => ({
        ID: u.id,
        Name: `${u.firstName} ${u.lastName}`,
        Email: u.email,
        Phone: u.phone || "N/A",
        Roles: u.roles.join(", "),
        Status: u.isActive ? "Active" : "Disabled",
      })),
      [
        { key: "ID", label: "ID" },
        { key: "Name", label: "Full Name" },
        { key: "Email", label: "Email Address" },
        { key: "Phone", label: "Phone" },
        { key: "Roles", label: "Assigned Roles" },
        { key: "Status", label: "Account Status" },
      ]
    );
  };

  const getBadgeVariant = (roles: RoleName[]) => {
    if (roles.includes("ROLE_ADMIN")) return "admin";
    if (roles.includes("ROLE_EXAM_OFFICER")) return "officer";
    if (roles.includes("ROLE_INSTRUCTOR")) return "instructor";
    if (roles.includes("ROLE_STUDENT")) return "student";
    return "secondary";
  };

  const formatRole = (roles: RoleName[]) => {
    return roles.map((r) => r.replace("ROLE_", "")).join(", ");
  };

  return (
    <DashboardShell allowedRoles={["ROLE_ADMIN"]}>
      <div className="space-y-5">
        {/* Header and Controls Toolbar matching design */}
        <AdminPageToolbar
          title="Users"
          subtitle="Manage your team members and their account permissions here."
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search users..."
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          primaryActionLabel="Add User"
          onPrimaryAction={() => setShowModal(true)}
          onExport={handleExport}
          filterChips={
            <>
              {/* Role Filter Pill */}
              <div className="relative inline-flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 transition-colors">
                  <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                  <span>Role:</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter users by role"
                    className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="">All Roles</option>
                    <option value="ROLE_ADMIN">Administrator</option>
                    <option value="ROLE_EXAM_OFFICER">Exam Officer</option>
                    <option value="ROLE_INSTRUCTOR">Instructor</option>
                    <option value="ROLE_STUDENT">Student</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Status / 2F Auth Filter Pill */}
              <div className="relative inline-flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 transition-colors">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
                  <span>Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter users by status"
                    className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="disabled">Disabled Only</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Add filter dummy trigger button */}
              <button
                type="button"
                onClick={() => {
                  if (roleFilter || statusFilter || search) {
                    setRoleFilter("");
                    setStatusFilter("");
                    setSearch("");
                    setCurrentPage(1);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1"
              >
                {roleFilter || statusFilter || search ? (
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

        {/* View Mode Switching: Table, Board, List */}
        {viewMode === "table" ? (
          /* White Background Table Container */
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="py-20 text-center text-sm font-medium text-slate-600">
                Loading accounts...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-20 text-center">
                <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No users found</h3>
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
                          aria-label="Select all users on this page"
                          checked={
                            paginatedUsers.length > 0 &&
                            paginatedUsers.every((u) => selectedIds.includes(u.id))
                          }
                          onChange={handleSelectAll}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedUsers.map((u) => {
                      const isSelected = selectedIds.includes(u.id);
                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? "bg-blue-50/40" : "bg-white"
                          }`}
                        >
                          <td className="py-3 px-4 w-10">
                            <input
                              type="checkbox"
                              aria-label={`Select ${u.firstName} ${u.lastName}`}
                              checked={isSelected}
                              onChange={() => handleToggleSelect(u.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center text-xs font-bold shrink-0">
                              {u.firstName.charAt(0)}
                              {u.lastName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-slate-900 font-semibold leading-tight">
                                {u.firstName} {u.lastName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-normal">
                                ID: #{u.id}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-mono text-xs font-medium">
                            {u.email}
                          </td>
                          <td className="py-3 px-4 text-slate-700 text-xs font-medium">
                            {u.phone || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={getBadgeVariant(u.roles)} className="font-semibold text-[11px]">
                              {formatRole(u.roles)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={u.isActive ? "success" : "secondary"}
                              className="font-semibold text-[11px]"
                            >
                              {u.isActive ? "Active" : "Disabled"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls with 1-20 default and 1-20, 1-50 filter */}
            <AdminTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[20, 50, 100]}
            />
          </div>
        ) : viewMode === "board" ? (
          /* Kanban Board View */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(["ROLE_ADMIN", "ROLE_EXAM_OFFICER", "ROLE_INSTRUCTOR", "ROLE_STUDENT"] as RoleName[]).map(
              (role) => {
                const roleUsers = filteredUsers.filter((u) => u.roles.includes(role));
                return (
                  <div key={role} className="bg-slate-50/80 rounded-xl border border-slate-200 p-3 space-y-3">
                    <div className="flex items-center justify-between font-semibold text-xs text-slate-800 pb-2 border-b border-slate-200">
                      <span>{role.replace("ROLE_", "")}</span>
                      <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px]">
                        {roleUsers.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {roleUsers.map((u) => (
                        <div
                          key={u.id}
                          className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                              {u.firstName.charAt(0)}
                              {u.lastName.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                              <div className="text-xs font-semibold text-slate-900 truncate">
                                {u.firstName} {u.lastName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {roleUsers.length === 0 && (
                        <div className="py-6 text-center text-xs text-slate-400">No members</div>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        ) : (
          /* Compact List View */
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs">
            {paginatedUsers.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-bold">
                    {u.firstName.charAt(0)}
                    {u.lastName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {u.firstName} {u.lastName}
                    </h4>
                    <p className="text-xs text-slate-600 font-mono">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getBadgeVariant(u.roles)}>{formatRole(u.roles)}</Badge>
                  <Badge variant={u.isActive ? "success" : "secondary"}>
                    {u.isActive ? "Active" : "Disabled"}
                  </Badge>
                </div>
              </div>
            ))}
            <AdminTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[20, 50, 100]}
            />
          </div>
        )}

        {/* User Provisioning Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Provision User Account
              </h3>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      First Name
                    </label>
                    <Input
                      placeholder="e.g. John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Last Name
                    </label>
                    <Input
                      placeholder="e.g. Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. j.doe@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Initial Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Phone Number
                    </label>
                    <Input
                      placeholder="+1-555-0199"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Assigned Role
                    </label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as RoleName)}
                    >
                      <option value="ROLE_STUDENT">Student</option>
                      <option value="ROLE_INSTRUCTOR">Instructor</option>
                      <option value="ROLE_EXAM_OFFICER">Exam Officer</option>
                      <option value="ROLE_ADMIN">Administrator</option>
                    </select>
                  </div>
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
                    Provision Account
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
