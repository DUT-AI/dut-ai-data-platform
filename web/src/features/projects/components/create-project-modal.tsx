"use client";

import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  UploadCloud,
  ChevronRight,
  Info,
  Sparkles,
  FileUp,
  Check,
  Loader2,
  FileText,
  Trash2,
} from "lucide-react";
import { useCreateProjectMutation } from "../hooks";
import {
  ProjectType,
  createProjectSchema,
  CreateProjectFormValues,
} from "../types";
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

type TabType = "name" | "import" | "config";

export function CreateProjectModal({
  open,
  onOpenChange,
}: CreateProjectModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("name");

  // Tab 2: Data Import
  const [datasetUrl, setDatasetUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 3: Labeling Setup
  const [selectedGroup, setSelectedGroup] = useState<string>(
    templatesData.groups[0] || "Computer Vision"
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    "semantic-segmentation-with-polygons"
  );
  const [customXmlConfig, setCustomXmlConfig] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const createMutation = useCreateProjectMutation();

  // React Hook Form + Zod Setup
  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "New Project #1",
      description: "",
      project_type: "segmentation",
    },
  });

  // Map selected template to backend project_type
  const getBackendProjectType = (
    group: string,
    templateId: string
  ): ProjectType => {
    if (group === "Computer Vision") {
      if (templateId.includes("segmentation")) return "segmentation";
      if (
        templateId.includes("bounding-boxes") ||
        templateId.includes("object-detection")
      )
        return "detection";
      if (templateId.includes("classification")) return "classification";
      if (templateId.includes("ocr")) return "ocr";
      return "detection";
    }
    if (group === "Natural Language Processing") return "nlp";
    if (group === "Generative AI" || group === "Chat") return "captioning";
    return "detection";
  };

  // Sync project_type when template selection changes
  useEffect(() => {
    const pType = getBackendProjectType(selectedGroup, selectedTemplateId);
    form.setValue("project_type", pType);
  }, [selectedGroup, selectedTemplateId, form]);

  // Filter templates for current selected group
  const currentTemplates = templatesData.templates.filter(
    (t) => t.group === selectedGroup
  );

  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!datasetUrl.trim()) return;
    alert(`Đã thêm URL dữ liệu: ${datasetUrl}`);
    setDatasetUrl("");
  };

  const onSubmit = async (values: CreateProjectFormValues) => {
    setErrorMsg(null);
    try {
      await createMutation.mutateAsync({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        project_type: values.project_type,
      });

      // Reset state & close
      form.reset({
        name: "New Project",
        description: "",
        project_type: "detection",
      });
      setUploadedFiles([]);
      setActiveTab("name");
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Không thể tạo dự án. Vui lòng thử lại.";
      setErrorMsg(msg);
    }
  };

  const onInvalid = () => {
    // If name is invalid, switch back to name tab so user sees the error
    if (form.formState.errors.name) {
      setActiveTab("name");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="w-[90vw] max-w-none"
    >
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="flex h-[90vh] w-full flex-col overflow-hidden p-0"
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            className="flex h-full w-full flex-col overflow-hidden"
          >
            {/* ========================================================================= */}
            {/* MODAL HEADER: Title + Nav Pills + Action Buttons                          */}
            {/* ========================================================================= */}
            <div className="flex h-20 flex-shrink-0 items-center justify-between border-b border-slate-200 px-8 dark:border-slate-800">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Create Project
              </h1>

              {/* Nav Pills Switcher */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-1.5 dark:border-slate-700/60 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => setActiveTab("name")}
                  className={`rounded-md px-5 py-2 text-sm font-semibold transition-all ${
                    activeTab === "name"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Project Name
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("import")}
                  className={`flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold transition-all ${
                    activeTab === "import"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Data Import
                  {uploadedFiles.length > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                      {uploadedFiles.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("config")}
                  className={`rounded-md px-5 py-2 text-sm font-semibold transition-all ${
                    activeTab === "config"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Labeling Setup
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-blue-600 px-7 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>

            {/* Error notification banner */}
            {errorMsg && (
              <div className="border-b border-rose-500/20 bg-rose-500/10 px-6 py-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL BODY (SWITCH BY TAB)                                                */}
            {/* ========================================================================= */}
            <div className="flex-1 overflow-y-auto">
              {/* TAB 1: PROJECT NAME */}
              {activeTab === "name" && (
                <div className="mx-auto max-w-2xl space-y-8 px-8 py-14">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <FormLabel className="block text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Project Name <span className="text-rose-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="New Project"
                            className="h-12 border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900"
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
                      <FormItem className="space-y-2.5">
                        <FormLabel className="block text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Description
                        </FormLabel>
                        <FormControl>
                          <textarea
                            {...field}
                            value={field.value ?? ""}
                            placeholder="Optional description of your project"
                            rows={5}
                            className="focus:outline-hidden w-full rounded-md border border-slate-300 bg-white p-3.5 text-base text-slate-900 transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* TAB 2: DATA IMPORT */}
              {activeTab === "import" && (
                <div className="mx-auto max-w-5xl space-y-5 px-8 py-8">
                  {/* Top bar: URL input and upload button */}
                  <div className="flex flex-col items-center gap-3 sm:flex-row">
                    <div className="flex w-full flex-1 items-center">
                      <div className="relative flex-1">
                        <Input
                          placeholder="Dataset URL"
                          value={datasetUrl}
                          onChange={(e) => setDatasetUrl(e.target.value)}
                          className="h-12 rounded-r-none border-r-0 border-slate-300 bg-white text-base dark:border-slate-700 dark:bg-slate-900"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddUrl}
                        className="h-12 rounded-r-md border border-slate-300 bg-white px-5 text-sm font-semibold text-blue-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400"
                      >
                        Add URL
                      </button>
                    </div>

                    <span className="text-sm font-medium text-slate-400">or</span>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleFilesAdded(e.target.files)}
                      multiple
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-12 items-center gap-2.5 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-blue-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400"
                    >
                      <FileUp className="h-5 w-5" />
                      Upload Files
                    </button>
                  </div>

                  {/* Main Drag & Drop Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      handleFilesAdded(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition ${
                      isDragging
                        ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20"
                        : "border-blue-200/80 bg-blue-50/20 hover:bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/10"
                    }`}
                  >
                    {/* Large Blue Document Icon */}
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                      <UploadCloud className="h-12 w-12" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Drag & drop files here or click to browse
                    </h3>

                    {/* Formats Grid */}
                    <div className="my-7 grid max-w-2xl grid-cols-2 gap-x-12 gap-y-2 text-left text-sm">
                      <div className="flex items-baseline gap-3">
                        <span className="w-36 font-bold text-slate-800 dark:text-slate-200">
                          Images
                        </span>
                        <span className="text-slate-500">
                          bmp, gif, jpg, jpeg, png, svg, webp
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-36 font-bold text-slate-800 dark:text-slate-200">
                          Audio
                        </span>
                        <span className="text-slate-500">
                          wav, mp3, flac, m4a, ogg
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-36 font-bold text-slate-800 dark:text-slate-200">
                          Video ⓘ
                        </span>
                        <span className="text-slate-500">mp4, webm</span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-36 font-bold text-slate-800 dark:text-slate-200">
                          HTML / HyperText
                        </span>
                        <span className="text-slate-500">html, htm, xml</span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-36 font-bold text-slate-800 dark:text-slate-200">
                          Text
                        </span>
                        <span className="text-slate-500">txt</span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-36 font-bold text-slate-800 dark:text-slate-200">
                          Structured data
                        </span>
                        <span className="text-slate-500">csv, tsv, json</span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="w-36 font-bold text-slate-800 dark:text-slate-200">
                          PDF
                        </span>
                        <span className="text-slate-500">pdf</span>
                      </div>
                    </div>

                    {/* Important Notes */}
                    <div className="w-full max-w-2xl border-t border-slate-200/80 pt-5 text-left text-sm text-slate-500 dark:border-slate-800">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        Important:
                      </p>
                      <ul className="list-disc space-y-1 pl-5 pt-1.5">
                        <li>
                          We recommend Cloud Storage over direct uploads due to
                          upload limitations.
                        </li>
                        <li>
                          For PDFs, use multi-image labeling. JSONL or Parquet
                          (Enterprise only) files require cloud storage.
                        </li>
                        <li>
                          Check the documentation to import preannotated data.
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Uploaded Files list */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Selected Files ({uploadedFiles.length}):
                      </h4>
                      <div className="max-h-44 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                        {uploadedFiles.map((file, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2.5 text-sm"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <FileText className="h-5 w-5 flex-shrink-0 text-blue-500" />
                              <span className="truncate text-slate-800 dark:text-slate-200">
                                {file.name}
                              </span>
                              <span className="text-xs text-slate-400">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(i);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: LABELING SETUP */}
              {activeTab === "config" && (
                <div className="flex h-full min-h-[500px]">
                  {/* Left Category Sidebar */}
                  <aside className="flex w-72 flex-shrink-0 flex-col justify-between border-r border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/20">
                    <ul className="space-y-1">
                      {templatesData.groups.map((group) => {
                        const isActive =
                          selectedGroup === group && !isCustomMode;
                        return (
                          <li key={group}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGroup(group);
                                setIsCustomMode(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-md px-4 py-2.5 text-left text-sm font-medium transition ${
                                isActive
                                  ? "shadow-xs bg-blue-600 font-semibold text-white"
                                  : "text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <span>{group}</span>
                              <ChevronRight
                                className={`h-4 w-4 ${
                                  isActive ? "text-white" : "text-slate-400"
                                }`}
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Custom Template button */}
                    <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsCustomMode(true)}
                        className={`w-full rounded-md px-4 py-2.5 text-left text-sm font-semibold transition ${
                          isCustomMode
                            ? "bg-blue-600 text-white"
                            : "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        }`}
                      >
                        Custom template
                      </button>
                    </div>
                  </aside>

                  {/* Right Templates Grid */}
                  <main className="flex flex-1 flex-col justify-between overflow-y-auto p-7">
                    {!isCustomMode ? (
                      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {currentTemplates.map((tpl) => {
                          const isSelected = selectedTemplateId === tpl.id;
                          const isEnterprise = tpl.type === "enterprise";

                          return (
                            <div
                              key={tpl.id}
                              onClick={() => setSelectedTemplateId(tpl.id)}
                              className={`shadow-xs group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition hover:shadow-md dark:bg-slate-900 ${
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
                                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">
                                    No Preview
                                  </div>
                                )}
                              </div>

                              {/* Card Content */}
                              <div className="flex flex-1 flex-col items-center justify-center p-3.5 text-center">
                                <h3 className="line-clamp-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                                  {tpl.title}
                                </h3>
                                {isEnterprise && (
                                  <span className="mt-2 inline-flex items-center gap-1 rounded-sm bg-orange-500/10 px-2 py-0.5 text-xs font-semibold text-orange-600">
                                    <Sparkles className="h-3 w-3" />
                                    Enterprise
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Custom XML Editor */
                      <div className="space-y-5">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            Custom Label Studio XML Config
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Write or paste your custom XML labeling configuration
                            below:
                          </p>
                        </div>
                        <textarea
                          value={customXmlConfig}
                          onChange={(e) => setCustomXmlConfig(e.target.value)}
                          placeholder={`<View>\n  <Image name="image" value="$image"/>\n  <RectangleLabels name="label" toName="image">\n    <Label value="Car" background="red"/>\n    <Label value="Airplane" background="blue"/>\n  </RectangleLabels>\n</View>`}
                          rows={14}
                          className="focus:outline-hidden w-full rounded-md border border-slate-300 bg-slate-900 p-5 font-mono text-sm text-slate-100 focus:border-blue-500"
                        />
                      </div>
                    )}

                    {/* Footer Docs Link */}
                    <footer className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-sm text-slate-500 dark:border-slate-800">
                      <Info className="h-5 w-5 text-slate-400" />
                      <span>
                        See the documentation to{" "}
                        <a
                          href="https://labelstud.io/guide"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline hover:no-underline dark:text-blue-400"
                        >
                          contribute a template
                        </a>
                        .
                      </span>
                    </footer>
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
