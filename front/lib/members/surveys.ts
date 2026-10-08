/** GET /api/surveys の1件（back/src/survey/read.ts） */
export type Survey = {
	id: string;
	title: string;
	body: string | null;
	/** 回答締切（締切なしは null） */
	closes_at: string | null;
	/** 複数選択できるか */
	allow_multiple: boolean;
	admin_name: string;
	created_at: string;
	is_closed: boolean;
	/** 自分が回答済みか */
	has_responded: boolean;
};

/** アンケートの選択肢 */
export type SurveyOption = {
	id: string;
	label: string;
	sort_order: number;
};

/** GET /api/surveys/:id（一覧の項目に加えて選択肢と自分の回答） */
export type SurveyDetail = Omit<Survey, "has_responded"> & {
	options: SurveyOption[];
	my_response: {
		/** 自分が選んだ選択肢（未回答なら空） */
		option_ids: string[];
		comment: string | null;
	};
};

/** POST /api/surveys/:id/responses のボディ */
export type SurveyResponseInput = {
	option_ids: string[];
	comment?: string;
};
