export interface MangaPage {
  id: string;
  data?: Blob;
  url?: string;
  name: string;
}

export interface MangaArchive {
  id: string;
  name: string;
  pages: MangaPage[];
  createdAt: number;
  author?: string;
  genre?: string[]
  description?: string;
  series?: string;
  volume?: string;
  chapter?: string;
  season?: string;
  released?: string;
  size?: number;
  groupId?: string;
}

export interface ViewerSettings {
  slideshowSpeed: number;
  isSlideshowActive: boolean;
  rotation: number;
  zoom: number;
  fitMode: 'width' | 'height' | 'contain';
  enableTTS: boolean;
  offset: { x: number; y: number };
  autoNextChapter: boolean;
}
