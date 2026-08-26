"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  UploadCloud,
  ChevronRight,
  Info,
  Sparkles,
  Link2,
  FileUp,
  X,
  Check,
  Loader2,
  FileText,
  Trash2,
} from "lucide-react";
import { useCreateProjectMutation } from "../hooks/use-projects";
import { ProjectType } from "../types/project";
import { Dialog, DialogContent, Button, Input } from "@/components/ui";
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

  // Tab 1: Project Name
  const [projectName, setProjectName] = useState("New Project #1");
  const [description, setDescription] = useState("");
  const [workspace, setWorkspace] = useState("");

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

  // Map selected template to backend project_type
  const getBackendProjectType = (): ProjectType => {
    if (selectedGroup === "Computer Vision") {
      if (selectedTemplateId.includes("segmentation")) return "segmentation";
      if (selectedTemplateId.includes("bounding-boxes") || selectedTemplateId.includes("object-detection"))
        return "detection";
      if (selectedTemplateId.includes("classification")) return "classification";
      if (selectedTemplateId.includes("ocr")) return "ocr";
      return "detection";
    }
    if (selectedGroup === "Natural Language Processing") return "nlp";
    if (selectedGroup === "Generative AI" || selectedGroup === "Chat") return "captioning";
    return "detection";
  };

  const handleSave = async () => {
    if (!projectName.trim()) {
      setActiveTab("name");
      setErrorMsg("Vui lòng nhập tên dự án.");
      return;
    }

    setErrorMsg(null);
    try {
      await createMutation.mutateAsync({
        name: projectName.trim(),
        description: description.trim() || undefined,
        project_type: getBackendProjectType(),
      });

      // Reset state & close
      setProjectName("New Project");
      setDescription("");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-none w-[90vw]">
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="flex h-[90vh] w-full flex-col overflow-hidden p-0"
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
              type="button"
              onClick={handleSave}
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
            <div className="mx-auto max-w-2xl py-14 px-8 space-y-8">
              <div className="space-y-2.5">
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="New Project"
                  className="h-12 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                  required
                />
              </div>

              <div className="space-y-2.5">
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description of your project"
                  rows={5}
                  className="w-full rounded-md border border-slate-300 bg-white p-3.5 text-base text-slate-900 transition focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Workspace
                  </label>
                  <span className="inline-flex items-center gap-1 rounded-sm bg-gradient-to-r from-orange-500/10 to-pink-500/10 px-2 py-0.5 text-xs font-semibold text-orange-600 border border-orange-200/50">
                    <Sparkles className="h-3 w-3" />
                    Enterprise
                  </span>
                </div>
                <select
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                  className="h-12 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-base text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400"
                >
                  <option value="">Select an option</option>
                  <option value="default">DUT AI Core Workspace</option>
                  <option value="research">DUT Computer Vision Lab</option>
                </select>
                <p className="pt-1 text-sm text-slate-500 dark:text-slate-400">
                  Simplify project management by organizing projects into workspaces.{" "}
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-blue-600 underline hover:no-underline dark:text-blue-400"
                  >
                    Learn more
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: DATA IMPORT */}
          {activeTab === "import" && (
            <div className="mx-auto max-w-5xl py-8 px-8 space-y-5">
              {/* Top bar: URL input and upload button */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <form onSubmit={handleAddUrl} className="flex flex-1 items-center w-full">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Dataset URL"
                      value={datasetUrl}
                      onChange={(e) => setDatasetUrl(e.target.value)}
                      className="h-12 rounded-r-none border-r-0 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-base"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-12 rounded-r-md border border-slate-300 bg-white px-5 text-sm font-semibold text-blue-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400"
                  >
                    Add URL
                  </button>
                </form>

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
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition cursor-pointer ${
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
                    <span className="w-36 font-bold text-slate-800 dark:text-slate-200">Images</span>
                    <span className="text-slate-500">bmp, gif, jpg, jpeg, png, svg, webp</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="w-36 font-bold text-slate-800 dark:text-slate-200">Audio</span>
                    <span className="text-slate-500">wav, mp3, flac, m4a, ogg</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="w-36 font-bold text-slate-800 dark:text-slate-200">Video ⓘ</span>
                    <span className="text-slate-500">mp4, webm</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="w-36 font-bold text-slate-800 dark:text-slate-200">HTML / HyperText</span>
                    <span className="text-slate-500">html, htm, xml</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="w-36 font-bold text-slate-800 dark:text-slate-200">Text</span>
                    <span className="text-slate-500">txt</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="w-36 font-bold text-slate-800 dark:text-slate-200">Structured data</span>
                    <span className="text-slate-500">csv, tsv, json</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="w-36 font-bold text-slate-800 dark:text-slate-200">PDF</span>
                    <span className="text-slate-500">pdf</span>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="w-full max-w-2xl text-left text-sm text-slate-500 border-t border-slate-200/80 pt-5 dark:border-slate-800">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Important:</p>
                  <ul className="list-disc pl-5 space-y-1 pt-1.5">
                    <li>We recommend Cloud Storage over direct uploads due to upload limitations.</li>
                    <li>For PDFs, use multi-image labeling. JSONL or Parquet (Enterprise only) files require cloud storage.</li>
                    <li>Check the documentation to import preannotated data.</li>
                  </ul>
                </div>
              </div>

              {/* Uploaded Files list */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Selected Files ({uploadedFiles.length}):
                  </h4>
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                    {uploadedFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2.5 px-3 text-sm"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
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
              <aside className="w-72 flex-shrink-0 border-r border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col justify-between">
                <ul className="space-y-1">
                  {templatesData.groups.map((group) => {
                    const isActive = selectedGroup === group && !isCustomMode;
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
                              ? "bg-blue-600 text-white font-semibold shadow-xs"
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
              <main className="flex-1 overflow-y-auto p-7 flex flex-col justify-between">
                {!isCustomMode ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {currentTemplates.map((tpl) => {
                      const isSelected = selectedTemplateId === tpl.id;
                      const isEnterprise = tpl.type === "enterprise";

                      return (
                        <div
                          key={tpl.id}
                          onClick={() => setSelectedTemplateId(tpl.id)}
                          className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-xs transition hover:shadow-md cursor-pointer dark:bg-slate-900 ${
                            isSelected
                              ? "border-blue-600 ring-2 ring-blue-500/20"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                          }`}
                        >
                          {/* Selected Checkmark Badge */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          )}

                          {/* Image preview */}
                          <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            {tpl.image ? (
                              <img
                                src={tpl.image}
                                alt={tpl.title}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
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
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
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
                      <p className="text-sm text-slate-500 mt-1">
                        Write or paste your custom XML labeling configuration below:
                      </p>
                    </div>
                    <textarea
                      value={customXmlConfig}
                      onChange={(e) => setCustomXmlConfig(e.target.value)}
                      placeholder={`<View>\n  <Image name="image" value="$image"/>\n  <RectangleLabels name="label" toName="image">\n    <Label value="Car" background="red"/>\n    <Label value="Airplane" background="blue"/>\n  </RectangleLabels>\n</View>`}
                      rows={14}
                      className="font-mono text-sm w-full rounded-md border border-slate-300 bg-slate-900 text-slate-100 p-5 focus:border-blue-500 focus:outline-hidden"
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
      </DialogContent>
    </Dialog>
  );
}
