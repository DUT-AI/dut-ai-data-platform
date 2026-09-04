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
    // 1. Determine task key by group & template id
    let taskKey = "cv.object_detection";
    if (selectedGroup === "Computer Vision") {
      if (
        selectedTemplateId.includes("segmentation") ||
        selectedTemplateId.includes("polygon")
      ) {
        taskKey = "cv.semantic_segmentation";
      } else if (selectedTemplateId.includes("classification")) {
        taskKey = "cv.image_classification";
      } else if (
        selectedTemplateId.includes("ocr") ||
        selectedTemplateId.includes("text-extraction")
      ) {
        taskKey = "cv.ocr";
      } else {
        taskKey = "cv.object_detection";
      }
    } else if (
      selectedGroup === "Natural Language Processing" ||
      selectedGroup === "Generative AI" ||
      selectedGroup === "Conversational AI"
    ) {
      if (
        selectedTemplateId.includes("entity") ||
        selectedTemplateId.includes("ner") ||
        selectedTemplateId.includes("span")
      ) {
        taskKey = "nlp.named_entity_recognition";
      } else {
        taskKey = "nlp.text_classification";
      }
    } else {
      taskKey = "cv.object_detection";
    }

    // Find in backend tasks list
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

  // Filter templates for current selected group
  const currentTemplates = useMemo(() => {
    return templatesData.templates.filter((t) => t.group === selectedGroup);
  }, [selectedGroup]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="flex h-[88vh] max-h-[850px] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden p-0"
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
                  Project Info
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
                  Labeling Setup
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
                  className="bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Project"
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
                          label: "Label Studio (Default)",
                        },
                        { key: "cvat", label: "CVAT (Computer Vision)" },
                        { key: "doccano", label: "Doccano (NLP)" },
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

              {/* TAB 2: LABELING SETUP */}
              {activeTab === "config" && (
                <div className="flex h-full min-h-[500px]">
                  {/* Left Sidebar: Groups */}
                  <aside className="w-64 shrink-0 border-r border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                    <h4 className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Task Categories
                    </h4>
                    <ul className="space-y-1">
                      {templatesData.groups.map((group) => {
                        const isActive = selectedGroup === group;
                        return (
                          <li key={group}>
                            <button
                              type="button"
                              onClick={() => setSelectedGroup(group)}
                              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-medium transition ${
                                isActive
                                  ? "shadow-xs bg-blue-600 font-semibold text-white"
                                  : "text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <span className="truncate">{group}</span>
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

                  {/* Right: Templates Grid */}
                  <main className="flex flex-1 flex-col overflow-y-auto p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                          {selectedGroup}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Chọn cấu hình gán nhãn mẫu phù hợp với dữ liệu của
                          bạn.
                        </p>
                      </div>
                      {matchedTaskInfo.task && (
                        <span className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                          Backend Task: {matchedTaskInfo.task.name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                      {currentTemplates.map((tpl) => {
                        const isSelected = selectedTemplateId === tpl.id;
                        const isEnterprise = tpl.type === "enterprise";

                        return (
                          <div
                            key={tpl.id}
                            onClick={() => setSelectedTemplateId(tpl.id)}
                            className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition hover:shadow-md dark:bg-slate-900 ${
                              isSelected
                                ? "border-blue-600 ring-2 ring-blue-500/20"
                                : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                            }`}
                          >
                            {/* Selected Checkmark Badge */}
                            {isSelected && (
                              <div className="shadow-xs absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                                <Check className="h-3.5 w-3.5" />
                              </div>
                            )}

                            {/* Image preview */}
                            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
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
                                  No Preview
                                </div>
                              )}
                            </div>

                            {/* Card Content */}
                            <div className="flex flex-1 flex-col items-center justify-center p-3 text-center">
                              <h3 className="line-clamp-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                                {tpl.title}
                              </h3>
                              {isEnterprise && (
                                <span className="mt-1.5 inline-flex items-center gap-1 rounded-sm bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  Enterprise
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </main>
                </div>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
