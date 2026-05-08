const content = document.querySelector("#content");
const DEFAULT_MARKDOWN_SOURCE = content.dataset.markdownSource || "README.md";
const SOURCE_PARAMS = ["source", "file", "md"];
const ZERO_WIDTH_PREFIX = /^[\u200B\u200C\u200D\u200E\u200F\uFEFF]+/;

const markdown = createMarkdownRenderer();

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    background: "#f8fbf7",
    primaryColor: "#dcefe5",
    primaryTextColor: "#102018",
    primaryBorderColor: "#709b87",
    lineColor: "#507765",
    secondaryColor: "#f7e7bd",
    tertiaryColor: "#edf5ef"
  }
});

async function renderMarkdownDocument() {
  const source = getMarkdownSource();

  content.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load markdown (${response.status})`);
    }

    const rawMarkdown = await response.text();
    const { body, metadata } = parseFrontMatter(rawMarkdown.replace(ZERO_WIDTH_PREFIX, ""));
    const rendered = markdown.render(body);

    content.innerHTML = DOMPurify.sanitize(rendered, {
      ADD_ATTR: ["checked", "data-label", "decoding", "disabled", "loading", "target"],
      ADD_TAGS: ["input", "section"],
      ALLOW_DATA_ATTR: true
    });

    enhanceDocument(content, metadata, source);
    await renderMermaid(content);
  } catch (error) {
    content.innerHTML = `<p class="loading">Unable to load the Markdown document: ${escapeHtml(error.message)}</p>`;
  } finally {
    content.removeAttribute("aria-busy");
  }
}

function createMarkdownRenderer() {
  const renderer = window.markdownit({
    breaks: false,
    html: true,
    linkify: true,
    typographer: true
  });

  if (window.markdownitTaskLists) {
    renderer.use(window.markdownitTaskLists, { enabled: false, label: true, labelAfter: true });
  }

  if (window.markdownitFootnote) {
    renderer.use(window.markdownitFootnote);
  }

  return renderer;
}

function getMarkdownSource() {
  const params = new URLSearchParams(window.location.search);
  const requested = SOURCE_PARAMS.map((key) => params.get(key)).find(Boolean);
  return normalizeSource(requested || DEFAULT_MARKDOWN_SOURCE);
}

function normalizeSource(value) {
  const source = value.trim();

  try {
    const url = new URL(source, window.location.href);
    if (!["http:", "https:"].includes(url.protocol)) {
      return DEFAULT_MARKDOWN_SOURCE;
    }
    return url.href;
  } catch {
    return DEFAULT_MARKDOWN_SOURCE;
  }
}

function parseFrontMatter(markdownText) {
  if (!markdownText.startsWith("---\n")) {
    return { body: markdownText, metadata: {} };
  }

  const end = markdownText.indexOf("\n---", 4);
  if (end === -1) {
    return { body: markdownText, metadata: {} };
  }

  const frontMatter = markdownText.slice(4, end).trim();
  const metadata = {};

  frontMatter.split("\n").forEach((line) => {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (!match) return;

    metadata[match[1].toLowerCase()] = match[2].replace(/^['"]|['"]$/g, "").trim();
  });

  return { body: markdownText.slice(end + 4).trimStart(), metadata };
}

function enhanceDocument(root, metadata, source) {
  document.title = getDocumentTitle(root, metadata, source);

  addHeadingIds(root);
  enhanceLinks(root);
  enhanceMedia(root);
  enhanceCodeBlocks(root);
  enhanceCallouts(root);
  wrapTables(root);
}

function getDocumentTitle(root, metadata, source) {
  const firstHeading = root.querySelector("h1");
  const headingTitle = firstHeading?.textContent.trim();
  return metadata.title || headingTitle || titleFromSource(source);
}

function titleFromSource(source) {
  const pathname = new URL(source, window.location.href).pathname;
  const filename = pathname.split("/").filter(Boolean).pop() || "Markdown document";
  return filename
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function addHeadingIds(root) {
  const seen = new Map();

  root.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading, index) => {
    if (heading.id) return;

    const base = slugify(heading.textContent) || `section-${index + 1}`;
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    heading.id = count ? `${base}-${count + 1}` : base;
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function enhanceLinks(root) {
  root.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    let url;

    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }

    if (["http:", "https:"].includes(url.protocol) && url.origin !== window.location.origin) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  });
}

function enhanceMedia(root) {
  root.querySelectorAll("img").forEach((image) => {
    image.loading ||= "lazy";
    image.decoding = "async";
  });
}

function enhanceCodeBlocks(root) {
  root.querySelectorAll("pre > code[class*='language-']").forEach((code) => {
    const language = [...code.classList]
      .find((className) => className.startsWith("language-"))
      ?.replace("language-", "");

    if (language) {
      code.parentElement.dataset.language = language;
    }
  });
}

function enhanceCallouts(root) {
  root.querySelectorAll("blockquote").forEach((quote) => {
    const firstParagraph = quote.querySelector("p:first-child");
    if (!firstParagraph) return;

    const match = firstParagraph.textContent.trimStart().match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
    if (!match) return;

    quote.classList.add("callout", `callout-${match[1].toLowerCase()}`);
  });
}

function wrapTables(root) {
  root.querySelectorAll("table").forEach((table) => {
    const headers = [...table.querySelectorAll("thead th")].map((header) => header.textContent.trim());
    const columnCount = Math.max(headers.length, table.querySelector("tr")?.children.length || 0);

    table.querySelectorAll("tbody tr").forEach((row) => {
      [...row.children].forEach((cell, index) => {
        cell.dataset.label = headers[index] || `Column ${index + 1}`;
      });
    });

    const wrapper = table.parentElement?.classList.contains("table-wrap")
      ? table.parentElement
      : document.createElement("div");

    wrapper.className = "table-wrap";
    wrapper.dataset.columns = String(columnCount);
    wrapper.style.setProperty("--column-count", columnCount);

    if (columnCount > 4) wrapper.classList.add("is-wide");
    if (columnCount > 7) wrapper.classList.add("is-dense");

    if (table.parentElement !== wrapper) {
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
}

async function renderMermaid(root) {
  const blocks = [...root.querySelectorAll("pre > code.language-mermaid")];
  blocks.forEach((block, index) => {
    const diagram = document.createElement("div");
    diagram.className = "mermaid";
    diagram.id = `mermaid-${index}`;
    diagram.textContent = block.textContent;
    block.parentElement.replaceWith(diagram);
  });

  if (blocks.length > 0) {
    try {
      await mermaid.run({ querySelector: ".mermaid" });
    } catch {
      root.querySelectorAll(".mermaid").forEach((diagram) => {
        diagram.classList.add("mermaid-error");
      });
    }
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

renderMarkdownDocument();
