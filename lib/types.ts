export type PublicItem = {
  id: string;
  name: string;
  durationMinutes: number;
  dates: string[];
};

export type PublicCalendar = {
  username: string;
  displayName: string;
  timezone: string;
  dayStart: string;
  dayEnd: string;
  openDates: string[];
  items: PublicItem[];
};

export type EditableCalendar = PublicCalendar & {
  email: string;
  phone: string;
  canEdit: true;
};
