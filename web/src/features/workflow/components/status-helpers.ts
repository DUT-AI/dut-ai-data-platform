import type { WorkItemStatus } from "../types";

export function getStatusBadgeVariant(
  status: WorkItemStatus
): "default" | "secondary" | "success" | "warning" | "destructive" | "outline" {
  switch (status) {
    case "CREATED":
      return "outline";
    case "ASSIGNED":
      return "secondary";
    case "IN_PROGRESS":
      return "default";
    case "SUBMITTED":
      return "secondary";
    case "IN_REVIEW":
      return "warning";
    case "APPROVED":
    case "COMPLETED":
      return "success";
    case "REJECTED":
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

export function getStatusLabel(status: WorkItemStatus): string {
  switch (status) {
    case "CREATED":
      return "Mới tạo";
    case "ASSIGNED":
      return "Đã giao";
    case "IN_PROGRESS":
      return "Đang làm";
    case "SUBMITTED":
      return "Đã nộp";
    case "IN_REVIEW":
      return "Đang duyệt";
    case "APPROVED":
      return "Đã duyệt";
    case "REJECTED":
      return "Yêu cầu sửa";
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

export function getNextPossibleTransitions(
  current: WorkItemStatus
): WorkItemStatus[] {
  switch (current) {
    case "CREATED":
      // Chuyển bước không được chuyển trực tiếp sang ASSIGNED mà phải qua hành động "Giao việc"
      return ["CANCELLED"];
    case "ASSIGNED":
      // Cho phép bắt đầu làm, hoặc hoàn tác/thu hồi giao việc về lại CREATED, hoặc hủy
      return ["IN_PROGRESS", "CREATED", "CANCELLED"];
    case "IN_PROGRESS":
      // Cho phép nộp bài, hoặc trả việc về lại ASSIGNED, hoặc hủy
      return ["SUBMITTED", "ASSIGNED", "CANCELLED"];
    case "SUBMITTED":
      // Cho phép reviewer nhận duyệt, hoặc annotator rút lại bài nộp về IN_PROGRESS để sửa, hoặc hủy
      return ["IN_REVIEW", "IN_PROGRESS", "CANCELLED"];
    case "IN_REVIEW":
      // Duyệt đạt, từ chối sửa, hoặc nhả phiên duyệt về SUBMITTED, hoặc hủy
      return ["APPROVED", "REJECTED", "SUBMITTED", "CANCELLED"];
    case "REJECTED":
      return ["SUBMITTED", "IN_PROGRESS", "ASSIGNED", "CANCELLED"];
    case "APPROVED":
      return ["COMPLETED", "IN_REVIEW"];
    case "CANCELLED":
      // Cho phép khôi phục lô bị hủy nhầm về lại CREATED
      return ["CREATED"];
    case "COMPLETED":
      return [];
    default:
      return [];
  }
}

export function getTransitionDetails(
  current: WorkItemStatus,
  target: WorkItemStatus
): { actionName: string; hint: string; isRollback: boolean } {
  if (current === "CREATED" && target === "CANCELLED") {
    return { actionName: "Hủy gói công việc", hint: "Hủy bỏ lô công việc này", isRollback: false };
  }
  if (current === "ASSIGNED" && target === "IN_PROGRESS") {
    return { actionName: "Bắt đầu làm", hint: "Bắt đầu tiến hành dán nhãn", isRollback: false };
  }
  if (current === "ASSIGNED" && target === "CREATED") {
    return { actionName: "Thu hồi phân công (Hủy giao)", hint: "Hủy gán việc cho người này, đưa về kho Mới tạo", isRollback: true };
  }
  if (current === "IN_PROGRESS" && target === "SUBMITTED") {
    return { actionName: "Nộp bài kiểm duyệt", hint: "Hoàn tất dán nhãn và gửi duyệt", isRollback: false };
  }
  if (current === "IN_PROGRESS" && target === "ASSIGNED") {
    return { actionName: "Tạm dừng / Trả việc", hint: "Nhả việc về lại hàng chờ 'Đã giao'", isRollback: true };
  }
  if (current === "SUBMITTED" && target === "IN_REVIEW") {
    return { actionName: "Bắt đầu kiểm duyệt", hint: "Reviewer tiếp nhận xét duyệt", isRollback: false };
  }
  if (current === "SUBMITTED" && target === "IN_PROGRESS") {
    return { actionName: "Rút lại bài nộp (Sửa tiếp)", hint: "Rút lại để chỉnh sửa hoặc bổ sung nhãn", isRollback: true };
  }
  if (current === "IN_REVIEW" && target === "APPROVED") {
    return { actionName: "Duyệt đạt (Approved)", hint: "Xác nhận chất lượng dán nhãn đạt yêu cầu", isRollback: false };
  }
  if (current === "IN_REVIEW" && target === "REJECTED") {
    return { actionName: "Yêu cầu sửa lại (Reject)", hint: "Từ chối và yêu cầu sửa lại các nhãn sai", isRollback: false };
  }
  if (current === "IN_REVIEW" && target === "SUBMITTED") {
    return { actionName: "Nhả duyệt", hint: "Hủy phiên duyệt để người khác nhận hoặc duyệt sau", isRollback: true };
  }
  if (current === "REJECTED" && target === "SUBMITTED") {
    return {
      actionName: "Nộp lại kiểm duyệt",
      hint: "Đã hoàn thành sửa theo góp ý, nộp lại cho Reviewer kiểm duyệt",
      isRollback: false,
    };
  }
  if (current === "REJECTED" && target === "IN_PROGRESS") {
    return {
      actionName: "Chuyển về Đang làm (Sửa tiếp)",
      hint: "Đánh dấu trạng thái đang trong quá trình sửa",
      isRollback: false,
    };
  }
  if (current === "REJECTED" && target === "ASSIGNED") {
    return {
      actionName: "Phân công lại cho người khác",
      hint: "Giao lại lô công việc này cho annotator khác thực hiện sửa",
      isRollback: true,
    };
  }
  if (current === "APPROVED" && target === "COMPLETED") {
    return { actionName: "Đóng hoàn thành", hint: "Chốt gói công việc hoàn thành 100%", isRollback: false };
  }
  if (current === "APPROVED" && target === "IN_REVIEW") {
    return { actionName: "Mở lại duyệt", hint: "Mở lại phiên duyệt nếu đã duyệt nhầm", isRollback: true };
  }
  if (current === "CANCELLED" && target === "CREATED") {
    return { actionName: "Khôi phục lại lô", hint: "Khôi phục lô bị hủy nhầm về lại 'Mới tạo'", isRollback: true };
  }
  if (target === "CANCELLED") {
    return { actionName: "Hủy gói công việc", hint: "Hủy bỏ lô công việc này", isRollback: false };
  }
  return { actionName: getStatusLabel(target), hint: `Chuyển sang trạng thái ${getStatusLabel(target)}`, isRollback: false };
}

