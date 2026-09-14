"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Code2,
} from "lucide-react";
import { useCreateProjectMutation, useTaskDefinitionsQuery } from "../hooks";
import { createProjectSchema, CreateProjectFormValues } from "../types";
import {
  Dialog,
  DialogContent,
  Button,
  Input,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui";
import templatesData from "../data/templates.json";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabType = "name" | "config";

// Category Icons Mapping
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

export function CreateProjectModal({
  open,
  onOpenChange,
}: CreateProjectModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("name");

  // Catalog data from backend
  const { data: tasks = [], isLoading: isTasksLoading } =
    useTaskDefinitionsQuery();

  // Template selection state
  const [selectedGroup, setSelectedGroup] = useState<string>(
    templatesData.groups[0] || "Computer Vision"
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    "semantic-segmentation-with-polygons"
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedProvider, setSelectedProvider] =
    useState<string>("label_studio");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useCreateProjectMutation();

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "New Project #1",
      description: "",
      task_definition_version_id: "",
      project_template_version_id: "",
      annotation_provider_key: "label_studio",
      storage_provider_key: "minio",
    },
  });

  // Map template selection to backend TaskDefinition / Template Version
  const matchedTaskInfo = useMemo(() => {
    let taskKey = "cv.object_detection";
    const tId = selectedTemplateId.toLowerCase();

    if (selectedGroup === "Computer Vision") {
      if (
        tId.includes("segmentation") ||
        tId.includes("polygon") ||
        tId.includes("mask")
      ) {
        taskKey = "cv.semantic_segmentation";
      } else if (tId.includes("classification")) {
        taskKey = "cv.image_classification";
      } else if (tId.includes("ocr") || tId.includes("text-extraction")) {
        taskKey = "cv.ocr";
      } else {
        taskKey = "cv.object_detection";
      }
    } else if (
      selectedGroup === "Natural Language Processing" ||
      selectedGroup === "Generative AI" ||
      selectedGroup === "Conversational AI" ||
      selectedGroup === "Chat"
    ) {
      if (
        tId.includes("entity") ||
        tId.includes("ner") ||
        tId.includes("span") ||
        tId.includes("tagging")
      ) {
        taskKey = "nlp.named_entity_recognition";
      } else {
        taskKey = "nlp.text_classification";
      }
    } else if (selectedGroup === "Audio/Speech Processing") {
      taskKey = "audio.speech_transcription";
    } else if (selectedGroup === "Structured Data Parsing") {
      taskKey = "tabular.data_labeling";
    } else {
      taskKey = "cv.object_detection";
    }

    // Find in backend tasks list (or fallback to first available task)
    const foundTask = tasks.find((t) => t.key === taskKey) || tasks[0];
    const taskVersion = foundTask?.versions?.[0];
    const template = foundTask?.templates?.[0];
    const templateVersion = template?.versions?.[0];

    return {
      taskKey,
      task: foundTask,
      taskVersionId: taskVersion?.id || "",
      templateVersionId: templateVersion?.id || "",
      availableProviders: templateVersion?.providers || [
        "label_studio",
        "cvat",
      ],
    };
  }, [selectedGroup, selectedTemplateId, tasks]);

  // Sync mapped values to form
  useEffect(() => {
    if (matchedTaskInfo.taskVersionId) {
      form.setValue(
        "task_definition_version_id",
        matchedTaskInfo.taskVersionId
      );
      if (matchedTaskInfo.templateVersionId) {
        form.setValue(
          "project_template_version_id",
          matchedTaskInfo.templateVersionId
        );
      }
      form.setValue("annotation_provider_key", selectedProvider);
      form.setValue("storage_provider_key", "minio");
    }
  }, [matchedTaskInfo, selectedProvider, form]);

  // Filter templates for current selected group & search query
  const currentTemplates = useMemo(() => {
    let list = templatesData.templates.filter((t) => t.group === selectedGroup);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedGroup, searchQuery]);

  // Selected template object
  const activeTemplate = useMemo(() => {
    return (
      templatesData.templates.find((t) => t.id === selectedTemplateId) ||
      currentTemplates[0] ||
      null
    );
  }, [selectedTemplateId, currentTemplates]);

  const onSubmit = async (values: CreateProjectFormValues) => {
    setErrorMsg(null);
    try {
      const payload: CreateProjectFormValues = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        task_definition_version_id:
          values.task_definition_version_id || matchedTaskInfo.taskVersionId,
        project_template_version_id:
          values.project_template_version_id ||
          matchedTaskInfo.templateVersionId ||
          undefined,
        annotation_provider_key: selectedProvider || "label_studio",
        storage_provider_key: "minio",
      };

      if (!payload.task_definition_version_id) {
        setErrorMsg(
          "Vui lòng đợi danh mục bài toán tải xong hoặc chọn lại bài toán."
        );
        return;
      }

      await createMutation.mutateAsync(payload);
      form.reset();
      onOpenChange(false);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi trong quá trình tạo dự án."
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="w-[96vw] max-w-7xl"
    >
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="flex h-[90vh] max-h-[900px] w-full flex-col gap-0 overflow-hidden p-0"
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col justify-between"
          >
            {/* Header with Step Tabs & Action Buttons */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-7 py-3.5 dark:border-slate-800 dark:bg-slate-900/80">
              {/* Tab navigation */}
              <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("name")}
                  className={`flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold transition-all ${
                    activeTab === "name"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  1. Project Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("config")}
                  className={`flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold transition-all ${
                    activeTab === "config"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  2. Labeling Setup (Templates)
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || isTasksLoading}
                  className="bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Creating Project...
                    </>
                  ) : (
                    "Save & Create Project"
                  )}
                </Button>
              </div>
            </div>

            {/* Error notification banner */}
            {errorMsg && (
              <div className="border-b border-rose-500/20 bg-rose-500/10 px-6 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            {/* MODAL BODY */}
            <div className="flex-1 overflow-y-auto">
              {/* TAB 1: PROJECT INFO */}
              {activeTab === "name" && (
                <div className="mx-auto max-w-2xl space-y-7 px-8 py-10">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="block text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Project Name <span className="text-rose-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Traffic Object Detection"
                            className="h-11 border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900"
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
                      <FormItem className="space-y-2">
                        <FormLabel className="block text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Description
                        </FormLabel>
                        <FormControl>
                          <textarea
                            {...field}
                            value={field.value ?? ""}
                            placeholder="Optional description of the project goals, labels, or instructions..."
                            rows={4}
                            className="focus:outline-hidden w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2 pt-2">
                    <label className="block text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Annotation Engine Provider
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        {
                          key: "label_studio",
                          label: "Label Studio (Default Engine)",
                        },
                        { key: "cvat", label: "CVAT (Computer Vision)" },
                        { key: "doccano", label: "Doccano (Text & Spans)" },
                      ].map((p) => {
                        const isSelected = selectedProvider === p.key;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setSelectedProvider(p.key)}
                            className={`rounded-lg border px-4 py-2.5 text-xs font-semibold transition ${
                              isSelected
                                ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 dark:bg-blue-950/40 dark:text-blue-300"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      onClick={() => setActiveTab("config")}
                      className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                    >
                      Next: Choose Labeling Template
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 2: LABELING SETUP (3-COLUMN LABEL STUDIO LAYOUT) */}
              {activeTab === "config" && (
                <div className="flex h-full min-h-[560px]">
                  {/* Left Column: Task Categories */}
                  <aside className="w-64 shrink-0 border-r border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <h4 className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Task Categories
                    </h4>
                    <ul className="space-y-1">
                      {templatesData.groups.map((group) => {
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
                                  : "text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800/60"
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

                  {/* Middle Column: Templates Grid */}
                  <main className="flex flex-1 flex-col overflow-y-auto border-r border-slate-200 p-6 dark:border-slate-800">
                    {/* Filter & Header */}
                    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                          {selectedGroup}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Chọn cấu hình gán nhãn mẫu phù hợp với dữ liệu bài
                          toán của bạn.
                        </p>
                      </div>

                      {/* Search templates input */}
                      <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Tìm mẫu gán nhãn..."
                          className="h-8 border-slate-200 bg-white pl-8 text-xs dark:border-slate-800 dark:bg-slate-900"
                        />
                      </div>
                    </div>

                    {/* Grid of Templates */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                      {currentTemplates.map((tpl) => {
                        const isSelected = selectedTemplateId === tpl.id;
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
                            {/* Selected Checkmark Badge */}
                            {isSelected && (
                              <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </div>
                            )}

                            {/* Image preview */}
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
                                  Template Preview
                                </div>
                              )}
                            </div>

                            {/* Card Content */}
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
                  </main>

                  {/* Right Column: Template Detail & Schema Preview */}
                  <aside className="w-80 shrink-0 overflow-y-auto bg-slate-50/50 p-5 dark:bg-slate-950/30">
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="rounded bg-blue-600/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            {selectedGroup}
                          </span>
                          {matchedTaskInfo.task && (
                            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {matchedTaskInfo.task.key}
                            </span>
                          )}
                        </div>
                        <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                          {activeTemplate?.title || "Chưa chọn mẫu"}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          Tự động sinh cấu hình Ontology Input/Output tương ứng
                          cho dự án mới.
                        </p>
                      </div>

                      {/* Backend Task Definition Info */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Backend Task Binding
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Task Name:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {matchedTaskInfo.task?.name || "Auto Detected"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Modality:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {matchedTaskInfo.task?.modality || "multi-modal"}
                          </span>
                        </div>
                      </div>

                      {/* XML/JSON Schema Config Preview */}
                      {activeTemplate?.config && (
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Code2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>Label Studio Config (XML/Schema):</span>
                          </div>
                          <pre className="max-h-64 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-2.5 font-mono text-[10px] leading-tight text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                            {activeTemplate.config.trim()}
                          </pre>
                        </div>
                      )}
                    </div>
                  </aside>
                </div>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
