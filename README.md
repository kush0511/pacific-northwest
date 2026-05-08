# Static Markdown Renderer

Static GitHub Pages site that loads a Markdown file in the browser and renders it as a responsive document.

The default source is configured in `index.html` with `data-markdown-source="content.md"`. You can also render another Markdown file with `?source=path/to/file.md`, `?file=path/to/file.md`, or `?md=path/to/file.md`.

## Local preview

```sh
python3 -m http.server 4173
```

Then open <http://127.0.0.1:4173/>.

## GitHub Pages

This repo includes a GitHub Actions workflow at `.github/workflows/pages.yml`. After pushing the `main` branch to GitHub, enable Pages for the repository with **GitHub Actions** as the source. The workflow will publish the static site from the repository root.
