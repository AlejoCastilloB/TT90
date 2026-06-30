export type Profile = {
  id: string;
  name: string;
  instagram: string | null;
  email: string | null;
  start_date: string;
  current_streak: number;
  longest_streak: number;
  newsletter_opt_in: boolean;
  created_at: string;
};

export type Objective = {
  id: string;
  profile_id: string;
  slot: number;
  text: string;
};

export type NonNegotiable = {
  id: string;
  profile_id: string;
  name: string;
  icon: string;
  enabled: boolean;
  sort_order: number;
  tracking_type: "days_per_week" | "minutes_per_day" | "custom";
  tracking_value: number | null;
  tracking_custom: string | null;
};

export type DailyLog = {
  id: string;
  profile_id: string;
  log_date: string;
  day_number: number;
  completed_all: boolean;
  closed: boolean;
  journal: string | null;
};

export type DailyLogItem = {
  id: string;
  daily_log_id: string;
  non_negotiable_id: string;
  done: boolean;
  note: string | null;
};

