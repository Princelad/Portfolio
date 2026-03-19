# Portfolio

Minimal, data-driven personal portfolio website.

## Pages

- `index.html` - Home
- `projects.html` - Projects
- `blogs.html` - Blog list
- `resume.html` - Resume
- `blogs/` - Individual blog post pages

## Data Source

Most content is loaded from:

- `data/content.json`

Update this file to change:

- Profile info
- Social links
- Resume download settings
- Projects
- Blog list

## Resume PDF

Place your resume in:

- `data/Prince-Lad.pdf`

The Resume page download button is populated from `data/content.json`.

## Run Locally

Use any static server from the project root. Example:

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000`

## Notes

- Theme toggle supports light/dark mode and saves preference.
- GitHub profile/projects data is fetched live with fallback to local data.
