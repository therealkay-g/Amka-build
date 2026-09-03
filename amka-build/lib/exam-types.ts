export type ExamCategory = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

export type Exam = {
  id: string;
  category_id: string;
  name: string;
  subcategory: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
};

export type ConsultationExam = {
  id: string;
  consultation_id: string;
  exam_id: string;
  notes: string | null;
  created_at: string;
  exams?: Exam | null;
};

export type ExamCategoryWithExams = ExamCategory & {
  exams: Exam[];
};
