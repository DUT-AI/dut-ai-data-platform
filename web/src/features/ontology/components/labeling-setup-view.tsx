"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { useUpdateOntologyVersionMutation } from "../hooks";

// Color presets for visual labels
const PRESET_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Yellow
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#64748B", // Slate
];

interface Template {
  id: string;
  title: string;
  description: string;
  icon: string;
  xml: string;
}

interface CategoryTemplates {
  category: string;
  templates: Template[];
}

const TEMPLATE_CATEGORIES: CategoryTemplates[] = [
  {
    category: "Computer Vision",
    templates: [
      {
        id: "cv_bbox",
        title: "Object Detection with Bounding Boxes",
        description:
          "Label objects in images using rectangular bounding boxes.",
        icon: "🖼️",
        xml: "",
      },
      {
        id: "cv_polygon",
        title: "Semantic Segmentation with Polygons",
        description: "Label precise boundaries of objects using polygons.",
        icon: "🎯",
        xml: "",
      },
      {
        id: "cv_classification",
        title: "Image Classification",
        description: "Classify an entire image into one or more categories.",
        icon: "🏷️",
        xml: "",
      },
      {
        id: "cv_ocr",
        title: "Optical Character Recognition (OCR)",
        description:
          "Transcribe text blocks and associate them with bounding boxes.",
        icon: "📝",
        xml: "",
      },
    ],
  },
  {
    category: "Natural Language Processing",
    templates: [
      {
        id: "nlp_ner",
        title: "Named Entity Recognition (NER)",
        description:
          "Extract named entities (People, Orgs, Locations) from text.",
        icon: "🔤",
        xml: "",
      },
      {
        id: "nlp_sentiment",
        title: "Text Classification (Sentiment Analysis)",
        description: "Determine the sentiment or category of a text snippet.",
        icon: "😊",
        xml: "",
      },
    ],
  },
  {
    category: "Audio/Speech Processing",
    templates: [
      {
        id: "audio_transcribe",
        title: "Audio Transcription",
        description: "Listen to audio files and transcribe speech to text.",
        icon: "🎧",
        xml: "",
      },
    ],
  },
];

const DEFAULT_LABELS_FOR_TEMPLATES: Record<
  string,
  { value: string; color: string }[]
> = {
  cv_bbox: [
    { value: "Person", color: "#EF4444" },
    { value: "Car", color: "#3B82F6" },
    { value: "Airplane", color: "#10B981" },
  ],
  cv_polygon: [
    { value: "Sky", color: "#3B82F6" },
    { value: "Road", color: "#10B981" },
    { value: "Building", color: "#F59E0B" },
  ],
  cv_classification: [
    { value: "Cat", color: "#8B5CF6" },
    { value: "Dog", color: "#EC4899" },
    { value: "Bird", color: "#06B6D4" },
  ],
  cv_ocr: [
    { value: "Heading", color: "#F59E0B" },
    { value: "Paragraph", color: "#3B82F6" },
  ],
  nlp_ner: [
    { value: "Person", color: "#EC4899" },
    { value: "Organization", color: "#F97316" },
    { value: "Location", color: "#10B981" },
  ],
  nlp_sentiment: [
    { value: "Positive", color: "#10B981" },
    { value: "Neutral", color: "#64748B" },
    { value: "Negative", color: "#EF4444" },
  ],
  audio_transcribe: [],
};

function generateXmlFromTemplate(
  templateId: string,
  labels: { value: string; color: string }[]
): string {
  switch (templateId) {
    case "cv_bbox":
      return `<View>
  <Image name="image" value="$image"/>
  <RectangleLabels name="label" toName="image">
${labels.map((l) => `    <Label value="${l.value}" background="${l.color}"/>`).join("\n")}
  </RectangleLabels>
</View>`;

    case "cv_polygon":
      return `<View>
  <Image name="image" value="$image"/>
  <PolygonLabels name="label" toName="image">
${labels.map((l) => `    <Label value="${l.value}" background="${l.color}"/>`).join("\n")}
  </PolygonLabels>
</View>`;

    case "cv_classification":
      return `<View>
  <Image name="image" value="$image"/>
  <Choices name="choice" toName="image" choice="single">
${labels.map((l) => `    <Choice value="${l.value}"/>`).join("\n")}
  </Choices>
</View>`;

    case "cv_ocr":
      return `<View>
  <Image name="image" value="$image"/>
  <Labels name="label" toName="image">
${labels.map((l) => `    <Label value="${l.value}" background="${l.color}"/>`).join("\n")}
  </Labels>
  <Rectangle name="bbox" toName="image"/>
  <TextArea name="transcription" toName="image" editable="true" perRegion="true" required="true"/>
</View>`;

    case "nlp_ner":
      return `<View>
  <Text name="text" value="$text"/>
  <Labels name="label" toName="text">
${labels.map((l) => `    <Label value="${l.value}" background="${l.color}"/>`).join("\n")}
  </Labels>
</View>`;

    case "nlp_sentiment":
      return `<View>
  <Text name="text" value="$text"/>
  <Choices name="sentiment" toName="text" choice="single">
${labels.map((l) => `    <Choice value="${l.value}" background="${l.color}"/>`).join("\n")}
  </Choices>
</View>`;

    case "audio_transcribe":
      return `<View>
  <Audio name="audio" value="$audio"/>
  <TextArea name="transcription" toName="audio" rows="4" placeholder="Nhập văn bản giải âm..."/>
</View>`;

    default:
      return "";
  }
}

function parseLabelsFromXml(xml: string): { value: string; color: string }[] {
  const labels: { value: string; color: string }[] = [];
  const labelRegex = /<Label\s+value="([^"]+)"(?:\s+background="([^"]+)")?/g;
  let match;
  while ((match = labelRegex.exec(xml)) !== null) {
    labels.push({
      value: match[1],
      color: match[2] || "#3B82F6",
    });
  }
  if (labels.length === 0) {
    const choiceRegex = /<Choice\s+value="([^"]+)"/g;
    while ((match = choiceRegex.exec(xml)) !== null) {
      labels.push({
        value: match[1],
        color: "#3B82F6",
      });
    }
  }
  return labels;
}

interface LabelingSetupViewProps {
  versionId: string;
  initialXml?: string | null;
  isEditable: boolean;
}

export function LabelingSetupView({
  versionId,
  initialXml,
  isEditable,
}: LabelingSetupViewProps) {
  const [activeCategory, setActiveCategory] =
    useState<string>("Computer Vision");
  const [customXml, setCustomXml] = useState<string>(initialXml || "");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [labels, setLabels] = useState<{ value: string; color: string }[]>([]);
  const [activeColorPickerIdx, setActiveColorPickerIdx] = useState<
    number | null
  >(null);

  const updateMutation = useUpdateOntologyVersionMutation(versionId);

  // Sync templates and initialXml during render (Avoids useEffect cascading render error)
  const [prevInitialXml, setPrevInitialXml] = useState(initialXml);
  if (initialXml !== prevInitialXml) {
    setPrevInitialXml(initialXml);
    setCustomXml(initialXml || "");
    if (initialXml) {
      if (initialXml.includes("RectangleLabels")) {
        const tpl = TEMPLATE_CATEGORIES[0].templates.find(
          (t) => t.id === "cv_bbox"
        );
        if (tpl) {
          setSelectedTemplate(tpl);
          setLabels(parseLabelsFromXml(initialXml));
        }
      } else if (initialXml.includes("PolygonLabels")) {
        const tpl = TEMPLATE_CATEGORIES[0].templates.find(
          (t) => t.id === "cv_polygon"
        );
        if (tpl) {
          setSelectedTemplate(tpl);
          setLabels(parseLabelsFromXml(initialXml));
        }
      }
    }
  }

  // Derive XML config dynamically on render
  const currentXml =
    activeCategory === "Custom XML Template"
      ? customXml
      : selectedTemplate
        ? generateXmlFromTemplate(selectedTemplate.id, labels)
        : "";

  const categoriesList = [
    ...TEMPLATE_CATEGORIES.map((c) => c.category),
    "Custom XML Template",
  ];

  const currentCategoryData = TEMPLATE_CATEGORIES.find(
    (c) => c.category === activeCategory
  );

  const handleSave = () => {
    if (!isEditable) {
      alert("Phiên bản này đã xuất bản (Published) và không thể chỉnh sửa.");
      return;
    }
    updateMutation.mutate(
      { raw_label_config: currentXml },
      {
        onSuccess: () => {
          alert("Lưu cấu hình Labeling Setup thành công!");
        },
        onError: () => {
          alert("Không thể lưu cấu hình.");
        },
      }
    );
  };

  const handleSelectTemplate = (tpl: Template) => {
    setSelectedTemplate(tpl);
    const defaultLabels = DEFAULT_LABELS_FOR_TEMPLATES[tpl.id] || [];
    setLabels([...defaultLabels]);
  };

  // Label List Handlers
  const handleAddLabel = () => {
    const defaultColor = PRESET_COLORS[labels.length % PRESET_COLORS.length];
    setLabels([
      ...labels,
      { value: `New Label ${labels.length + 1}`, color: defaultColor },
    ]);
  };

  const handleRemoveLabel = (idx: number) => {
    const updated = [...labels];
    updated.splice(idx, 1);
    setLabels(updated);
  };

  const handleLabelTextChange = (idx: number, text: string) => {
    const updated = [...labels];
    updated[idx].value = text;
    setLabels(updated);
  };

  const handleLabelColorChange = (idx: number, color: string) => {
    const updated = [...labels];
    updated[idx].color = color;
    setLabels(updated);
    setActiveColorPickerIdx(null);
  };

  return (
    <div className="flex flex-col space-y-4 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Labeling Setup (Cấu hình bộ nhãn Label Studio)
          </h3>
          <p className="text-xs text-slate-500">
            Chọn mẫu cấu hình dựng sẵn, chỉnh sửa nhãn trực quan hoặc dán cấu
            hình XML của riêng bạn.
          </p>
        </div>
        <Button
          onClick={handleSave}
          isLoading={updateMutation.isPending}
          disabled={!isEditable}
          className="text-xs"
        >
          💾 Lưu cấu hình
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-12">
        {/* Left Category Sidebar */}
        <div className="space-y-1 md:col-span-3">
          {categoriesList.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSelectedTemplate(null);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
              }`}
            >
              {cat === "Custom XML Template" ? "📝 " : "⚙️ "}
              {cat}
            </button>
          ))}
        </div>

        {/* Right Content Panel */}
        <div className="space-y-6 md:col-span-9">
          {activeCategory === "Custom XML Template" ? (
            <div className="space-y-4">
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                  Nhập cấu hình XML tùy chỉnh
                </span>
                <span className="text-[11px] text-slate-500">
                  Bạn có thể copy trực tiếp mã XML từ giao diện của Label Studio
                  và dán vào đây.
                </span>
              </div>
              <textarea
                value={customXml}
                onChange={(e) => setCustomXml(e.target.value)}
                disabled={!isEditable}
                placeholder="<View>...</View>"
                rows={16}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>
          ) : currentCategoryData ? (
            <div className="space-y-6">
              {/* Template Cards Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {currentCategoryData.templates.map((tpl) => (
                  <Card
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`flex cursor-pointer flex-col justify-between overflow-hidden border p-4 transition-all hover:shadow-md ${
                      selectedTemplate?.id === tpl.id
                        ? "border-blue-500 bg-blue-50/20 dark:border-blue-400 dark:bg-blue-950/20"
                        : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl dark:bg-blue-950/60">
                        {tpl.icon}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {tpl.title}
                      </h4>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        {tpl.description}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Visual Labels Editor (Only show if a template is selected and it supports labels/choices) */}
              {selectedTemplate &&
                selectedTemplate.id !== "audio_transcribe" && (
                  <div className="dark:border-slate-850 space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Chỉnh sửa danh sách nhãn (Labels Editor)
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Đổi tên nhãn hoặc thêm/xóa các nhãn gán bên dưới.
                        </p>
                      </div>
                      {isEditable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAddLabel}
                          className="h-8 border-slate-200 text-[11px]"
                        >
                          ➕ Thêm nhãn mới
                        </Button>
                      )}
                    </div>

                    {/* List of active labels */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {labels.map((lbl, idx) => (
                        <div
                          key={idx}
                          className="relative flex items-center space-x-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950"
                        >
                          {/* Color dot button */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                isEditable &&
                                setActiveColorPickerIdx(
                                  activeColorPickerIdx === idx ? null : idx
                                )
                              }
                              disabled={!isEditable}
                              style={{ backgroundColor: lbl.color }}
                              className="h-5 w-5 cursor-pointer rounded-full border border-slate-300 shadow-sm"
                              title="Chọn màu"
                            />

                            {/* Quick color picker popup */}
                            {activeColorPickerIdx === idx && (
                              <div className="absolute left-0 top-6 z-50 grid w-24 grid-cols-3 gap-1 rounded border border-slate-200 bg-white p-1.5 shadow-md dark:border-slate-700 dark:bg-slate-900">
                                {PRESET_COLORS.map((color) => (
                                  <button
                                    key={color}
                                    onClick={() =>
                                      handleLabelColorChange(idx, color)
                                    }
                                    style={{ backgroundColor: color }}
                                    className="border-slate-350 h-5 w-5 rounded border transition-transform hover:scale-110"
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Input Field */}
                          <input
                            type="text"
                            value={lbl.value}
                            onChange={(e) =>
                              handleLabelTextChange(idx, e.target.value)
                            }
                            disabled={!isEditable}
                            className="dark:text-slate-250 flex-1 bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
                            placeholder="Tên nhãn..."
                          />

                          {/* Delete button */}
                          {isEditable && (
                            <button
                              onClick={() => handleRemoveLabel(idx)}
                              className="px-1.5 text-sm font-bold text-slate-400 hover:text-rose-600"
                              title="Xóa nhãn này"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {labels.length === 0 && (
                      <div className="py-6 text-center font-mono text-xs text-slate-500">
                        Chưa có nhãn nào. Bấm &quot;Thêm nhãn mới&quot; để thiết
                        lập.
                      </div>
                    )}
                  </div>
                )}

              {/* XML Preview of selected or custom configuration */}
              {selectedTemplate && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-200">
                      Xem trước cấu hình XML hiện tại (XML Config Preview):
                    </span>
                    <span className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[9px] dark:bg-slate-800">
                      Auto Generated
                    </span>
                  </div>
                  <pre className="mt-3 max-h-48 overflow-x-auto font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-400">
                    {currentXml}
                  </pre>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
