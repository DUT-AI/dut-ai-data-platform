import { Metadata } from "next";
import { UsersView } from "@/features/users";

export const metadata: Metadata = {
  title: "Người dùng | DUT AI Data Platform",
  description: "Danh sách người dùng và thời điểm đăng nhập hệ thống.",
};

export default function UsersPage() {
  return <UsersView />;
}
