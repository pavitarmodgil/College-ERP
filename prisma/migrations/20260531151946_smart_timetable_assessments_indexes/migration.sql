-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('QUIZ', 'ASSIGNMENT', 'EXAM', 'PROJECT');

-- CreateTable
CREATE TABLE "Assessment" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "semester" TEXT NOT NULL,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assessment_courseId_idx" ON "Assessment"("courseId");

-- CreateIndex
CREATE INDEX "Assessment_dueDate_idx" ON "Assessment"("dueDate");

-- CreateIndex
CREATE INDEX "Assessment_semester_idx" ON "Assessment"("semester");

-- CreateIndex
CREATE INDEX "TimetableEntry_teacherId_idx" ON "TimetableEntry"("teacherId");

-- CreateIndex
CREATE INDEX "TimetableEntry_room_idx" ON "TimetableEntry"("room");

-- CreateIndex
CREATE INDEX "TimetableEntry_semester_idx" ON "TimetableEntry"("semester");

-- CreateIndex
CREATE INDEX "TimetableEntry_dayOfWeek_idx" ON "TimetableEntry"("dayOfWeek");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
