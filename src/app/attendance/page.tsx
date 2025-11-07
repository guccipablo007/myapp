'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
// import your other existing imports (supabase, UI components, etc.)

function AttendanceBody() {
  // ✅ This is now safely inside a Suspense boundary
  const search = useSearchParams();
  const meetingId = search.get('meeting') ?? '';

  // ...your existing Attendance logic/UI...
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Attendance</h1>
      {/* Replace this area with your existing attendance table and logic */}
    </main>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading attendance…</div>}>
      <AttendanceBody />
    </Suspense>
  );
}
