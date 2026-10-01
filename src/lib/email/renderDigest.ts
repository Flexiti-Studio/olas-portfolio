import { NewsEvent } from "@prisma/client";

export function renderDigest(events: NewsEvent[]): string {
  // Sort events by score descending and take top 10
  const topEvents = [...events]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getScoreColor = (score: number) => {
    if (score > 70) return "#22c55e"; // green
    if (score >= 40) return "#eab308"; // yellow
    return "#6b7280"; // gray
  };

  const formatCatalystType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const rows = topEvents
    .map(
      (event) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; vertical-align: top;">
        ${event.ticker}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
        <span style="display: inline-block; padding: 4px 8px; border-radius: 9999px; font-size: 12px; font-weight: bold; color: white; background-color: ${getScoreColor(
          event.score
        )};">
          ${event.score.toFixed(1)}
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 14px; color: #4b5563;">
        ${formatCatalystType(event.catalystType)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 14px;">
        <a href="${event.sourceUrl}" style="color: #2563eb; text-decoration: none; font-weight: 500;">
          ${event.headline}
        </a>
        <div style="margin-top: 4px; color: #6b7280; font-size: 13px;">
          ${event.summary}
        </div>
      </td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Trading Digest</title>
      </head>
      <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827;">
        <div style="max-width: 800px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="padding: 24px; background-color: #1e3a8a; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Trading Digest</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">${today}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6;">Ticker</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6;">Score</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6;">Catalyst</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6;">Headline</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div style="padding: 24px; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">Automated trading digest.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
