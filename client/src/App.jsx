import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AdminDashboard from './pages/AdminDashboard'
import UsersPage from './pages/admin/UsersPage'
import CoursesPage from './pages/admin/CoursesPage'
import TeacherDashboard from './pages/TeacherDashboard'
import TeacherAttendancePage from './pages/teacher/TeacherAttendancePage'
import AttendanceSessionPage from './pages/teacher/AttendanceSessionPage'
import TeacherGradesPage from './pages/teacher/TeacherGradesPage'
import GradeEntryPage from './pages/teacher/GradeEntryPage'
import StudentDashboard from './pages/StudentDashboard'
import StudentAttendancePage from './pages/student/StudentAttendancePage'
import StudentGradesPage from './pages/student/StudentGradesPage'
import AdminAnnouncementsPage from './pages/admin/AnnouncementsPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import AdminTimetablePage from './pages/admin/TimetablePage'
import TeacherTimetablePage from './pages/teacher/TeacherTimetablePage'
import StudentTimetablePage from './pages/student/StudentTimetablePage'
import StudentProfilePage from './pages/admin/StudentProfilePage'
import DepartmentsPage from './pages/admin/DepartmentsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected — role-specific */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <CoursesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRole="TEACHER">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/attendance"
            element={
              <ProtectedRoute allowedRole="TEACHER">
                <TeacherAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/attendance/:courseId"
            element={
              <ProtectedRoute allowedRole="TEACHER">
                <AttendanceSessionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRole="STUDENT">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/attendance"
            element={
              <ProtectedRoute allowedRole="STUDENT">
                <StudentAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/grades"
            element={
              <ProtectedRoute allowedRole="TEACHER">
                <TeacherGradesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/grades/:courseId"
            element={
              <ProtectedRoute allowedRole="TEACHER">
                <GradeEntryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/grades"
            element={
              <ProtectedRoute allowedRole="STUDENT">
                <StudentGradesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users/:id/profile"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <StudentProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <DepartmentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/announcements"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <AdminAnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/announcements"
            element={
              <ProtectedRoute allowedRole="TEACHER">
                <AnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/announcements"
            element={
              <ProtectedRoute allowedRole="STUDENT">
                <AnnouncementsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/timetable"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <AdminTimetablePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/timetable"
            element={
              <ProtectedRoute allowedRole="TEACHER">
                <TeacherTimetablePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/timetable"
            element={
              <ProtectedRoute allowedRole="STUDENT">
                <StudentTimetablePage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
