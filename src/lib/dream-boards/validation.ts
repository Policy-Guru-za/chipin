export const isDateWithinRange = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const maxDate = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 90);
  return date >= today && date <= maxDate;
};

export const isDeadlineWithinRange = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const maxDate = new Date(tomorrow.getTime() + 1000 * 60 * 60 * 24 * 89);
  return date >= tomorrow && date <= maxDate;
};
