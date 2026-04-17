import { describe, expect, it, vi } from 'vitest';
import { requestMarkReportRead } from '@/app/reports/[id]/ReportDetailClient';

describe('requestMarkReportRead', () => {
  it('posts to the report read endpoint and returns true on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
    });

    await expect(requestMarkReportRead('report-123', fetchMock as never)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/reports/report-123/read', {
      method: 'POST',
    });
  });

  it('returns false when the request fails or rejects', async () => {
    const failingResponse = vi.fn().mockResolvedValue({ ok: false });
    const rejectedResponse = vi.fn().mockRejectedValue(new Error('network'));

    await expect(requestMarkReportRead('report-123', failingResponse as never)).resolves.toBe(false);
    await expect(requestMarkReportRead('report-123', rejectedResponse as never)).resolves.toBe(false);
  });
});
