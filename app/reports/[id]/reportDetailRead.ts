export async function requestMarkReportRead(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetchImpl(`/api/reports/${id}/read`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}
