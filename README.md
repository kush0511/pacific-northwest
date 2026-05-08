# Pacific Northwest Autumn Treks

Static GitHub Pages site for `deep-research-report.md`.

## Local preview

```sh
python3 -m http.server 4173
```

Then open <http://127.0.0.1:4173/>.

## GitHub Pages

This repo includes a GitHub Actions workflow at `.github/workflows/pages.yml`. After pushing the `main` branch to GitHub, enable Pages for the repository with **GitHub Actions** as the source. The workflow will publish the static site from the repository root.
