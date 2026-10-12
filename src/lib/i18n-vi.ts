/**
 * The Vietnamese interface: English key → Vietnamese text (src/lib/i18n.ts). Placeholders such
 * as `{n}` must be kept; English plural keys may share one Vietnamese form. ML terms follow the
 * d2l-vi glossary (src/content/glossary.yaml). `i18n.test.ts` fails on a key used in the code
 * without an entry here, and on an entry no code uses.
 *
 * Vocabulary: practice = luyện tập · review (spaced repetition) = ôn tập · test = bài kiểm tra ·
 * mixed test = kiểm tra tổng hợp · topic = chủ đề · tag = thẻ · reviewed (checked by a person) =
 * đã duyệt · flag = đánh dấu · submit = nộp bài · mistakes = câu sai.
 */
export const VI: Readonly<Record<string, string>> = {
  // ------------------------------------------------------------------ layout, navigation
  "ml-recall — active recall for AI/ML/DL": "ml-recall — ôn tập chủ động AI/ML/DL",
  "Skip to content": "Chuyển đến nội dung chính",
  Main: "Chính",
  Breadcrumb: "Đường dẫn",
  Topics: "Chủ đề",
  Review: "Ôn tập",
  "Mixed test": "Kiểm tra tổng hợp",
  Mistakes: "Câu sai",
  Progress: "Tiến độ",
  Tags: "Thẻ",
  Search: "Tìm kiếm",
  "{n} due today": "{n} câu đến hạn hôm nay",
  Code: "Mã nguồn",
  "Questions keep their source's license (shown under each answer); original questions":
    "Mỗi câu hỏi giữ giấy phép của nguồn (ghi dưới mỗi đáp án); câu hỏi tự soạn theo",
  "Glossary (English – Vietnamese)": "Bảng thuật ngữ (Anh – Việt)",
  "Progress is stored only in this browser.": "Tiến độ chỉ được lưu trong trình duyệt này.",
  "Source on GitHub": "Mã nguồn trên GitHub",

  // ------------------------------------------------------------------ home, topic and tag pages
  "Practice AI, ML and deep learning by recalling, not rereading.":
    "Học AI, học máy và học sâu bằng cách chủ động nhớ lại, không phải đọc đi đọc lại.",
  "Exam-style questions with instant feedback, worked explanations and cited sources. Pick a topic and answer one question at a time, or take a timed test — your last result per question stays in this browser.":
    "Câu hỏi theo kiểu đề thi, có phản hồi tức thì, lời giải chi tiết và nguồn trích dẫn. Chọn một chủ đề và trả lời từng câu, hoặc làm bài kiểm tra tính giờ — kết quả gần nhất của mỗi câu được lưu trong trình duyệt này.",
  "{questions} questions · {topics} topics · {reviewed} reviewed":
    "{questions} câu hỏi · {topics} chủ đề · {reviewed} câu đã duyệt",
  "browse by tag": "xem theo thẻ",
  "EN–VI glossary": "Thuật ngữ Anh–Việt",
  "Mixed test across topics": "Kiểm tra tổng hợp nhiều chủ đề",
  "My mistakes": "Câu sai của tôi",
  "No questions yet": "Chưa có câu hỏi",
  "{n} question · {reviewed} reviewed": "{n} câu hỏi · {reviewed} câu đã duyệt",
  "{n} questions · {reviewed} reviewed": "{n} câu hỏi · {reviewed} câu đã duyệt",
  "Test · {n} min": "Kiểm tra · {n} phút",
  "on {title}": "về {title}",
  "{answered} / {total} answered · {correct} correct":
    "đã trả lời {answered}/{total} · đúng {correct}",
  "Read the notes ({n} min)": "Đọc ghi chú ({n} phút)",
  "{n} question from": "{n} câu hỏi từ",
  "{n} questions from": "{n} câu hỏi từ",
  "Longer test or by difficulty: mixed test with {tag}":
    "Bài dài hơn hoặc theo độ khó: kiểm tra tổng hợp với {tag}",
  "Cross-topic practice sets: every question carrying a tag, in one session.":
    "Bộ luyện tập xuyên chủ đề: mọi câu hỏi gắn một thẻ, trong một lượt.",
  "No tagged questions yet.": "Chưa có câu hỏi nào được gắn thẻ.",
  Question: "Câu hỏi",
  "Question {id}": "Câu hỏi {id}",
  "Practice all of {title}": "Luyện tập toàn bộ {title}",
  "Notes on {title}": "Ghi chú về {title}",
  "{title}: notes": "{title}: ghi chú",
  "Topic notes": "Ghi chú chủ đề",
  "Key ideas": "Ý chính",
  Formulas: "Công thức",
  "Worked example": "Ví dụ có lời giải",
  "In code": "Trong code",
  "Common pitfalls": "Lỗi thường gặp",
  "{n}-min read": "đọc trong {n} phút",
  Reviewed: "Đã duyệt",
  "Practise {n} question": "Luyện tập {n} câu hỏi",
  "Practise {n} questions": "Luyện tập {n} câu hỏi",
  "Kept in this browser, like the rest of your progress.":
    "Được lưu trong trình duyệt này, như toàn bộ tiến độ của bạn.",
  "From the results stored in this browser.": "Từ kết quả được lưu trong trình duyệt này.",

  // ------------------------------------------------------------------ other pages
  "Not found": "Không tìm thấy",
  "Page not found": "Không tìm thấy trang",
  "This page does not exist (anymore).": "Trang này không tồn tại (hoặc không còn nữa).",
  "Back to all topics": "Quay lại danh sách chủ đề",
  Glossary: "Bảng thuật ngữ",
  "{n} terms in English and Vietnamese (Thuật ngữ Anh – Việt), from the glossary of":
    "{n} thuật ngữ Anh – Việt, lấy từ bảng thuật ngữ của",
  ", the Vietnamese edition of Dive into Deep Learning (CC BY-SA 4.0).":
    ", bản tiếng Việt của Dive into Deep Learning (CC BY-SA 4.0).",
  "Filter terms": "Lọc thuật ngữ",
  "Filter: softmax, hàm mất mát…": "Lọc: softmax, hàm mất mát…",
  Letters: "Chữ cái",
  "{shown} of {total} terms": "{shown}/{total} thuật ngữ",
  "of d2l-ai/d2l-vi, pinned commit; see": "của d2l-ai/d2l-vi (theo commit cố định); dùng",
  "to find questions using a term.": "để tìm câu hỏi có dùng một thuật ngữ.",
  Offline: "Ngoại tuyến",
  "You're offline": "Bạn đang ngoại tuyến",
  "This page hasn't been saved in this browser yet. Pages you opened before still work offline, and so do Review, Mistakes and Progress — your answers are saved as usual.":
    "Trang này chưa được lưu trong trình duyệt. Các trang bạn đã mở trước đó vẫn dùng được khi ngoại tuyến, cả Ôn tập, Câu sai và Tiến độ — câu trả lời của bạn vẫn được lưu như bình thường.",
  "Available offline": "Dùng được khi ngoại tuyến",
  "No topic pages kept yet: open a topic while online to practise it offline later.":
    "Chưa lưu trang chủ đề nào: hãy mở một chủ đề khi có mạng để sau này luyện tập ngoại tuyến.",
  "Every question and topic note, by the words in it. Filter by domain, topic, type and difficulty; open a result to answer the question.":
    "Tìm mọi câu hỏi và ghi chú chủ đề theo từ ngữ trong đó. Lọc theo lĩnh vực, chủ đề, dạng câu hỏi và độ khó; mở một kết quả để trả lời câu hỏi.",
  Domain: "Lĩnh vực",
  Type: "Dạng câu hỏi",
  "The search index is created by": "Chỉ mục tìm kiếm được tạo bởi",
  "; it is not available in": "; không có sẵn khi chạy",

  // ------------------------------------------------------------------ CE6146 exam prep
  "CE6146 exam prep": "Ôn thi CE6146",
  "Questions written from the lecture slides and in-class exercises of NCU CE6146 Introduction to Deep Learning — paraphrased, each also citing an open source — and the bank's topics for the weeks still to come.":
    "Câu hỏi soạn từ slide bài giảng và bài tập trên lớp của môn CE6146 Nhập môn học sâu (NCU) — được diễn đạt lại, mỗi câu kèm một nguồn mở — cùng các chủ đề trong ngân hàng cho những tuần học tiếp theo.",
  "{n} course questions": "{n} câu hỏi của môn học",
  "{n} course question": "{n} câu hỏi của môn học",
  "Timed test · {n} min": "Kiểm tra tính giờ · {n} phút",
  "Longer test or by difficulty": "Đề dài hơn hoặc theo độ khó",
  "Practise all": "Luyện tập tất cả",
  "From the lecture slides": "Từ slide bài giảng",
  "From the in-class exercises": "Từ bài tập trên lớp",
  "Lecture 1 · Deep learning basics": "Bài 1 · Cơ bản về học sâu",
  "Lecture 2 · Feedforward neural networks": "Bài 2 · Mạng truyền xuôi",
  "Lecture 3 · Optimization and regularization": "Bài 3 · Tối ưu hóa và điều chuẩn",
  "Exercise 1": "Bài tập 1",
  "Exercise 2": "Bài tập 2",
  "Exercise 3": "Bài tập 3",
  "Later weeks of the syllabus": "Các tuần sau trong đề cương",
  "No questions from these slides yet — practise the bank's topics that cover them.":
    "Chưa có câu hỏi từ slide của các tuần này — hãy luyện các chủ đề tương ứng trong ngân hàng.",
  "Mixed test over these topics": "Kiểm tra tổng hợp các chủ đề này",
  Notes: "Ghi chú",
  "Convolutional neural networks": "Mạng nơ-ron tích chập",
  "Recurrent neural networks": "Mạng nơ-ron hồi tiếp",
  "Attention and transformers": "Cơ chế tập trung và Transformer",
  "Graph neural networks": "Mạng nơ-ron đồ thị",
  "Autoencoders and GANs": "Bộ tự mã hóa và GAN",
  "Explainable AI": "AI khả giải thích",
  "Reinforcement learning": "Học tăng cường",
  "The course's slides and exercises are not published here: the questions only paraphrase them and cite slide numbers.":
    "Slide và bài tập của môn học không được đăng ở đây: các câu hỏi chỉ diễn đạt lại và ghi số slide.",
  // ------------------------------------------------------------------ practice (Quiz)
  "Practice: {scope}": "Luyện tập: {scope}",
  Done: "Hoàn thành",
  "Q {current} / {total}": "Câu {current} / {total}",
  "Score {correct} / {answered}": "Điểm {correct} / {answered}",
  "Shuffle questions": "Xáo trộn câu hỏi",
  "Reviewed only ({n})": "Chỉ câu đã duyệt ({n})",
  "No reviewed questions here yet": "Chưa có câu hỏi đã duyệt nào ở đây",
  "No reviewed questions in this set yet.": "Bộ câu hỏi này chưa có câu nào đã duyệt.",
  "Include unreviewed questions": "Thêm cả câu chưa duyệt",
  "Keys: 1–9 select · Enter check / next": "Phím: 1–9 chọn · Enter kiểm tra / câu tiếp",
  "Enter: check / next": "Enter: kiểm tra / câu tiếp",
  Check: "Kiểm tra",
  "Next question": "Câu tiếp theo",
  "See results": "Xem kết quả",
  "Correct.": "Đúng.",
  "Not quite.": "Chưa đúng.",
  "Fill in blank {n} first.": "Hãy điền ô trống {n} trước.",
  "Type an answer first.": "Hãy nhập câu trả lời trước.",
  "Blank {n} is not a number.": "Ô trống {n} không phải là một số.",
  "That is not a number.": "Đây không phải là một số.",
  "Session complete": "Hoàn thành lượt luyện tập",
  "correct · {percent}%": "câu đúng · {percent}%",
  "Retry {n} missed": "Làm lại {n} câu sai",
  "Practice again": "Luyện tập lại",
  "All topics": "Tất cả chủ đề",
  "Missed questions": "Các câu trả lời sai",
  "Answer:": "Đáp án:",

  // ------------------------------------------------------------------ question card, feedback
  "Question {n}: ": "Câu {n}: ",
  "Single choice": "Một lựa chọn",
  "Select all that apply": "Chọn mọi đáp án đúng",
  "True or false": "Đúng hay sai",
  "Short answer": "Trả lời ngắn",
  easy: "dễ",
  medium: "trung bình",
  hard: "khó",
  unreviewed: "chưa duyệt",
  "Imported or generated and not yet checked; may contain errors.":
    "Được nhập hoặc sinh tự động và chưa được kiểm tra; có thể có lỗi.",
  "AI-checked": "AI đã kiểm tra",
  "Checked by Claude (an AI model) at the owner's request: key re-derived, explanation cited. Not yet verified by a human.":
    "Đã được Claude (một mô hình AI) kiểm tra theo yêu cầu của chủ dự án: đáp án được suy lại, lời giải có trích dẫn. Chưa được người kiểm chứng.",
  "Select all options that apply": "Chọn mọi phương án đúng",
  "Choose one option": "Chọn một phương án",
  "Your answer": "Câu trả lời của bạn",
  Missed: "Bỏ sót",
  Correct: "Đúng",
  "Type a number": "Nhập một số",
  "Type your answer": "Nhập câu trả lời",
  "Fill in every blank (hints in the boxes). Enter moves to the next blank.":
    "Điền vào mọi ô trống (gợi ý nằm trong ô). Enter để sang ô tiếp theo.",
  "Fill in every blank. Enter moves to the next blank.":
    "Điền vào mọi ô trống. Enter để sang ô tiếp theo.",
  "Blank {i} of {n}": "Ô trống {i}/{n}",
  "Blank {i} of {n} ({hint})": "Ô trống {i}/{n} ({hint})",
  number: "số",
  "Enter a number, e.g. 42, -0.5, 1/3 or 2.5e-3.": "Nhập một số, ví dụ 42, -0.5, 1/3 hoặc 2.5e-3.",
  "A word or short phrase": "Một từ hoặc cụm từ ngắn",
  "{answers} (and equivalent spellings)": "{answers} (và các cách viết tương đương)",
  "Not quite": "Chưa đúng",
  "Not answered": "Chưa trả lời",
  "You missed {n} correct option — all correct options are needed.":
    "Bạn bỏ sót {n} phương án đúng — cần chọn đúng và đủ các phương án đúng.",
  "You missed {n} correct options — all correct options are needed.":
    "Bạn bỏ sót {n} phương án đúng — cần chọn đúng và đủ các phương án đúng.",
  "You picked {n} wrong option — all correct options are needed.":
    "Bạn chọn {n} phương án sai — cần chọn đúng và đủ các phương án đúng.",
  "You picked {n} wrong options — all correct options are needed.":
    "Bạn chọn {n} phương án sai — cần chọn đúng và đủ các phương án đúng.",
  "You missed {missed} and picked {wrong} — all correct options are needed.":
    "Bạn bỏ sót {missed} và chọn {wrong} — cần chọn đúng và đủ các phương án đúng.",
  "{n} correct option": "{n} phương án đúng",
  "{n} correct options": "{n} phương án đúng",
  "{n} wrong option": "{n} phương án sai",
  "{n} wrong options": "{n} phương án sai",
  Answer: "Đáp án",
  " (case, spaces and punctuation are ignored)":
    " (không phân biệt hoa thường, khoảng trắng và dấu câu)",
  "Blank {n}:": "Ô trống {n}:",
  Explanation: "Giải thích",
  "No explanation has been written for this question yet.": "Câu hỏi này chưa có lời giải thích.",
  "The reference below covers the topic.": "Tài liệu tham khảo bên dưới có đề cập đến chủ đề này.",
  "See the original question in {source}.": "Xem câu hỏi gốc tại {source}.",
  References: "Tài liệu tham khảo",
  "Source:": "Nguồn:",
  "Enlarge figure": "Phóng to hình",
  "Enlarge figure: {alt}": "Phóng to hình: {alt}",
  "Enlarge image: {alt}": "Phóng to ảnh: {alt}",
  Close: "Đóng",

  // ------------------------------------------------------------------ timed tests
  "Timed test": "Bài kiểm tra tính giờ",
  "Timed test: {title}": "Bài kiểm tra tính giờ: {title}",
  "Test: {title}": "Bài kiểm tra: {title}",
  "Test:": "Bài kiểm tra:",
  "{n} question · {n} min · score and explanations at the end":
    "{n} câu · {n} phút · có điểm và lời giải khi kết thúc",
  "{n} questions · {n} min · score and explanations at the end":
    "{n} câu · {n} phút · có điểm và lời giải khi kết thúc",
  "Take a test": "Làm bài kiểm tra",
  "Resume test": "Làm tiếp bài kiểm tra",
  "Test in progress · {n} min left": "Đang làm bài · còn {n} phút",
  "Last {last}": "Lần gần nhất {last}",
  "Last {last} · Best {best}": "Lần gần nhất {last} · Tốt nhất {best}",
  "{n} question · {n} minute": "{n} câu · {n} phút",
  "{n} questions · {n} minutes": "{n} câu · {n} phút",
  "{n} question": "{n} câu hỏi",
  "{n} questions": "{n} câu hỏi",
  "{n} reviewed question": "{n} câu hỏi đã duyệt",
  "{n} reviewed questions": "{n} câu hỏi đã duyệt",
  "Random questions from {title}, a new set every time.":
    "Câu hỏi ngẫu nhiên từ {title}, mỗi lần một bộ mới.",
  "Random questions from the tag {title}, a new set every time.":
    "Câu hỏi ngẫu nhiên từ thẻ {title}, mỗi lần một bộ mới.",
  "This topic has {count}, so this test has {size}.":
    "Chủ đề này có {count}, nên bài kiểm tra này gồm {size}.",
  "This tag has {count}, so this test has {size}.":
    "Thẻ này có {count}, nên bài kiểm tra này gồm {size}.",
  "This selection has {count}, so this test has {size}.":
    "Lựa chọn này có {count}, nên bài kiểm tra này gồm {size}.",
  "No questions to draw from.": "Không có câu hỏi nào để chọn.",
  "No questions to draw from with “Reviewed questions only”.":
    "Không có câu hỏi nào khi bật “Chỉ câu hỏi đã duyệt”.",
  Rules: "Quy định",
  "One minute per question. Move freely between questions and flag any to revisit.":
    "Mỗi câu một phút. Bạn có thể chuyển qua lại giữa các câu và đánh dấu câu muốn xem lại.",
  "No feedback until you submit — then you get your score and every answer explained. Unanswered questions count as wrong.":
    "Không có phản hồi cho đến khi nộp bài — sau đó bạn nhận điểm và lời giải cho từng câu. Câu chưa trả lời bị tính là sai.",
  "The timer keeps running if you leave or reload the page, and the test is submitted automatically when it reaches 00:00.":
    "Đồng hồ vẫn chạy khi bạn rời đi hoặc tải lại trang, và bài sẽ tự động được nộp khi về 00:00.",
  Layout: "Cách hiển thị",
  "One at a time": "Từng câu một",
  "One question per screen, with Previous / Next.":
    "Mỗi màn hình một câu, chuyển bằng Câu trước / Câu sau.",
  "All on one page": "Tất cả trên một trang",
  "Every question on one page, like a paper exam. Submit at the bottom.":
    "Mọi câu hỏi trên cùng một trang, như đề thi giấy. Nộp bài ở cuối trang.",
  "Reviewed questions only ({n})": "Chỉ câu hỏi đã duyệt ({n})",
  "Last test": "Lần gần nhất",
  Best: "Tốt nhất",
  "Start test": "Bắt đầu làm bài",
  "Practice with instant feedback instead": "Hoặc luyện tập với phản hồi tức thì",
  "Time left: ": "Thời gian còn lại: ",
  Answered: "Đã trả lời",
  " answered": " đã trả lời",
  Submit: "Nộp bài",
  "Question {n}": "Câu {n}",
  "of {total}": "/ {total}",
  "Flag for review": "Đánh dấu để xem lại",
  ": question {n}": ": câu {n}",
  "Keys act on the question in view: 1–9 select · ←/→ previous / next question · F flag":
    "Phím tắt áp dụng cho câu đang xem: 1–9 chọn · ←/→ câu trước / câu sau · F đánh dấu",
  "Keys: 1–9 select · ←/→ move · F flag": "Phím: 1–9 chọn · ←/→ chuyển câu · F đánh dấu",
  "Keys: ←/→ move · F flag": "Phím: ←/→ chuyển câu · F đánh dấu",
  "Answered {answered} of {total}": "Đã trả lời {answered}/{total}",
  " · {n} flagged": " · {n} đã đánh dấu",
  "Submit test": "Nộp bài",
  Previous: "Câu trước",
  Next: "Câu sau",
  "This does not read as a number.": "Đây không phải là một số hợp lệ.",
  "{n} minute left.": "Còn {n} phút.",
  "{n} minutes left.": "Còn {n} phút.",
  "{n} second left.": "Còn {n} giây.",
  "{n} seconds left.": "Còn {n} giây.",
  Questions: "Câu hỏi",
  "{answered} answered · {unanswered} unanswered · {flagged} flagged":
    "{answered} đã trả lời · {unanswered} chưa trả lời · {flagged} đã đánh dấu",
  "Question {n}, answered": "Câu {n}, đã trả lời",
  "Question {n}, not answered": "Câu {n}, chưa trả lời",
  "Question {n}, answered, flagged": "Câu {n}, đã trả lời, đã đánh dấu",
  "Question {n}, not answered, flagged": "Câu {n}, chưa trả lời, đã đánh dấu",
  Legend: "Chú thích",
  Unanswered: "Chưa trả lời",
  Flagged: "Đã đánh dấu",
  "In view": "Đang xem",
  Current: "Hiện tại",
  "Jump to question": "Chuyển đến câu hỏi",
  "Submit the test?": "Nộp bài kiểm tra?",
  "{n} question is unanswered": "{n} câu chưa trả lời",
  "{n} questions are unanswered": "{n} câu chưa trả lời",
  "{n} is flagged for review": "{n} câu đang được đánh dấu để xem lại",
  "{n} are flagged for review": "{n} câu đang được đánh dấu để xem lại",
  "{first} and {second}.": "{first} và {second}.",
  "Unanswered questions count as wrong.": "Câu chưa trả lời bị tính là sai.",
  "Answers cannot be changed after submitting.": "Sau khi nộp bài, bạn không thể sửa câu trả lời.",
  "Keep working": "Tiếp tục làm bài",
  "Time is up. The test was submitted: {correct} of {total} correct.":
    "Hết giờ. Bài kiểm tra đã được nộp: đúng {correct}/{total} câu.",
  "Test submitted: {correct} of {total} correct.": "Đã nộp bài: đúng {correct}/{total} câu.",
  "Test resumed at question {n} of {total}. The timer kept running.":
    "Tiếp tục bài kiểm tra từ câu {n}/{total}. Đồng hồ vẫn chạy trong lúc bạn rời đi.",
  "This test was submitted in another tab. Its result is in your history.":
    "Bài kiểm tra này đã được nộp ở một tab khác. Kết quả có trong lịch sử của bạn.",
  "This test is open in another tab, so it was closed here. Reload the page to continue it in this tab.":
    "Bài kiểm tra này đang mở ở một tab khác nên đã được đóng ở đây. Tải lại trang để làm tiếp trong tab này.",
  "Time’s up — your test was submitted": "Hết giờ — bài của bạn đã được nộp",
  "Test submitted": "Đã nộp bài",
  "New best": "Kỷ lục mới",
  "Time used {used} of {total}": "Thời gian làm bài {used} / {total}",
  " · {n} not answered": " · {n} câu chưa trả lời",
  " · reviewed questions only": " · chỉ câu hỏi đã duyệt",
  " · best {score}": " · tốt nhất {score}",
  "New test": "Bài kiểm tra mới",
  "Practice this topic": "Luyện tập chủ đề này",
  "Practice this tag": "Luyện tập thẻ này",
  "Jump to a question": "Chuyển đến một câu hỏi",
  "Question {n}: {outcome}": "Câu {n}: {outcome}",
  Incorrect: "Sai",
  "Review your answers": "Xem lại bài làm",
  "Show only incorrect ({n})": "Chỉ hiện câu sai ({n})",
  "Every answer is correct — well done.": "Bạn trả lời đúng tất cả — làm tốt lắm!",

  "CE6146 course questions ({n} here)": "Câu hỏi môn CE6146 ({n} câu ở đây)",
  "Written from the course's lecture slides and in-class exercises.":
    "Soạn từ slide bài giảng và bài tập trên lớp của môn học.",
  "As often as others": "Như các câu khác",
  "More (4×)": "Nhiều hơn (gấp 4)",
  "Mostly (16×)": "Phần lớn (gấp 16)",
  // ------------------------------------------------------------------ mixed test
  "your selection": "lựa chọn của bạn",
  "Practice your mistakes": "Luyện tập câu sai",
  "Practice your mistakes instead": "Hoặc luyện tập các câu sai",
  "No questions selected": "Chưa chọn câu hỏi nào",
  "Random questions from the topics, tags and difficulties you pick, a new set every time. No feedback until you submit; then every answer is explained.":
    "Câu hỏi ngẫu nhiên từ các chủ đề, thẻ và độ khó bạn chọn, mỗi lần một bộ mới. Không có phản hồi cho đến khi nộp bài; sau đó mọi câu đều có lời giải.",
  "{selected} of {total} topics": "{selected}/{total} chủ đề",
  "Select all": "Chọn tất cả",
  Clear: "Bỏ chọn",
  "All of {title}": "Toàn bộ {title}",
  "· optional": "· không bắt buộc",
  "Only questions with at least one of these tags, from the topics above. None chosen: no tag filter.":
    "Chỉ lấy câu hỏi có ít nhất một trong các thẻ này, thuộc các chủ đề ở trên. Không chọn thẻ nào: không lọc theo thẻ.",
  "Chosen tags": "Thẻ đã chọn",
  "Remove tag {tag}": "Bỏ thẻ {tag}",
  "Add a tag": "Thêm thẻ",
  "Search {n} tags": "Tìm trong {n} thẻ",
  Add: "Thêm",
  "Most used:": "Dùng nhiều nhất:",
  Difficulty: "Độ khó",
  Length: "Số câu",
  "Reviewed questions only": "Chỉ câu hỏi đã duyệt",
  "No questions match — pick at least one topic and one difficulty.":
    "Không có câu hỏi phù hợp — hãy chọn ít nhất một chủ đề và một mức độ khó.",
  "No questions match — the chosen tags have none in these topics and difficulties.":
    "Không có câu hỏi phù hợp — các thẻ đã chọn không có câu nào trong các chủ đề và độ khó này.",
  "{pool} match, so this test has {count}.": "Có {pool} phù hợp, nên bài kiểm tra này gồm {count}.",
  "{pool} match; the test draws {n} of them.":
    "Có {pool} phù hợp; bài kiểm tra lấy ngẫu nhiên {n} câu trong số đó.",
  "Last mixed test": "Bài tổng hợp gần nhất",
  "Loading {n} question…": "Đang tải {n} câu hỏi…",
  "Loading {n} questions…": "Đang tải {n} câu hỏi…",
  "Loading questions…": "Đang tải câu hỏi…",
  "Could not load the questions. Check your connection and try again — nothing was started.":
    "Không tải được câu hỏi. Hãy kiểm tra kết nối mạng rồi thử lại — chưa có bài nào được bắt đầu.",
  "Your unfinished mixed test could not be resumed (the site has changed since), so it was closed.":
    "Không thể tiếp tục bài kiểm tra tổng hợp đang dở (trang web đã thay đổi từ đó), nên bài đã được đóng.",
  "Your unfinished mixed test could not be loaded right now. Reload to try again.":
    "Hiện chưa tải được bài kiểm tra tổng hợp đang dở. Hãy tải lại trang để thử lại.",

  // ------------------------------------------------------------------ my mistakes
  "Could not load the questions. Check your connection and try again.":
    "Không tải được câu hỏi. Hãy kiểm tra kết nối mạng rồi thử lại.",
  "← All mistakes": "← Tất cả câu sai",
  "Nothing to revisit": "Không có câu nào cần làm lại",
  "Questions you answer wrong — in practice or in a test — collect here until you get them right.":
    "Những câu bạn trả lời sai — khi luyện tập hay làm bài kiểm tra — được gom ở đây cho đến khi bạn trả lời đúng.",
  "Pick a topic": "Chọn một chủ đề",
  "Take a mixed test": "Làm bài kiểm tra tổng hợp",
  "{n} question to revisit": "{n} câu cần làm lại",
  "{n} questions to revisit": "{n} câu cần làm lại",
  "Your latest answer to these was wrong. Answer one correctly and it leaves the list.":
    "Lần gần nhất bạn trả lời sai những câu này. Trả lời đúng thì câu đó sẽ rời khỏi danh sách.",
  " Rounds take the {n} most recent mistakes.": " Mỗi lượt lấy {n} câu sai gần nhất.",
  "Practice the {n} most recent": "Luyện tập {n} câu gần nhất",
  "Practice all {n}": "Luyện tập cả {n} câu",
  "By topic": "Theo chủ đề",
  "My mistakes: {title}": "Câu sai của tôi: {title}",
  Practice: "Luyện tập",

  // ------------------------------------------------------------------ review (spaced repetition)
  "← Review": "← Ôn tập",
  "Nothing to review yet": "Chưa có gì để ôn tập",
  "Every question you answer — in practice, a test or My mistakes — comes back here just before you would forget it: a wrong one tomorrow, a right one after a growing interval.":
    "Mọi câu bạn trả lời — khi luyện tập, làm bài kiểm tra hay ở mục Câu sai của tôi — sẽ quay lại đây ngay trước khi bạn kịp quên: câu sai vào ngày mai, câu đúng sau một khoảng thời gian ngày càng dài.",
  "{n} question due": "{n} câu đến hạn ôn",
  "{n} questions due": "{n} câu đến hạn ôn",
  "Nothing due today": "Hôm nay không có câu nào đến hạn",
  "Spaced repetition with FSRS: a question returns just before you would forget it. A wrong answer brings it back tomorrow; a right one pushes it further out each time.":
    "Lặp lại ngắt quãng với FSRS: một câu hỏi quay lại ngay trước khi bạn kịp quên. Trả lời sai thì câu đó quay lại vào ngày mai; trả lời đúng thì lần ôn sau được lùi xa hơn.",
  " A round has the {n} most overdue; start another after it.":
    " Mỗi lượt gồm {n} câu quá hạn lâu nhất; xong lượt này hãy bắt đầu lượt khác.",
  "Review {n} now": "Ôn {n} câu ngay",
  "All caught up": "Đã ôn hết",
  "Practise a topic meanwhile": "Trong lúc chờ, hãy luyện tập một chủ đề",
  "Due today": "Đến hạn hôm nay",
  Tomorrow: "Ngày mai",
  "Next 7 days": "7 ngày tới",
  Tracked: "Đang theo dõi",
  "{n} mature (≥ 21 days)": "{n} câu đã vững (≥ 21 ngày)",
  "Due by topic": "Đến hạn theo chủ đề",
  "{n} due": "{n} câu đến hạn",
  "Coming up": "Sắp tới",
  "Questions due per day": "Số câu đến hạn mỗi ngày",
  "{n} due on {day}": "{n} câu đến hạn vào {day}",
  "How easy was it?": "Câu này dễ hay khó?",
  Again: "Lại",
  Hard: "Khó",
  Good: "Tốt",
  Easy: "Dễ",
  "Marked {again}: it comes back tomorrow.": "Đánh giá {again}: câu này sẽ quay lại vào ngày mai.",
  "{n} day": "{n} ngày",
  "{n} days": "{n} ngày",
  "{n} mo": "{n} tháng",
  "{n} yr": "{n} năm",

  // ------------------------------------------------------------------ progress, backup
  "No progress yet": "Chưa có tiến độ",
  "Answer questions or take a test — your results are kept in this browser and summed up here.":
    "Hãy trả lời câu hỏi hoặc làm bài kiểm tra — kết quả được lưu trong trình duyệt này và tổng hợp tại đây.",
  "{p}% of the bank": "{p}% ngân hàng câu hỏi",
  "{p}% of answered": "{p}% số câu đã trả lời",
  "To revisit": "Cần làm lại",
  "Practice them": "Luyện tập ngay",
  "nothing wrong lately": "gần đây không sai câu nào",
  "Recent tests": "Bài kiểm tra gần đây",
  "last 10 per topic, tag or mix": "10 bài gần nhất mỗi chủ đề, thẻ hoặc bài tổng hợp",
  "{done} / {all} answered": "đã trả lời {done}/{all}",
  "Tag and mixed tests": "Bài kiểm tra theo thẻ và tổng hợp",
  "Mixed tests": "Bài kiểm tra tổng hợp",
  Topic: "Chủ đề",
  Test: "Bài kiểm tra",
  Revisit: "Làm lại",
  "Last 10 tests": "10 bài gần nhất",
  "Take one": "Làm thử",
  "Recent test scores: {scores}": "Điểm các bài gần đây: {scores}",
  "Back up or move your progress": "Sao lưu hoặc chuyển tiến độ",
  "Everything lives only in this browser. Export it to a file to keep a copy or to open it on another device; importing merges the file into what is here (the newer answer per question wins), so it never overwrites recent work.":
    "Mọi dữ liệu chỉ nằm trong trình duyệt này. Hãy xuất ra tệp để giữ một bản sao hoặc để mở trên thiết bị khác; khi nhập, tệp được gộp vào dữ liệu hiện có (với mỗi câu hỏi, câu trả lời mới hơn được giữ), nên không bao giờ ghi đè lên kết quả gần đây.",
  "Export progress": "Xuất tiến độ",
  "Import progress…": "Nhập tiến độ…",
  "Saved {file}.": "Đã lưu {file}.",
  "{n} answer": "{n} câu trả lời",
  "{n} answers": "{n} câu trả lời",
  "{n} review card": "{n} thẻ ôn tập",
  "{n} review cards": "{n} thẻ ôn tập",
  "{n} test": "{n} bài kiểm tra",
  "{n} tests": "{n} bài kiểm tra",
  "your settings": "cài đặt của bạn",
  "Imported {what}. Newer progress already here was kept.":
    "Đã nhập {what}. Tiến độ mới hơn sẵn có ở đây được giữ nguyên.",
  "Nothing new in that file — everything in it is already here (or older).":
    "Tệp này không có gì mới — mọi thứ trong đó đã có ở đây (hoặc cũ hơn).",
  "That file could not be read.": "Không đọc được tệp này.",
  "That file is not JSON — choose a file exported from this page.":
    "Tệp này không phải JSON — hãy chọn tệp đã được xuất từ trang này.",
  "That file is not an ml-recall progress file.": "Tệp này không phải tệp tiến độ của ml-recall.",
  "That progress file comes from a newer version of the site.":
    "Tệp tiến độ này đến từ một phiên bản mới hơn của trang.",
  "This browser's storage is full or blocked, so nothing more was saved.":
    "Bộ nhớ của trình duyệt đã đầy hoặc bị chặn, nên không lưu được thêm gì.",
  "This browser blocks storage, so progress can't be saved.":
    "Trình duyệt này chặn bộ nhớ, nên không thể lưu tiến độ.",
};
