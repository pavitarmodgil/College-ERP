// Per-course risk row for the student dashboard: the rule-based attendance band
// (always shown) and, when the server has ML_RISK_ENABLED on, the experimental
// ML at-risk estimate (roadmap FUT-1) beside it.
//
// `mlInfo` is the response-level `mlRisk` block from GET /timetable/insights and
// is undefined when the flag is off. Then the ML badge is not rendered at all.

const ATTENDANCE_STYLES = {
  SAFE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  WARNING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  CRITICAL: 'bg-error-container text-error dark:bg-red-900/30 dark:text-red-300',
}

const ML_STYLES = {
  LOW: 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300',
  MODERATE: 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300',
  HIGH: 'border-red-300 text-error dark:border-red-800 dark:text-red-300',
}

const BAND_LABEL = { LOW: 'Low', MODERATE: 'Moderate', HIGH: 'High' }

export function AttendanceBandChip({ attendance }) {
  if (!attendance) return null
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-3 py-1 rounded-full tracking-wider uppercase ${ATTENDANCE_STYLES[attendance.riskLevel] || ATTENDANCE_STYLES.SAFE}`}
      title="Rule-based attendance band (≥75% safe · 65–74% warning · <65% critical)"
    >
      <span className="material-symbols-outlined text-[14px] leading-none">rule</span>
      Attendance {attendance.riskLevel.toLowerCase()}
    </span>
  )
}

export default function MlRiskBadge({ risk, mlInfo, courseCode }) {
  // Flag off, or the server couldn't score: show nothing (rule-based band remains).
  if (!mlInfo || !risk || risk.status === 'UNAVAILABLE') return null

  const tooltipId = `ml-risk-tip-${courseCode}`
  const ok = risk.status === 'OK'
  const pct = ok ? Math.round(risk.probability * 100) : null

  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        aria-describedby={tooltipId}
        className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full tracking-wider uppercase border border-dashed bg-surface-container-lowest dark:bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          ok ? ML_STYLES[risk.band] : 'border-slate-300 text-slate-500 dark:border-neutral-600 dark:text-neutral-400'
        }`}
      >
        <span className="material-symbols-outlined text-[14px] leading-none">science</span>
        ML risk estimate
        <span className="opacity-80">·</span>
        {ok ? `${BAND_LABEL[risk.band]} ${pct}%` : 'Not enough data'}
        <span className="material-symbols-outlined text-[14px] leading-none opacity-70">info</span>
      </button>

      <span
        id={tooltipId}
        role="tooltip"
        className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity absolute left-0 top-full mt-2 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-on-surface dark:bg-neutral-800 text-white text-xs font-medium normal-case tracking-normal p-4 shadow-2xl space-y-2"
      >
        {ok ? (
          <>
            <span className="block">
              Estimated chance of finishing this course below 40 marks, from your attendance and
              internal / mid-term marks.
              {risk.finalGraded && ' Your final is already graded, so this is for comparison only.'}
            </span>
            {risk.factors?.length > 0 && (
              <span className="block">
                <span className="block font-bold mb-1">Biggest factors</span>
                {risk.factors.map((f) => (
                  <span key={f.feature} className="flex justify-between gap-3">
                    <span>{f.label} ({f.value})</span>
                    <span className={`whitespace-nowrap ${f.direction === 'raises' ? 'text-red-300' : 'text-emerald-300'}`}>
                      {f.direction === 'raises' ? '▲ raises' : '▼ lowers'}
                    </span>
                  </span>
                ))}
              </span>
            )}
          </>
        ) : (
          <span className="block">Needs {risk.missing?.join(', ') || 'more data'} before an estimate can be made.</span>
        )}
        <span className="block text-white/70">
          {mlInfo.model ? `${mlInfo.model}, trained mainly on ${mlInfo.trainedOn} data and not calibrated on this university's records. ` : ''}
          <span className="font-bold text-white">{mlInfo.disclaimer || 'Experimental decision support, not a grade'}.</span>
        </span>
      </span>
    </span>
  )
}
