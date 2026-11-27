import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import api from '../../lib/api'

const DAYS_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAY_COLORS = {
  MON: 'bg-primary/10 text-primary',
  TUE: 'bg-secondary/10 text-secondary',
  WED: 'bg-tertiary/10 text-tertiary',
  THU: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  FRI: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SAT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

function emptyRow() {
  return { id: Date.now() + Math.random(), courseId: '', teacherId: '', lecturesPerWeek: 2, rooms: '' }
}

export default function TimetableGeneratorPage() {
  const navigate = useNavigate()

  // Form state
  const [semester, setSemester] = useState('')
  const [rows, setRows] = useState([emptyRow()])

  // Dropdown data
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])

  // Generator state
  const [draft, setDraft] = useState([])       // enriched draft from API
  const [warnings, setWarnings] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [genError, setGenError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/courses?limit=100'),
      api.get('/users?role=TEACHER&limit=100'),
    ]).then(([cRes, uRes]) => {
      setCourses(cRes.data.courses || [])
      setTeachers(uRes.data.users || [])
    }).catch(() => {})
  }, [])

  // ── Row management ───────────────────────────────────────────────────────

  function addRow() {
    setRows((r) => [...r, emptyRow()])
    setDraft([])
    setSaved(false)
  }

  function removeRow(id) {
    setRows((r) => r.filter((row) => row.id !== id))
    setDraft([])
    setSaved(false)
  }

  function updateRow(id, field, value) {
    setRows((r) => r.map((row) => row.id === id ? { ...row, [field]: value } : row))
    setDraft([])
    setSaved(false)
    setGenError('')
  }

  function removeDraftEntry(idx) {
    setDraft((d) => d.filter((_, i) => i !== idx))
  }

  // ── Generate ─────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setGenError('')
    setWarnings([])
    setSaved(false)

    if (!semester.trim()) {
      setGenError('Please enter a semester (e.g. 2026-ODD).')
      return
    }
    for (const row of rows) {
      if (!row.courseId || !row.teacherId) {
        setGenError('Select a course and teacher for every row.')
        return
      }
      if (!row.rooms.trim()) {
        setGenError('Enter at least one room for every row.')
        return
      }
    }

    const requests = rows.map((r) => ({
      courseId: parseInt(r.courseId),
      teacherId: parseInt(r.teacherId),
      lecturesPerWeek: parseInt(r.lecturesPerWeek) || 2,
      rooms: r.rooms.split(',').map((s) => s.trim()).filter(Boolean),
    }))

    setIsGenerating(true)
    try {
      const { data } = await api.post('/timetable/generate', { semester: semester.trim(), requests })
      setDraft(data.draft || [])
      setWarnings(data.warnings || [])
      if ((data.draft || []).length === 0) {
        setGenError('No slots could be found — try adding more rooms or reducing lectures per week.')
      }
    } catch (err) {
      setGenError(err.response?.data?.error || 'Generation failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (draft.length === 0) return
    setSaveError('')
    setIsSaving(true)
    try {
      await api.post('/timetable/bulk', { entries: draft })
      setSaved(true)
      setDraft([])
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Save failed.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const teacherLabel = (t) => {
    const name = t.firstName ? `${t.firstName}${t.lastName ? ' ' + t.lastName : ''}` : t.email
    return `${name} (${t.teacherId})`
  }

  return (
    <div className="flex min-h-screen bg-background dark:bg-neutral-950">
      <Sidebar />
      <main className="ml-16 md:ml-64 flex-1 p-6 md:p-10 space-y-10">

        {/* Header */}
        <header>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate('/admin/timetable')}
              className="p-2 rounded-xl hover:bg-surface-container-low dark:hover:bg-neutral-800 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-extrabold">Admin · Timetable</p>
              <h2 className="text-3xl font-extrabold font-headline tracking-tight">Auto Timetable Generator</h2>
            </div>
          </div>
          <p className="text-on-surface-variant text-sm ml-11">
            Configure courses, teachers, and rooms — the algorithm distributes lectures across the week avoiding all conflicts.
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

          {/* ── Left: Configuration form ── */}
          <div className="bg-surface-container-lowest dark:bg-neutral-900 rounded-2xl p-8 space-y-6">
            <h3 className="font-bold font-headline text-xl">Configuration</h3>

            {/* Semester */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Semester
              </label>
              <input
                type="text"
                value={semester}
                onChange={(e) => { setSemester(e.target.value); setDraft([]); setSaved(false) }}
                placeholder="e.g. 2026-ODD"
                className="w-full px-4 py-3 bg-surface-container-high dark:bg-neutral-800 border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none"
              />
            </div>

            {/* Rows */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Course–Teacher assignments
                </label>
                <button
                  onClick={addRow}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-primary-container text-on-primary rounded-lg hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Row
                </button>
              </div>

              {rows.map((row, idx) => (
                <div key={row.id} className="bg-surface-container-low dark:bg-neutral-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface-variant">Row {idx + 1}</span>
                    {rows.length > 1 && (
                      <button
                        onClick={() => removeRow(row.id)}
                        className="p-1 text-error hover:bg-error-container/30 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>

                  {/* Course */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Course</label>
                    <select
                      value={row.courseId}
                      onChange={(e) => updateRow(row.id, 'courseId', e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-container-lowest dark:bg-neutral-900 border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none"
                    >
                      <option value="">Select course…</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Teacher */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Teacher</label>
                    <select
                      value={row.teacherId}
                      onChange={(e) => updateRow(row.id, 'teacherId', e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-container-lowest dark:bg-neutral-900 border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none"
                    >
                      <option value="">Select teacher…</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>{teacherLabel(t)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Lectures per week + Rooms */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Lectures / week
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={row.lecturesPerWeek}
                        onChange={(e) => updateRow(row.id, 'lecturesPerWeek', e.target.value)}
                        className="w-full px-3 py-2.5 bg-surface-container-lowest dark:bg-neutral-900 border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Rooms (comma-sep.)
                      </label>
                      <input
                        type="text"
                        value={row.rooms}
                        onChange={(e) => updateRow(row.id, 'rooms', e.target.value)}
                        placeholder="CSE-LH-1, LAB-1"
                        className="w-full px-3 py-2.5 bg-surface-container-lowest dark:bg-neutral-900 border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Error */}
            {genError && (
              <div className="flex items-center gap-2 bg-error-container/30 text-error px-4 py-3 rounded-xl text-sm">
                <span className="material-symbols-outlined text-base">error</span>
                {genError}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
            >
              {isGenerating
                ? <><span className="material-symbols-outlined animate-spin text-base">progress_activity</span> Generating…</>
                : <><span className="material-symbols-outlined text-base">auto_awesome</span> Generate Timetable</>}
            </button>
          </div>

          {/* ── Right: Draft preview ── */}
          <div className="space-y-6">

            {/* How it works info */}
            {draft.length === 0 && !saved && (
              <div className="bg-surface-container-lowest dark:bg-neutral-900 rounded-2xl p-8">
                <h3 className="font-bold font-headline text-xl mb-4">How it works</h3>
                <ol className="space-y-3 text-sm text-on-surface-variant">
                  {[
                    'Fill in the semester and add one row per course-teacher pair.',
                    'The algorithm distributes lectures across MON–SAT, avoiding all teacher, room, and course conflicts.',
                    'A draft preview appears here — remove any entries you don\'t want.',
                    'Click "Save to Timetable" to commit. Existing entries are never overwritten.',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="mt-6 p-4 bg-surface-container-low dark:bg-neutral-800 rounded-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Time slots the algorithm uses</p>
                  <div className="flex flex-wrap gap-2">
                    {['08:00–09:00','09:00–10:00','10:00–11:00','11:00–12:00','14:00–15:00','15:00–16:00','16:00–17:00'].map(s => (
                      <span key={s} className="px-2 py-1 bg-surface-container-lowest dark:bg-neutral-900 rounded-lg text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Saved confirmation */}
            {saved && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 flex items-center gap-4">
                <span className="material-symbols-outlined text-emerald-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <div>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">Timetable saved successfully!</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
                    <button onClick={() => navigate('/admin/timetable')} className="underline font-bold">Go to Timetable</button>
                    {' '}to view the new entries.
                  </p>
                </div>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">Partial scheduling warnings</p>
                {warnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-700 dark:text-amber-400 flex gap-2">
                    <span className="material-symbols-outlined text-base flex-shrink-0">warning</span>
                    {w}
                  </p>
                ))}
              </div>
            )}

            {/* Draft table */}
            {draft.length > 0 && (
              <div className="bg-surface-container-lowest dark:bg-neutral-900 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/10 dark:border-neutral-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold font-headline text-lg">Draft Preview</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {draft.length} entr{draft.length === 1 ? 'y' : 'ies'} · Remove unwanted rows before saving
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-surface-container-low dark:bg-neutral-800 rounded-xl hover:bg-surface-container-high transition-colors disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                      Regenerate
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || draft.length === 0}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-primary-container text-on-primary rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      {isSaving
                        ? <><span className="material-symbols-outlined animate-spin text-base">progress_activity</span> Saving…</>
                        : <><span className="material-symbols-outlined text-base">save</span> Save to Timetable</>}
                    </button>
                  </div>
                </div>

                {saveError && (
                  <div className="mx-6 mt-4 flex items-center gap-2 bg-error-container/30 text-error px-4 py-3 rounded-xl text-sm">
                    <span className="material-symbols-outlined text-base">error</span>
                    {saveError}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low dark:bg-neutral-800">
                        {['Course', 'Teacher', 'Day', 'Time', 'Room', ''].map((h) => (
                          <th key={h} className="px-5 py-3 text-[10px] font-extrabold text-outline uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container dark:divide-neutral-800">
                      {[...draft].sort((a, b) => {
                        const di = DAYS_ORDER.indexOf(a.dayOfWeek) - DAYS_ORDER.indexOf(b.dayOfWeek)
                        return di !== 0 ? di : a.startTime.localeCompare(b.startTime)
                      }).map((e, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-low/50 dark:hover:bg-neutral-800/50">
                          <td className="px-5 py-3">
                            <p className="text-sm font-bold">{e.course?.name || e.courseId}</p>
                            <p className="text-xs text-on-surface-variant">{e.course?.code}</p>
                          </td>
                          <td className="px-5 py-3 text-sm">
                            {e.teacher?.firstName
                              ? `${e.teacher.firstName} ${e.teacher.lastName || ''}`
                              : e.teacher?.email || e.teacherId}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${DAY_COLORS[e.dayOfWeek] || ''}`}>
                              {e.dayOfWeek}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm font-medium">{e.startTime} – {e.endTime}</td>
                          <td className="px-5 py-3 text-sm">{e.room}</td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => removeDraftEntry(draft.indexOf(e))}
                              className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-lg transition-colors"
                              title="Remove this entry"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
