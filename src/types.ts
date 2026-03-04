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
  genre?: string[];
  description?: string;
  series?: string;
  volume?: string;
  size?: number;
}

export interface ViewerSettings {
  slideshowSpeed: number;
  isSlideshowActive: boolean;
  rotation: number;
  zoom: number;
  fitMode: 'width' | 'height' | 'contain';
  enableTTS: boolean;
}
