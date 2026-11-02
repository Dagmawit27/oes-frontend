"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { questionApi } from "@/lib/api/question";
import { academicApi } from "@/lib/api/academic";
import { QuestionCategory } from "@/types/question";
import { Course } from "@/types/academic";
import { Layers, Plus, ArrowLeft, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function QuestionCategoriesPage() {
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    courseId: 0,
    description: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, courseRes] = await Promise.all([
        questionApi.getCategories(),
        academicApi.getCourses(),
      ]);
      setCategories(catRes.data);
      setCourses(courseRes.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await questionApi.createCategory({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        courseId: form.courseId ? form.courseId : undefined,
        description: form.description.trim() || undefined,
      });

      toast.success("Question category created successfully");
      setShowModal(false);
      setForm({ name: "", code: "", courseId: 0, description: "" });
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create category");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate this category?")) return;
    try {
      await questionApi.deleteCategory(id);
      toast.success("Category deactivated");
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to deactivate category");
    }
  };

  return (
    <DashboardShell allowedRoles={["ROLE_INSTRUCTOR", "ROLE_ADMIN"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/instructor/questions">
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Questions
            </Button>
          </Link>
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Category
          </Button>
        </div>

        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-800">
            <CardTitle className="text-xl flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Question Categories & Taxonomies
            </CardTitle>
            <CardDescription className="text-slate-400">
              Taxonomy tags to organize questions by curriculum topic and competency areas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-400">Loading categories...</div>
            ) : categories.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No categories defined yet. Click &quot;Add Category&quot; to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Category Code</th>
                      <th className="p-3">Category Name</th>
                      <th className="p-3">Course Association</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-blue-400">{cat.code}</td>
                        <td className="p-3 font-medium text-white">{cat.name}</td>
                        <td className="p-3 text-slate-300">
                          {cat.courseCode ? (
                            <span className="font-mono bg-blue-950/60 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
                              {cat.courseCode}
                            </span>
                          ) : (
                            <span className="text-slate-500">Universal (All Courses)</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400 max-w-xs truncate">{cat.description || "—"}</td>
                        <td className="p-3">
                          <Badge variant={cat.isActive ? "default" : "secondary"}>
                            {cat.isActive ? "Active" : "Archived"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(cat.id)}
                            className="text-slate-400 hover:text-red-400 hover:bg-slate-800 p-1.5 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CREATE CATEGORY MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="bg-slate-900 border-slate-800 text-slate-100 max-w-md w-full">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
                <CardTitle className="text-base text-white">Create Question Category</CardTitle>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Category Code *</label>
                    <Input
                      required
                      placeholder="e.g. CAT-ALGO, CAT-NET"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      className="bg-slate-950 border-slate-800 mt-1 uppercase text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Category Name *</label>
                    <Input
                      required
                      placeholder="e.g. Graph Algorithms & Shortest Path"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="bg-slate-950 border-slate-800 mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Associated Course (Optional)</label>
                    <select
                      value={form.courseId}
                      onChange={(e) => setForm({ ...form, courseId: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 mt-1"
                    >
                      <option value="0">Universal (All Courses)</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Short description of this topic area..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-white mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowModal(false)}
                      className="text-slate-400"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      Save Category
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
