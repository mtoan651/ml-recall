/**
 * Vietnamese titles of the domains and topics of src/content/taxonomy.yaml, keyed by id. In the
 * Vietnamese interface a title shows as "Vietnamese · English" (`titleOf` in i18n.ts): students
 * also need the English term. Terms follow the d2l-vi glossary (src/content/glossary.yaml).
 * `i18n.test.ts` checks that every taxonomy id has an entry here.
 */

export const DOMAIN_VI: Readonly<Record<string, string>> = {
  ai: "Trí tuệ nhân tạo",
  math: "Toán cho học máy",
  ml: "Học máy",
  dl: "Học sâu",
  cv: "Thị giác máy tính",
  nlp: "Xử lý ngôn ngữ tự nhiên",
  gen: "Mô hình sinh",
  llm: "Mô hình ngôn ngữ lớn",
  rl: "Học tăng cường",
  practice: "Công cụ thực hành",
};

export const TOPIC_VI: Readonly<Record<string, string>> = {
  // ai
  "ai-intro": "Nền tảng và lịch sử AI",
  "knowledge-rep": "Biểu diễn tri thức và suy luận",
  search: "Tìm kiếm và lập kế hoạch",
  "genetic-algorithms": "Giải thuật di truyền",
  "multi-agent": "Hệ đa tác nhân",
  "ai-ethics": "AI có trách nhiệm và công bằng",
  // math
  "linear-algebra": "Đại số tuyến tính",
  probability: "Xác suất",
  statistics: "Thống kê và ước lượng",
  optimization: "Tối ưu hóa và giải tích",
  "information-theory": "Lý thuyết thông tin",
  // ml
  "ml-basics": "Cơ bản về học máy",
  "data-prep": "Dữ liệu và đặc trưng",
  metrics: "Các phép đánh giá",
  "linear-regression": "Mô hình tuyến tính và điều chuẩn",
  "logistic-regression": "Hồi quy logistic và softmax",
  classification: "Phân loại",
  nonparametric: "Láng giềng gần nhất và phương pháp hạt nhân",
  svm: "Máy vector hỗ trợ",
  "trees-ensembles": "Cây quyết định và mô hình kết hợp",
  "probabilistic-models": "Mô hình xác suất và mô hình đồ thị",
  "learning-theory": "Lý thuyết học",
  clustering: "Phân cụm",
  "dim-reduction": "Giảm chiều dữ liệu",
  "time-series": "Chuỗi thời gian",
  // dl
  "neural-networks": "Cơ bản về mạng nơ-ron",
  training: "Huấn luyện mạng sâu",
  frameworks: "Framework học sâu",
  cnn: "Mạng nơ-ron tích chập",
  rnn: "Mạng nơ-ron hồi tiếp",
  transformers: "Cơ chế tập trung và Transformer",
  gnn: "Mạng nơ-ron đồ thị",
  architectures: "Các kiến trúc tiêu biểu",
  "transfer-learning": "Học truyền tải",
  xai: "AI khả giải thích",
  // cv
  "cv-basics": "Cơ bản về thị giác máy tính",
  "object-detection": "Phát hiện vật thể",
  segmentation: "Phân vùng ảnh",
  // nlp
  "nlp-basics": "Cơ bản về xử lý ngôn ngữ tự nhiên",
  "text-representation": "Biểu diễn văn bản và embedding",
  tokenization: "Tách token",
  "language-models": "Mô hình hóa ngôn ngữ",
  "nlp-tasks": "Các tác vụ xử lý ngôn ngữ tự nhiên",
  // gen
  autoencoders: "Bộ tự mã hóa và VAE",
  gans: "Mạng đối sinh",
  diffusion: "Mô hình khuếch tán",
  // llm
  "llm-basics": "Cơ bản về LLM và kỹ thuật prompt",
  "fine-tuning": "Tinh chỉnh và PEFT",
  alignment: "Căn chỉnh và suy luận",
  "rag-agents": "RAG và tác nhân",
  // rl
  "rl-basics": "Cơ bản về học tăng cường",
  "q-learning": "Phương pháp dựa trên giá trị",
  "policy-gradient": "Gradient chính sách và Actor-Critic",
  // practice
  pytorch: "PyTorch",
  huggingface: "Hệ sinh thái Hugging Face",
  numpy: "NumPy",
};
