export interface PublishReportInput {
  title: string;
  markdown: string;
  day: string;
  topicName?: string | null;
  reportId: string;
  runId: string;
}

export interface PublishReportResult {
  published: boolean;
  skipped: boolean;
  pageId: string | null;
  url: string | null;
  error: string | null;
}

function markdownToParagraphBlocks(markdown: string): Array<Record<string, unknown>> {
  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 40);

  return lines.map((line) => ({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: line.slice(0, 1800),
          },
        },
      ],
    },
  }));
}

export async function publishReportToNotion(
  input: PublishReportInput,
): Promise<PublishReportResult> {
  const token = process.env.NOTION_API_TOKEN;
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

  if (!token || !parentPageId) {
    return {
      published: false,
      skipped: true,
      pageId: null,
      url: null,
      error: 'NOTION_NOT_CONFIGURED',
    };
  }

  const notionVersion = '2022-06-28';
  const title = `${input.title} (${input.day})`;

  const payload = {
    parent: { page_id: parentPageId },
    properties: {
      title: {
        title: [
          {
            type: 'text',
            text: { content: title.slice(0, 200) },
          },
        ],
      },
    },
    children: markdownToParagraphBlocks(input.markdown),
  };

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': notionVersion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        published: false,
        skipped: false,
        pageId: null,
        url: null,
        error: `NOTION_PUBLISH_FAILED:${response.status}:${body.slice(0, 200)}`,
      };
    }

    const json = (await response.json()) as { id?: string; url?: string };
    return {
      published: true,
      skipped: false,
      pageId: json.id ?? null,
      url: json.url ?? null,
      error: null,
    };
  } catch (error) {
    return {
      published: false,
      skipped: false,
      pageId: null,
      url: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
