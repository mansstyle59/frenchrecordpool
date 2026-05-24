import DOMPurify from "dompurify";

// Centralized sanitizer for any admin/CMS-authored HTML rendered via
// dangerouslySetInnerHTML. Strips scripts, event handlers and javascript: URLs.
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS: [
      "a", "p", "br", "span", "div", "strong", "em", "b", "i", "u", "s",
      "ul", "ol", "li", "blockquote", "code", "pre",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "img", "figure", "figcaption", "hr", "small", "sup", "sub",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel", "src", "alt", "class", "style", "width", "height"],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  });
}
