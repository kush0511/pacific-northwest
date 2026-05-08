marked.setOptions({
  gfm: true,
  breaks: false,
  mangle: false,
  headerIds: true
});

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

async function renderReport() {
  const content = document.querySelector("#content");

  try {
    const response = await fetch("deep-research-report.md", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load markdown (${response.status})`);
    }

    const markdown = await response.text();
    const html = marked.parse(markdown);
    content.innerHTML = DOMPurify.sanitize(html, {
      ADD_ATTR: ["target", "loading"],
      ADD_TAGS: ["section"]
    });

    enhanceLinks(content);
    wrapTables(content);
    await renderMermaid(content);
  } catch (error) {
    content.innerHTML = `<p class="loading">Unable to load the trek report: ${error.message}</p>`;
  }
}

function enhanceLinks(root) {
  root.querySelectorAll("a[href^='http']").forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
}

function wrapTables(root) {
  root.querySelectorAll("table").forEach((table) => {
    if (table.parentElement.classList.contains("table-wrap")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrap";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
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
    await mermaid.run({ querySelector: ".mermaid" });
  }
}

renderReport();
