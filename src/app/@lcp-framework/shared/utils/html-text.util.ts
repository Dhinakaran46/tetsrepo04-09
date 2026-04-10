export function htmlToPlainText(html: string): string {
  if (!html) return '';

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('script, style, noscript').forEach((el) => el.remove());

    const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr', 'br'];

    blockTags.forEach((tag) => {
      doc.querySelectorAll(tag).forEach((el) => {
        if (tag === 'br') {
          el.replaceWith('\n');
        } else {
          el.insertAdjacentText('beforebegin', '\n');
          el.insertAdjacentText('afterend', '\n');
        }
      });
    });

    let text = doc.body.textContent || '';

    return text
      .replace(/\u00A0/g, ' ')
      .replace(/\n+/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  } catch (e) {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n+/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }
}
