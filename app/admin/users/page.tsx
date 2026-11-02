"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";
import { User, RoleName, ApiResponse } from "@/types/auth";
import { Users, UserPlus, Search, CheckCircle2, AlertCircle, Shield } from "lucide-react";

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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
          size: 50,
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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              User Account Management
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Create accounts, provision credentials, and assign administrative or student roles
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="shadow-md shadow-blue-500/20">
            <UserPlus className="w-4 h-4 mr-2" />
            Add User Account
          </Button>
        </div>

        {success && (
          <Alert variant="success">
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="flex h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All System Roles</option>
            <option value="ROLE_ADMIN">Administrator</option>
            <option value="ROLE_EXAM_OFFICER">Exam Officer</option>
            <option value="ROLE_INSTRUCTOR">Instructor</option>
            <option value="ROLE_STUDENT">Student</option>
          </select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Registered College Accounts ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading accounts...</div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                            {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                          </div>
                          <span>{u.firstName} {u.lastName}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-xs">{u.email}</td>
                        <td className="py-3 px-4 text-slate-500">{u.phone || "—"}</td>
                        <td className="py-3 px-4">
                          <Badge variant={getBadgeVariant(u.roles)}>
                            {formatRole(u.roles)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={u.isActive ? "success" : "secondary"}>
                            {u.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
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
                      className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
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
                  <Button type="submit">Provision Account</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
