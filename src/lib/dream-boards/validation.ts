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
