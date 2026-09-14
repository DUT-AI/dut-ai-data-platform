import { Metadata } from "next";
import { CreateProjectView } from "@/features/projects";

export const metadata: Metadata = {
  title: "Tạo Dự án Mới | DUT AI Data Platform",
  description:
    "Thiết lập dự án gán nhãn dữ liệu và cấu hình Ontology cho mô hình AI",
};

export default function NewProjectPage() {
  return <CreateProjectView />;
}
