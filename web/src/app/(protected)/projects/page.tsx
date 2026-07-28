import { ProjectList } from "@/features/projects";

export const metadata = {
  title: "Quản lý Dự án | DUT AI Data Platform",
  description: "Quản lý các không gian làm việc gán nhãn dữ liệu và mô hình AI",
};

export default function ProjectsPage() {
  return <ProjectList />;
}
