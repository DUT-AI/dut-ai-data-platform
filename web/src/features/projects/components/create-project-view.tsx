"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
  Layers,
  FileText,
  Eye,
  Type,
  Mic,
  MessageSquare,
  Bot,
  Table,
  Activity,
  Video,
  Users,
  Search,
  ArrowLeft,
  Workflow,
  Tag,
  ShieldAlert,
} from "lucide-react";
import {
  useCreateProjectMutation,
  useProjectTemplatesQuery,
  useProjectTemplateGroupsQuery,
} from "../hooks";
import { createProjectSchema, CreateProjectFormValues } from "../types";
import {
  Button,
  Input,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui";

type TabType = "name" | "config";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Computer Vision": <Eye className="h-4 w-4" />,
  "Natural Language Processing": <Type className="h-4 w-4" />,
  "Audio/Speech Processing": <Mic className="h-4 w-4" />,
  "Conversational AI": <MessageSquare className="h-4 w-4" />,
  Chat: <Bot className="h-4 w-4" />,
  "Structured Data Parsing": <Table className="h-4 w-4" />,
  "Time Series Analysis": <Activity className="h-4 w-4" />,
  Videos: <Video className="h-4 w-4" />,
  "Generative AI": <Sparkles className="h-4 w-4" />,
  "Community Contributions": <Users className="h-4 w-4" />,
};

export function CreateProjectView() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("name");

  // Fetch groups and templates directly from backend catalog API
  const { data: groups = [], isLoading: isGroupsLoading } =
    useProjectTemplateGroupsQuery();
  const { data: templates = [], isLoading: isTemplatesLoading } =
    useProjectTemplatesQuery();

  // Template selection state
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useCreateProjectMutation();

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      template_id: "",
      storage_provider_key: "minio",
    },
  });

  // Derive active group and template fallback from catalog data
  const activeGroup = selectedGroup || (groups.length > 0 ? groups[0] : "");
  const activeTemplateId =
    selectedTemplateId || (templates.length > 0 ? templates[0].id : "");

  // Filter templates for current selected group & search query
  const currentTemplates = useMemo(() => {
    let list = templates.filter((t) => t.group === activeGroup);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [templates, activeGroup, searchQuery]);

  // Selected template object
  const activeTemplate = useMemo(() => {
    return (
      templates.find((t) => t.id === activeTemplateId) ||
      currentTemplates[0] ||
      null
    );
  }, [activeTemplateId, templates, currentTemplates]);

  // Sync backend template id to form
  useEffect(() => {
    if (activeTemplate) {
      form.setValue("template_id", activeTemplate.id);
      form.setValue("storage_provider_key", "minio");
    }
  }, [activeTemplate, form]);

  const onSubmit = async (values: CreateProjectFormValues) => {
    setErrorMsg(null);
    try {
      const templateId = values.template_id || activeTemplate?.id;

      if (!templateId) {
        setErrorMsg(
          "Vui lòng đợi danh mục bài toán tải xong hoặc chọn lại bài toán."
        );
        return;
      }

      const payload: CreateProjectFormValues = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        template_id: templateId,
        storage_provider_key: "minio",
      };

      const newProj = await createMutation.mutateAsync(payload);
      router.push(`/projects/${newProj.id}`);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi trong quá trình tạo dự án."
      );
    }
  };

  const isLoadingData = isGroupsLoading || isTemplatesLoading;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50 dark:bg-slate-900">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex h-full flex-col justify-between"
        >
          {/* Top Bar Navigation */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 py-3.5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="h-8 gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab("name")}
                    className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                      activeTab === "name"
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    1. Thông tin chung
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("config")}
                    className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                      activeTab === "config"
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    2. Cấu hình Blueprint AI
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.back()}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || isLoadingData}
                className="bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Đang khởi tạo...
                  </>
                ) : (
                  "Tạo dự án mới"
                )}
              </Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Step 1: Name & Description */}
            {activeTab === "name" && (
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="w-full max-w-xl space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      Thông tin dự án mới
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Khởi tạo không gian làm việc cho dữ liệu và mô hình AI của
                      bạn.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Tên dự án *
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. YOLOv11 Autonomous Vehicle Detection"
                              className="h-10 text-sm"
                              autoFocus
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Mô tả mục tiêu
                          </FormLabel>
                          <FormControl>
                            <textarea
                              {...field}
                              rows={4}
                              placeholder="Mô tả phạm vi dataset, nhãn dữ liệu và pipeline đào tạo mô hình..."
                              className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => setActiveTab("config")}
                      className="flex w-full items-center justify-center gap-2 bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      Tiếp tục: Cấu hình Blueprint AI
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Blueprint & Template Selector */}
            {activeTab === "config" && (
              <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar: Categories */}
                <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <h4 className="mb-3 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Nhóm bài toán (Categories)
                  </h4>
                  <ul className="space-y-1">
                    {groups.map((group) => {
                      const isActive = selectedGroup === group;
                      const icon = CATEGORY_ICONS[group] || (
                        <Layers className="h-4 w-4" />
                      );
                      return (
                        <li key={group}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGroup(group);
                              setSearchQuery("");
                            }}
                            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-medium transition ${
                              isActive
                                ? "bg-blue-600 font-semibold text-white shadow-sm"
                                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 truncate">
                              <span
                                className={
                                  isActive ? "text-white" : "text-slate-400"
                                }
                              >
                                {icon}
                              </span>
                              <span className="truncate">{group}</span>
                            </div>
                            <ChevronRight
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isActive ? "text-white" : "text-slate-400"
                              }`}
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </aside>

                {/* Middle: Template Cards Grid */}
                <main className="flex flex-1 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {selectedGroup}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Chọn cấu hình gán nhãn bài toán AI phù hợp với dữ liệu
                        của bạn.
                      </p>
                    </div>

                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm mẫu bài toán..."
                        className="h-8 border-slate-200 bg-white pl-8 text-xs dark:border-slate-800 dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  {isLoadingData ? (
                    <div className="flex flex-1 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                      {currentTemplates.map((tpl) => {
                        const isSelected = activeTemplateId === tpl.id;
                        const isEnterprise = tpl.type === "enterprise";

                        return (
                          <div
                            key={tpl.id}
                            onClick={() => setSelectedTemplateId(tpl.id)}
                            className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition hover:shadow-md dark:bg-slate-900 ${
                              isSelected
                                ? "border-blue-600 shadow-sm ring-2 ring-blue-500/20"
                                : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </div>
                            )}

                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                              {tpl.image ? (
                                <img
                                  src={tpl.image}
                                  alt={tpl.title}
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display =
                                      "none";
                                  }}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                  Task Preview
                                </div>
                              )}
                            </div>

                            <div className="flex flex-1 flex-col justify-between p-3">
                              <h3 className="line-clamp-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                                {tpl.title}
                              </h3>
                              {isEnterprise && (
                                <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  Enterprise Ready
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </main>

                {/* Right: Template Specs Overview */}
                <aside className="w-80 shrink-0 overflow-y-auto bg-white p-5 dark:bg-slate-950">
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="rounded bg-blue-600/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                          {selectedGroup}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {activeTemplate?.modality || "multi-modal"}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {activeTemplate?.title || "Chưa chọn mẫu"}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {activeTemplate?.description ||
                          "Tự động kích hoạt bộ công cụ gán nhãn Native cho bài toán."}
                      </p>
                    </div>

                    {/* Default Tools */}
                    {activeTemplate?.tools &&
                      activeTemplate.tools.length > 0 && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <Workflow className="h-3.5 w-3.5" />
                            Supported Toolset
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {activeTemplate.tools.map((tool, idx) => (
                              <div
                                key={idx}
                                className="rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-800/50"
                              >
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {tool.name}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {tool.desc}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Default Label Classes */}
                    {activeTemplate?.labels &&
                      activeTemplate.labels.length > 0 && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <Tag className="h-3.5 w-3.5" />
                            Pre-configured Labels
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {activeTemplate.labels.map((label, idx) => (
                              <span
                                key={idx}
                                style={{
                                  borderColor: `${label.color}35`,
                                  backgroundColor: `${label.color}15`,
                                  color: label.color,
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium"
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: label.color }}
                                />
                                {label.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Blueprint Info */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        DUT-AI Native Binding
                      </div>
                      <div className="mt-2 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Engine:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            DUT-AI Native
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Modality:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {activeTemplate?.modality || "general"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Storage:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            MinIO S3
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
