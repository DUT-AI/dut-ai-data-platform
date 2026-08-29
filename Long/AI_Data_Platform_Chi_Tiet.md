# Chi Tiết Kiến Trúc và Các Domain của AI Data Platform

Tài liệu này giải thích chi tiết từng phần, từng domain và các nguyên tắc thiết kế của **AI Data Platform** dựa trên tài liệu tham khảo.

## 1. Mục tiêu và Phạm vi
AI Data Platform được xây dựng như một nền tảng hợp nhất để quản lý toàn bộ vòng đời dữ liệu AI. 
- **Mục tiêu:** Cung cấp workspace thống nhất cho từng bài toán AI, chuẩn hóa dữ liệu để có thể tái lập (reproduce) và audit. Đồng thời, nền tảng tách biệt rõ ràng giữa logic nghiệp vụ cốt lõi (core business domains) và lớp tích hợp (integration layer).
- **Phạm vi:** Nền tảng chịu trách nhiệm quản lý từ khâu tạo Project, định nghĩa schema (Ontology), quản lý dữ liệu (Dataset), gán nhãn (Annotation), điều phối công việc (Workflow), đến việc tạo bản ghi bất biến (Snapshot), huấn luyện (Training), quản lý mô hình (Model) và suy luận (Inference). Nền tảng không tự viết lại các công cụ chuyên sâu (như Annotation editor hay Storage engine) mà tích hợp chúng qua lớp Adapter/Provider.

## 2. Giải thích chi tiết các Domain (Domain Model)
Hệ thống được thiết kế theo nguyên tắc Domain-Driven Design (DDD). Dưới đây là giải thích chi tiết cho từng Domain:

### 2.1. Project Domain
- **Vai trò:** Là ranh giới không gian làm việc (workspace boundary) và là đơn vị quản lý nghiệp vụ cao nhất cho một bài toán AI.
- **Trách nhiệm:** Quản lý không gian làm việc, thành viên, quyền truy cập và các cấu hình dùng chung. Mọi tài nguyên khác đều phải gắn kết trong phạm vi một Project cụ thể để tránh nhầm lẫn bối cảnh. Bản thân Project không sở hữu trực tiếp dữ liệu vật lý hay bản snapshot.

### 2.2. Ontology Domain
- **Vai trò:** Là bản hợp đồng cấu trúc (schema contract) cho dữ liệu gán nhãn.
- **Trách nhiệm:** Quản lý ontology, các phiên bản (version), danh mục (category) và thuộc tính (attribute). Việc tách Ontology thành một domain riêng biệt cho phép nó có vòng đời và versioning độc lập. Sau khi được "published", một phiên bản Ontology sẽ trở thành bất biến.

### 2.3. Dataset Domain
- **Vai trò:** Hoạt động như một danh mục dữ liệu (data catalog).
- **Trách nhiệm:** Quản lý Dataset, các phiên bản của tập dữ liệu (Dataset Version), Asset (tài sản dữ liệu vật lý), metadata và storage URI. Dữ liệu vật lý (Asset) chỉ tồn tại một lần và dùng checksum để phát hiện trùng lặp. Dataset đóng vai trò tổ chức các Asset này theo mục đích nghiệp vụ.

### 2.4. Annotation Domain
- **Vai trò:** Nơi quản lý dữ liệu gán nhãn đã được chuẩn hóa.
- **Trách nhiệm:** Quản lý Annotation, Revision và Result. Domain này chịu trách nhiệm nhận kết quả gán nhãn độc lập từ các công cụ bên ngoài (như Label Studio, CVAT) và chuẩn hóa (normalize) sang cấu trúc nội bộ (internal schema). Domain này không quản lý quy trình phân công (assignment) hay review.

### 2.5. Workflow Domain
- **Vai trò:** Điều phối và quản lý quy trình xử lý công việc.
- **Trách nhiệm:** Quản lý các hạng mục công việc (Work Item), phân công, theo dõi trạng thái, quy trình review/approval, thông báo và ghi nhận audit lịch sử xử lý. Nó tách biệt hoàn toàn và không sở hữu dữ liệu gán nhãn hay tập dữ liệu.

### 2.6. Snapshot Domain
- **Vai trò:** Tạo ra nguồn dữ liệu bất biến (immutable source) phục vụ cho các bước phía sau (downstream).
- **Trách nhiệm:** Chụp lại trạng thái (Snapshot) từ Dataset Version, Ontology Version và Annotation Revision tại một thời điểm. Snapshot chỉ lưu tham chiếu (reference) chứ không sao chép dữ liệu vật lý, đảm bảo tính bất biến để cung cấp dữ liệu cho Export, Training và Evaluation.

### 2.7. Export Domain
- **Vai trò:** Trình chuyển đổi định dạng dữ liệu.
- **Trách nhiệm:** Chuyển Snapshot sang các định dạng chuẩn dùng cho huấn luyện như COCO, YOLO, Pascal VOC, CSV, JSON, Hugging Face Datasets, v.v. Domain này không truy cập trực tiếp dữ liệu live, chỉ đọc từ dữ liệu Snapshot.

### 2.8. Training Domain
- **Vai trò:** Quản lý và điều phối quá trình huấn luyện mô hình học máy.
- **Trách nhiệm:** Khởi tạo Training Job, quản lý Experiment, ghi nhận Checkpoint và Metrics. Tương tự như Export, domain này cũng đọc dữ liệu trực tiếp từ Snapshot để đảm bảo tính tái lập (reproducibility).

### 2.9. Model Domain
- **Vai trò:** Nơi lưu trữ và quản lý tài nguyên của mô hình sau khi huấn luyện.
- **Trách nhiệm:** Quản lý Model Registry, Model Version, Artifact và siêu dữ liệu triển khai (Deployment Metadata).

### 2.10. Inference Domain
- **Vai trò:** Thực thi các tác vụ suy luận từ mô hình.
- **Trách nhiệm:** Xử lý suy luận mô hình, batch prediction, auto-label và pre-annotation. Dữ liệu sinh ra từ đây có thể được đẩy ngược lại Annotation Domain thông qua Workflow phù hợp.

### 2.11. Search và Audit Domain
- **Search Domain:** Chịu trách nhiệm lập chỉ mục (index) và cung cấp dịch vụ truy vấn (Query Service) cho Project, Dataset, Annotation, Snapshot.
- **Audit Domain:** Ghi nhận mọi thay đổi, log hoạt động người dùng và truy vết sự kiện nghiệp vụ, đóng vai trò phụ trợ quan trọng cho compliance trên một nền tảng nhiều người dùng.

### 2.12. Provider Layer (Lớp Tích Hợp)
- **Vai trò:** Lớp kết nối giúp tích hợp linh hoạt với các công cụ mã nguồn mở và dịch vụ bên ngoài.
- **Trách nhiệm:** Đảm bảo hệ thống cốt lõi không bị phụ thuộc chặt chẽ vào một công cụ cụ thể. Ví dụ:
  - *Annotation Provider:* Dùng Label Studio cho gán nhãn tổng quát, CVAT khi cần task management mạnh, hoặc Doccano cho xử lý văn bản.
  - *Storage Provider:* Dùng MinIO, S3.
  - *Training Provider:* Dùng MLflow, Kubeflow.
  - *Search/Auth/Monitoring:* OpenSearch, Keycloak, Prometheus, Grafana.

## 3. Các Quyết định Thiết kế Quan trọng (Design Decisions)
- **Immutable Artifacts:** Các tài nguyên như Dataset Version, Ontology Version, Annotation Revision và Snapshot phải ở trạng thái bất biến sau khi phát hành để đảm bảo tái lập chính xác quá trình làm việc.
- **Provider layer giúp thay thế Tool:** Hệ thống coi các công cụ open-source là các "Implementation" có thể thay thế được, nhằm bảo vệ business logic cốt lõi.
- **Phân tách Dữ liệu và Quy trình:** Dữ liệu chuẩn hóa (Annotation) và Quản lý quy trình (Workflow) được tách làm hai domain riêng biệt để dễ bảo trì, tránh sự chồng chéo.

## 4. Lợi ích, Hạn chế và Hướng Mở Rộng
- **Lợi ích:** Kiến trúc rõ ràng, dễ mở rộng, tách biệt rõ ràng các domain. Dễ dàng thay thế công cụ open-source mà không phá vỡ hệ thống cốt lõi, đồng thời hỗ trợ audit và truy vết tốt.
- **Hạn chế:** Độ phức tạp kiến trúc ban đầu cao do số lượng domain nhiều. Đòi hỏi phải thiết kế Provider layer cẩn thận để tránh phụ thuộc ngược (coupling).
- **Tương lai (Future Extension):** Nền tảng hướng tới việc hỗ trợ đa không gian làm việc (Multi-workspace/Organization), chia sẻ Ontology template, Active learning, Human-in-the-loop, hỗ trợ đồng thời nhiều annotation provider và tích hợp Vector Search ở mức độ platform.
