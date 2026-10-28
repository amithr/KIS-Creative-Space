-- The student site no longer has a per-student tracker or cancel: students
-- follow their job on the public ON THE PRINTERS board and ask the studio to
-- withdraw it. Anonymous deletes are therefore no longer needed, so the policy
-- that let the anon key delete any RECEIVED row goes. Admin deletes still run
-- through the service role (web) or a teacher session (Flutter).
drop policy if exists "Students can cancel received print requests" on public.print_requests;
