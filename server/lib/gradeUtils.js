// Auto-calculate letter grade from marks (0-100)
function calculateLetterGrade(marks) {
  if (marks >= 80) return 'O'
  if (marks >= 70) return 'A+'
  if (marks >= 65) return 'A'
  if (marks >= 61) return 'B+'
  if (marks >= 50) return 'B'
  if (marks >= 40) return 'C'
  if (marks >= 35) return 'P'
  return 'F'
}

function gradeToGPA(letterGrade) {
  const scale = {
    'O': 10.0,
    'A+': 9.0,
    'A': 8.0,
    'B+': 7.0,
    'B': 6.0,
    'C': 5.0,
    'P': 4.0,
    'F': 0.0,
  }
  return scale[letterGrade] ?? 0.0
}

// Pass = any grade except F (P grade = bare pass, still passes)
// WHY P is a pass: marks 35-39 means student cleared the minimum
// threshold. Only F means failed.
function getPassStatus(grades) {
  if (!grades.FINAL) return 'PENDING'
  return grades.FINAL.letterGrade === 'F' ? 'FAIL' : 'PASS'
}

module.exports = { calculateLetterGrade, gradeToGPA, getPassStatus }
