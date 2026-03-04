export const APP_NAME = "My Manga Viewer";
export const AUTHOR_NAME = "Christian Crisologo";

export const FILE_EXTENSIONS = {
    ARCHIVE: [".zip", ".cbz", ".cbr", ".coz"],
    IMAGE: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]
};

export const VIEWER_DEFAULTS = {
    SLIDESHOW_SPEED: 3000,
    ZOOM: 1,
    FIT_MODE: 'contain' as const
};

export const SAMPLE_JSON = JSON.stringify({
    name: "Sample Collection",
    author: "Artist Name",
    genre: ["Action", "Fantasy"],
    pages: [
        { name: "Cover", url: "https://picsum.photos/seed/manga1/800/1200" },
        { name: "Page 1", url: "https://picsum.photos/seed/manga2/800/1200" },
        { name: "Page 2", url: "https://picsum.photos/seed/manga3/800/1200" }
    ]
}, null, 2);

export const ACCORDION_KEYS = {
    WEB: 'web',
    CLOUD: 'cloud',
    JSON: 'json'
} as const;
