// URL'ы для функций бронирования
export const BOOKING_DATA_URL = "https://functions.poehali.dev/1ba4879f-6ecb-439f-9932-ebfc403d529a";
export const BOOKING_TASKS_URL = "https://functions.poehali.dev/74593fae-0349-46e4-ae20-856e28ef91d4";
export const BOOKING_REQUESTS_URL = "https://functions.poehali.dev/c0f0692e-57af-453e-a334-d9619469defc";

// Маппинг action → URL
const ACTION_URL_MAP: Record<string, string> = {
  // booking-data
  venues_list: BOOKING_DATA_URL,
  booked_dates: BOOKING_DATA_URL,
  booking_by_project: BOOKING_DATA_URL,
  bookings_for_organizer: BOOKING_DATA_URL,
  bookings_for_venue: BOOKING_DATA_URL,
  booking_detail: BOOKING_DATA_URL,
  create_missing_chat: BOOKING_DATA_URL,

  // booking-tasks
  booking_tasks: BOOKING_TASKS_URL,
  update_task: BOOKING_TASKS_URL,
  booking_checklist: BOOKING_TASKS_URL,
  update_checklist: BOOKING_TASKS_URL,
  upload_booking_file: BOOKING_TASKS_URL,
  booking_files: BOOKING_TASKS_URL,
  delete_booking_file: BOOKING_TASKS_URL,

  // booking-requests
  request_booking: BOOKING_REQUESTS_URL,
  venue_respond: BOOKING_REQUESTS_URL,
  organizer_respond: BOOKING_REQUESTS_URL,
};

/**
 * Возвращает URL функции для конкретного booking-action.
 * Если action не относится к бронированиям — возвращает null.
 */
export function getBookingUrl(action: string): string | null {
  return ACTION_URL_MAP[action] || null;
}
