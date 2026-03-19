const DATA_PATH = "data/content.json";
const THEME_KEY = "theme";
const GITHUB_USERNAME = "Princelad";
const GITHUB_REPOS_LIMIT = 100;

const githubApiCache = {
    username: null,
    user: null,
    repos: null
};

function getStoredTheme() {
    try {
        const value = localStorage.getItem(THEME_KEY);
        return value === "dark" || value === "light" ? value : null;
    } catch {
        return null;
    }
}

function setStoredTheme(theme) {
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {
        // Ignore storage errors so theme switching still works in memory.
    }
}

function getPreferredTheme() {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
        return storedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
}

function updateThemeToggleLabel(toggleButton, theme) {
    if (!toggleButton) {
        return;
    }
    const isDark = theme === "dark";
    const iconEl = toggleButton.querySelector(".theme-toggle-icon");
    if (iconEl) {
        iconEl.textContent = isDark ? "light_mode" : "dark_mode";
    }
    toggleButton.setAttribute("aria-pressed", String(isDark));
    toggleButton.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    toggleButton.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
}

function initThemeToggle() {
    const toggleButton = document.querySelector("#theme-toggle");
    const initialTheme = getPreferredTheme();

    applyTheme(initialTheme);
    updateThemeToggleLabel(toggleButton, initialTheme);

    if (toggleButton) {
        toggleButton.addEventListener("click", () => {
            const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
            const nextTheme = currentTheme === "dark" ? "light" : "dark";
            applyTheme(nextTheme);
            setStoredTheme(nextTheme);
            updateThemeToggleLabel(toggleButton, nextTheme);
        });
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", (event) => {
            if (getStoredTheme()) {
                return;
            }
            const nextTheme = event.matches ? "dark" : "light";
            applyTheme(nextTheme);
            updateThemeToggleLabel(toggleButton, nextTheme);
        });
    }
}

function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value : fallback;
}

function renderLoadingCard(count = 1) {
    return Array.from({ length: count })
        .map(
            () => `
            <article class="loading-item" aria-hidden="true">
                <div class="loading-line loading-line-title"></div>
                <div class="loading-line loading-line-body"></div>
                <div class="loading-line loading-line-body"></div>
            </article>`
        )
        .join("");
}

function applyInitialLoadingState() {
    const nameEl = document.querySelector("#profile-name");
    const positionEl = document.querySelector("#profile-position");
    const bioEl = document.querySelector("#profile-bio");

    const githubContrib = document.querySelector("#github-contrib");
    const githubStars = document.querySelector("#github-stars");
    const githubStreak = document.querySelector("#github-streak");

    const featuredProjects = document.querySelector("#featured-projects");
    const featuredBlogs = document.querySelector("#featured-blogs");
    const projectsList = document.querySelector("#projects-list");
    const blogsList = document.querySelector("#blogs-list");

    if (nameEl && !nameEl.textContent.trim()) {
        nameEl.textContent = "Loading profile...";
    }
    if (positionEl && !positionEl.textContent.trim()) {
        positionEl.textContent = "";
    }
    if (bioEl && !bioEl.textContent.trim()) {
        bioEl.textContent = "Fetching latest profile details.";
    }

    if (githubContrib && !githubContrib.textContent.trim()) {
        githubContrib.textContent = "Loading GitHub stats...";
    }
    if (githubStars && !githubStars.textContent.trim()) {
        githubStars.textContent = "";
    }
    if (githubStreak && !githubStreak.textContent.trim()) {
        githubStreak.textContent = "";
    }

    if (featuredProjects && !featuredProjects.textContent.trim()) {
        featuredProjects.innerHTML = renderLoadingCard(2);
    }
    if (featuredBlogs && !featuredBlogs.textContent.trim()) {
        featuredBlogs.innerHTML = renderLoadingCard(2);
    }
    if (projectsList && !projectsList.textContent.trim()) {
        projectsList.innerHTML = renderLoadingCard(3);
    }
    if (blogsList && !blogsList.textContent.trim()) {
        blogsList.innerHTML = renderLoadingCard(2);
    }
}

function applyLoadFailureState() {
    const projectsList = document.querySelector("#projects-list");
    const blogsList = document.querySelector("#blogs-list");
    const featuredProjects = document.querySelector("#featured-projects");
    const featuredBlogs = document.querySelector("#featured-blogs");

    if (featuredProjects) {
        featuredProjects.innerHTML = '<article class="preview-item"><p>Unable to load projects right now.</p></article>';
    }
    if (featuredBlogs) {
        featuredBlogs.innerHTML = '<article class="preview-item"><p>Unable to load blogs right now.</p></article>';
    }
    if (projectsList) {
        projectsList.innerHTML = '<article class="list-item"><div><p>Unable to load projects right now.</p></div></article>';
    }
    if (blogsList) {
        blogsList.innerHTML = '<article class="list-item"><div><p>Unable to load blogs right now.</p></div></article>';
    }
}

async function loadLocalContentData() {
    const cacheBust = Date.now();
    const candidates = [
        `${DATA_PATH}?v=${cacheBust}`,
        `./${DATA_PATH}?v=${cacheBust}`,
        `../${DATA_PATH}?v=${cacheBust}`
    ];

    for (const path of candidates) {
        try {
            const response = await fetch(path, { cache: "no-store" });
            if (response.ok) {
                return await response.json();
            }
        } catch {
            // Try the next path candidate.
        }
    }

    throw new Error("Could not load local content data");
}

function isExternalUrl(url) {
    return /^https?:\/\//i.test(safeText(url));
}

function buildLinkAttributes(url) {
    if (isExternalUrl(url)) {
        return 'target="_blank" rel="noopener noreferrer"';
    }
    return "";
}

function formatDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return "Unknown date";
    }
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

async function fetchGithubLiveTelemetry(username) {
    if (!safeText(username)) {
        return null;
    }

    try {
        const githubData = await fetchGithubApiData(username);
        if (!githubData) {
            return null;
        }

        const { user, repos } = githubData;
        const stars = Array.isArray(repos)
            ? repos.reduce((sum, repo) => sum + (Number(repo?.stargazers_count) || 0), 0)
            : null;

        return {
            username: safeText(user.login, username),
            publicRepos: Number(user.public_repos) || 0,
            followers: Number(user.followers) || 0,
            stars,
            graphImage: `https://ghchart.rshah.org/0f766e/${encodeURIComponent(safeText(user.login, username))}`
        };
    } catch {
        return null;
    }
}

async function fetchGithubApiData(username) {
    const normalizedUsername = safeText(username);
    if (!normalizedUsername) {
        return null;
    }

    if (
        githubApiCache.username === normalizedUsername &&
        githubApiCache.user &&
        Array.isArray(githubApiCache.repos)
    ) {
        return {
            user: githubApiCache.user,
            repos: githubApiCache.repos
        };
    }

    const [userResponse, reposResponse] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(normalizedUsername)}`),
        fetch(
            `https://api.github.com/users/${encodeURIComponent(normalizedUsername)}/repos?per_page=${GITHUB_REPOS_LIMIT}&type=owner&sort=updated`
        )
    ]);

    if (!userResponse.ok || !reposResponse.ok) {
        return null;
    }

    const user = await userResponse.json();
    const repos = await reposResponse.json();
    if (!Array.isArray(repos)) {
        return null;
    }

    githubApiCache.username = normalizedUsername;
    githubApiCache.user = user;
    githubApiCache.repos = repos;

    return { user, repos };
}

function mapGithubRepoToProject(repo) {
    const language = safeText(repo?.language);
    const topics = Array.isArray(repo?.topics)
        ? repo.topics.filter((topic) => safeText(topic)).slice(0, 2)
        : [];

    const stack = [language, ...topics]
        .filter(Boolean)
        .map((item) => String(item));

    return {
        title: safeText(repo?.name, "Untitled repository"),
        description: safeText(repo?.description, "GitHub repository."),
        stack,
        featured: false,
        url: safeText(repo?.html_url, "#"),
        stars: Number(repo?.stargazers_count) || 0,
        fromGithub: true
    };
}

async function enrichGithubProjects(data) {
    const localProjects = Array.isArray(data.projects) ? data.projects : [];
    const telemetry = data.telemetry || {};
    const github = telemetry.github || {};
    const username = safeText(github.username, GITHUB_USERNAME);

    try {
        const githubData = await fetchGithubApiData(username);
        if (!githubData) {
            return data;
        }

        const githubProjects = githubData.repos
            .filter((repo) => !repo?.fork)
            .map(mapGithubRepoToProject)
            .sort((a, b) => b.stars - a.stars);

        if (!githubProjects.length) {
            return data;
        }

        const featuredGithubTitles = new Set(
            githubProjects
                .slice(0, 3)
                .map((project) => project.title.toLowerCase())
        );

        const normalizedLocalTitles = new Set(
            localProjects.map((project) => safeText(project.title).toLowerCase()).filter(Boolean)
        );

        const dedupedGithubProjects = githubProjects
            .filter((project) => !normalizedLocalTitles.has(project.title.toLowerCase()))
            .map((project) => ({
                ...project,
                featured: featuredGithubTitles.has(project.title.toLowerCase())
            }));

        data.projects = [...dedupedGithubProjects, ...localProjects];
        return data;
    } catch {
        return data;
    }
}

async function enrichGithubTelemetry(data) {
    const telemetry = data.telemetry || {};
    const github = telemetry.github || {};
    const username = safeText(github.username, GITHUB_USERNAME);
    const live = await fetchGithubLiveTelemetry(username);

    if (!live) {
        return data;
    }

    data.telemetry = {
        ...telemetry,
        github: {
            ...github,
            username: live.username,
            publicRepos: live.publicRepos,
            followers: live.followers,
            stars: live.stars ?? github.stars,
            graphImage: live.graphImage,
            isLive: true
        }
    };

    return data;
}

function renderProfile(data) {
    const profile = data.profile || {};
    const nameEl = document.querySelector("#profile-name");
    const positionEl = document.querySelector("#profile-position");
    const bioEl = document.querySelector("#profile-bio");
    const linksEl = document.querySelector("#profile-links");

    if (nameEl) {
        nameEl.textContent = safeText(profile.name, "Prince Lad");
    }
    if (positionEl) {
        positionEl.textContent = safeText(profile.position, "Software Development Engineer");
    }
    if (bioEl) {
        bioEl.textContent = safeText(
            profile.bio,
            "I build practical, fast-moving products that solve real user problems."
        );
    }

    if (linksEl) {
        const social = profile.social || {};
        const linkItems = [
            { label: "GitHub", url: safeText(social.github) },
            { label: "X", url: safeText(social.x) },
            { label: "LinkedIn", url: safeText(social.linkedin) }
        ].filter((item) => item.url);

        linksEl.innerHTML = linkItems
            .map((item) => `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.label}</a>`)
            .join("");
    }
}

function renderTelemetry(data) {
    const telemetry = data.telemetry || {};
    const github = telemetry.github || {};
    const githubUsername = safeText(github.username, GITHUB_USERNAME);

    const githubContrib = document.querySelector("#github-contrib");
    const githubStars = document.querySelector("#github-stars");
    const githubStreak = document.querySelector("#github-streak");
    const githubGraph = document.querySelector("#github-graph");
    const githubProfileLink = document.querySelector("#github-profile-link");

    if (githubContrib) {
        if (github.isLive) {
            githubContrib.textContent = `${github.publicRepos || 0} public repos`;
        } else {
            githubContrib.textContent = `${github.contributionsLastYear || 0} contributions last year`;
        }
    }
    if (githubStars) {
        if (github.isLive) {
            githubStars.textContent = `${github.stars || 0} total stars`;
        } else {
            githubStars.textContent = `${github.stars || 0} stars`;
        }
    }
    if (githubStreak) {
        if (github.isLive) {
            githubStreak.textContent = `${github.followers || 0} followers`;
        } else {
            githubStreak.textContent = `${github.streakDays || 0}-day streak`;
        }
    }
    if (githubGraph && safeText(github.graphImage)) {
        githubGraph.src = github.graphImage;
        githubGraph.alt = `GitHub contribution graph for ${githubUsername}`;
    }
    if (githubProfileLink) {
        githubProfileLink.href = `https://github.com/${encodeURIComponent(githubUsername)}`;
    }
}

function renderFeaturedProjects(data) {
    const mount = document.querySelector("#featured-projects");
    if (!mount) {
        return;
    }

    const featured = (data.projects || []).filter((item) => item.featured).slice(0, 3);
    mount.innerHTML = featured
        .map(
            (item) => `
			<article class="preview-item">
				<h3>${safeText(item.title, "Untitled project")}</h3>
				<p>${safeText(item.description, "No description available.")}</p>
				${safeText(item.url) && item.url !== "#"
                    ? `<p><a href="${item.url}" target="_blank" rel="noopener noreferrer">View on GitHub</a></p>`
                    : ""}
			</article>`
        )
        .join("");
}

function renderFeaturedBlogs(data) {
    const mount = document.querySelector("#featured-blogs");
    if (!mount) {
        return;
    }

    const featured = (data.blogs || []).filter((item) => item.featured).slice(0, 3);
    mount.innerHTML = featured
        .map(
            (item) => {
                const url = safeText(item.url, "#");
                const linkAttributes = buildLinkAttributes(url);
                return `
			<article class="preview-item">
				<h3>${safeText(item.title, "Untitled post")}</h3>
				<p>${safeText(item.excerpt, "No excerpt available.")}</p>
				${url !== "#" ? `<p><a href="${url}" ${linkAttributes}>Read post</a></p>` : ""}
			</article>`;
            }
        )
        .join("");
}

function renderProjectsPage(data) {
    const mount = document.querySelector("#projects-list");
    if (!mount) {
        return;
    }

    const items = data.projects || [];
    mount.innerHTML = items
        .map((item) => {
            const stack = Array.isArray(item.stack) ? item.stack.join(" • ") : "";
            const url = safeText(item.url, "#");
            const linkAttributes = buildLinkAttributes(url);
            return `
			<article class="list-item">
				<div>
					<h2>${safeText(item.title, "Untitled project")}</h2>
					<p>${safeText(item.description, "No description available.")}</p>
					<p class="meta">${stack}</p>
				</div>
                <a href="${url}" aria-label="Open ${safeText(item.title, "project")}" ${linkAttributes}>Open</a>
			</article>`;
        })
        .join("");
}

function renderBlogsPage(data) {
    const mount = document.querySelector("#blogs-list");
    if (!mount) {
        return;
    }

    const items = data.blogs || [];
    mount.innerHTML = items
        .map((item) => {
            const url = safeText(item.url, "#");
            const linkAttributes = buildLinkAttributes(url);
            return `
			<article class="list-item">
				<div>
					<h2>${safeText(item.title, "Untitled post")}</h2>
					<p class="meta">${formatDate(item.date)}</p>
					<p>${safeText(item.excerpt, "No excerpt available.")}</p>
				</div>
                <a href="${url}" aria-label="Read ${safeText(item.title, "post")}" ${linkAttributes}>Read</a>
			</article>`;
        })
        .join("");
}

function renderResumeActions(data) {
    const resume = data.resume || {};
    const downloadEl = document.querySelector("#resume-download");

    if (!downloadEl) {
        return;
    }

    const pdfUrl = safeText(resume.pdfUrl, "data/Prince-Lad.pdf");
    const downloadName = safeText(resume.downloadName, "Prince-Lad-Resume.pdf");
    const ctaLabel = safeText(resume.ctaLabel, "Download Resume");

    downloadEl.href = pdfUrl;
    downloadEl.setAttribute("download", downloadName);
    downloadEl.textContent = ctaLabel;
}

async function loadContent() {
    try {
        let data = await loadLocalContentData();
        data = await enrichGithubTelemetry(data);
        data = await enrichGithubProjects(data);

        renderProfile(data);
        renderTelemetry(data);
        renderFeaturedProjects(data);
        renderFeaturedBlogs(data);
        renderProjectsPage(data);
        renderBlogsPage(data);
        renderResumeActions(data);
    } catch (error) {
        console.error(error);
        applyLoadFailureState();
    }
}

initThemeToggle();
applyInitialLoadingState();
loadContent();
