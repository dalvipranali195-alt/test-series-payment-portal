export function paperCheckerTotal(
  studentCount: number,
  perPaperPrice: number,
  answerKeyPrice: number
) {
  return studentCount * perPaperPrice + answerKeyPrice;
}

export function supervisorTotal(studentCount: number, rate: number) {
  return studentCount * rate;
}

export function openDayTotal(quantity: number, rate: number) {
  return quantity * rate;
}
