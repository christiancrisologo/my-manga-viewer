import React, { useState, useEffect, useRef } from 'react';
import { Plus, Book, Trash2, Clock, Image as ImageIcon, FileArchive, Settings, Download, Upload, FileCode, Search, Tag, User, CheckCircle2, Circle, X, Link, Lock, Pencil, Edit, Globe, Filter, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import { MangaArchive, MangaPage } from '../types';
import { getArchives, deleteArchive, saveArchive, createUrl, revokeAllUrls, updateArchiveMetadata } from '../services/storage';
import JSZip from 'jszip';
import { createExtractorFromData } from 'node-unrar-js';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LibraryProps {
  onSelectManga: (manga: MangaArchive) => void;
}

export default function Library({ onSelectManga }: LibraryProps) {
  const [archives, setArchives] = useState<MangaArchive[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showRemoteConfig, setShowRemoteConfig] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<{
    name: string;
    author: string;
    genre: string;
    pages: { name: string; data?: Blob; url?: string }[];
  } | null>(null);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [mangaToDelete, setMangaToDelete] = useState<MangaArchive | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const [showMultiDeleteConfirm, setShowMultiDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [archivePassword, setArchivePassword] = useState('');
  const [pendingArchiveFile, setPendingArchiveFile] = useState<File | null>(null);
  const [showUrlImportModal, setShowUrlImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [mangaToEdit, setMangaToEdit] = useState<MangaArchive | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    author: '',
    genre: '',
    description: '',
    series: '',
    volume: ''
  });
  const [webExtractorUrl, setWebExtractorUrl] = useState('');
  const [webExtractorRule, setWebExtractorRule] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<'web' | 'cloud' | 'json' | null>('web');
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [selectedExtractedUrls, setSelectedExtractedUrls] = useState<Set<string>>(new Set());
  const [webExtractTitle, setWebExtractTitle] = useState('');
  const [webExtractHostname, setWebExtractHostname] = useState('');
  const [jsonEditorContent, setJsonEditorContent] = useState('');
  const [editUrlInput, setEditUrlInput] = useState('');

  const SAMPLE_JSON = JSON.stringify({
    name: "Sample Collection",
    author: "Artist Name",
    genre: ["Action", "Fantasy"],
    pages: [
      { name: "Cover", url: "https://picsum.photos/seed/manga1/800/1200" },
      { name: "Page 1", url: "https://picsum.photos/seed/manga2/800/1200" },
      { name: "Page 2", url: "https://picsum.photos/seed/manga3/800/1200" }
    ]
  }, null, 2);

  useEffect(() => {
    loadArchives();
    return () => revokeAllUrls();
  }, []);

  const loadArchives = async () => {
    revokeAllUrls();
    try {
      const data = await getArchives();
      // Generate URLs for the first page of each archive for preview
      const archivesWithUrls = data.map(archive => ({
        ...archive,
        pages: archive.pages.map((page, i) => {
          if (i === 0) {
            return { ...page, url: createUrl(page.data || page.url) };
          }
          return page;
        })
      }));
      setArchives(archivesWithUrls);
    } catch (err) {
      console.error('Failed to load archives:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const fileList = Array.from(files) as File[];
      await processFiles(fileList);
    } catch (err) {
      console.error('Error processing file:', err);
      alert('Failed to process file. Make sure it is a valid archive (ZIP/CBZ/CBR/COZ) or image.');
    } finally {
      setIsUploading(false);
    }
  };

  const processFiles = async (fileList: File[], password?: string) => {
    let allPages: { name: string; data: Blob }[] = [];
    let defaultName = "";

    for (const file of fileList) {
      const fileName = file.name.toLowerCase();
      try {
        if (fileName.endsWith('.zip') || fileName.endsWith('.cbz') || fileName.endsWith('.coz')) {
          const pages = await extractZipPages(file);
          allPages = [...allPages, ...pages];
          if (!defaultName) defaultName = file.name.replace(/\.[^/.]+$/, "");
        } else if (fileName.endsWith('.cbr')) {
          const pages = await extractRarPages(file, password);
          allPages = [...allPages, ...pages];
          if (!defaultName) defaultName = file.name.replace(/\.[^/.]+$/, "");
        } else if (file.type.startsWith('image/')) {
          allPages.push({ name: file.name, data: file as Blob });
          if (!defaultName) defaultName = "New Collection";
        }
      } catch (err: any) {
        if (err.message?.includes('password') || err.message?.includes('encrypted')) {
          setPendingArchiveFile(file);
          setShowPasswordModal(true);
          throw new Error('PASSWORD_REQUIRED');
        }
        throw err;
      }
    }

    if (allPages.length > 0) {
      setPendingArchive({
        name: defaultName,
        author: '',
        genre: '',
        pages: allPages
      });
      setShowCreateModal(true);
    }
    await loadArchives();
  };

  const handlePasswordSubmit = async () => {
    if (!pendingArchiveFile) return;
    setIsUploading(true);
    try {
      await processFiles([pendingArchiveFile], archivePassword);
      setShowPasswordModal(false);
      setArchivePassword('');
      setPendingArchiveFile(null);
    } catch (err: any) {
      if (err.message === 'PASSWORD_REQUIRED') {
        alert('Incorrect password. Please try again.');
      } else {
        console.error('Password extraction error:', err);
        alert('Failed to extract archive with provided password.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const extractZipPages = async (file: File) => {
    const zip = new JSZip();
    const content = await zip.loadAsync(file);
    const pages: { name: string; data: Blob }[] = [];

    const fileEntries = Object.entries(content.files).filter(([name, entry]) =>
      !entry.dir && /\.(jpe?g|png|gif|webp|avif)$/i.test(name)
    );

    fileEntries.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }));

    for (const [name, entry] of fileEntries) {
      const blob = await entry.async('blob');
      pages.push({ name, data: blob });
    }
    return pages;
  };

  const extractRarPages = async (file: File, password?: string) => {
    const buffer = await file.arrayBuffer();
    const extractor = await createExtractorFromData({ data: buffer, password });
    const list = extractor.getFileList();
    const pages: { name: string; data: Blob }[] = [];

    const fileHeaders = Array.from(list.fileHeaders);
    const fileEntries = fileHeaders.filter(header =>
      !header.flags.directory && /\.(jpe?g|png|gif|webp|avif)$/i.test(header.name)
    );

    if (fileEntries.length === 0 && fileHeaders.length > 0 && !password) {
      // Might be encrypted
      throw new Error('PASSWORD_REQUIRED');
    }

    fileEntries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const extracted = extractor.extract({ files: fileEntries.map(f => f.name) });

    for (const fileData of extracted.files) {
      if (fileData.extraction) {
        const blob = new Blob([fileData.extraction], { type: getMimeType(fileData.fileHeader.name) });
        pages.push({ name: fileData.fileHeader.name, data: blob });
      }
    }
    return pages;
  };

  const handleSavePending = async () => {
    if (!pendingArchive) return;

    const archive: MangaArchive = {
      id: crypto.randomUUID(),
      name: pendingArchive.name || 'Untitled Collection',
      author: pendingArchive.author,
      genre: pendingArchive.genre.split(',').map(g => g.trim()).filter(Boolean),
      pages: pendingArchive.pages.map((p, i) => ({ id: `${i}`, ...p })),
      createdAt: Date.now(),
    };

    await saveArchive(archive);
    await loadArchives();
    setShowCreateModal(false);
    setPendingArchive(null);
  };

  const getMimeType = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'avif': return 'image/avif';
      default: return 'image/jpeg';
    }
  };

  const processImages = async (files: File[], name: string) => {
    const pages = files.map((file, i) => ({
      id: `${i}`,
      name: file.name,
      data: file as Blob
    }));

    setPendingArchive({
      name: name || 'New Collection',
      author: '',
      genre: '',
      pages
    });
    setShowCreateModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, manga: MangaArchive) => {
    e.stopPropagation();
    setMangaToDelete(manga);
  };

  const confirmDelete = async () => {
    if (mangaToDelete) {
      await deleteArchive(mangaToDelete.id);
      await loadArchives();
      setMangaToDelete(null);
    }
  };

  const confirmMultiDelete = async () => {
    for (const id of selectedIds) {
      await deleteArchive(id);
    }
    await loadArchives();
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setShowMultiDeleteConfirm(false);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCardClick = (manga: MangaArchive) => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    if (isSelectionMode) {
      toggleSelection(manga.id);
    } else {
      onSelectManga(manga);
    }
  };

  const startLongPress = (id: string) => {
    if (isSelectionMode) return;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedIds(new Set([id]));
      isLongPress.current = true;
      // Vibrate if supported
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleWebExtract = async () => {
    if (!webExtractorUrl) return;
    setIsExtracting(true);
    setExtractedImages([]);
    setSelectedExtractedUrls(new Set());
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(webExtractorUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Failed to fetch website content');

      const data = await response.json();
      const html = data.contents;

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const imgElements = Array.from(doc.querySelectorAll('img'));

      const baseUrl = new URL(webExtractorUrl);
      let imageUrls = imgElements.map(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original');
        if (!src) return null;
        try {
          return new URL(src, baseUrl.href).href;
        } catch {
          return null;
        }
      }).filter((url): url is string => url !== null);

      if (webExtractorRule) {
        const keywords = webExtractorRule.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
        imageUrls = imageUrls.filter(url =>
          keywords.some(k => url.toLowerCase().includes(k))
        );
      }

      imageUrls = Array.from(new Set(imageUrls));

      if (imageUrls.length === 0) {
        alert('No images found matching your rules.');
        return;
      }

      setExtractedImages(imageUrls);
      setSelectedExtractedUrls(new Set(imageUrls)); // Select all by default
      setWebExtractTitle(doc.title || baseUrl.hostname);
      setWebExtractHostname(baseUrl.hostname);
    } catch (err) {
      console.error('Web extraction error:', err);
      alert('Failed to extract images from the website.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleJsonImport = () => {
    try {
      const data = JSON.parse(jsonEditorContent || SAMPLE_JSON);
      if (!data.name || !data.pages || !Array.isArray(data.pages)) {
        throw new Error('Invalid JSON structure. "name" and "pages" array are required.');
      }

      const pages = data.pages.map((p: any, i: number) => ({
        name: p.name || `Page ${i + 1}`,
        url: p.url
      })).filter((p: any) => !!p.url);

      if (pages.length === 0) {
        throw new Error('No valid image URLs found in the pages array.');
      }

      setPendingArchive({
        name: data.name,
        author: data.author || 'JSON Author',
        genre: Array.isArray(data.genre) ? data.genre.join(', ') : (data.genre || 'JSON Import'),
        pages: pages
      });

      setShowCreateModal(true);
      setShowRemoteConfig(false);
      setJsonEditorContent('');
    } catch (err: any) {
      alert(`Error parsing JSON: ${err.message}`);
    }
  };
  const handleFinalizeExtraction = async () => {
    if (selectedExtractedUrls.size === 0) return;
    setIsExtracting(true);
    try {
      const urlsToSave = Array.from(selectedExtractedUrls) as string[];

      const pages: { name: string; url: string }[] = urlsToSave.map((url, index) => {
        const fileName = url.split('/').pop()?.split('?')[0] || `image-${index}.jpg`;
        return { name: fileName, url: url };
      });

      setPendingArchive({
        name: webExtractTitle || 'Web Collection',
        author: webExtractHostname || 'Web Extract',
        genre: 'Web Extract',
        pages: pages
      });

      setShowCreateModal(true);
      setShowRemoteConfig(false);

      // Reset extractor state
      setWebExtractorUrl('');
      setWebExtractorRule('');
      setExtractedImages([]);
      setSelectedExtractedUrls(new Set());
    } catch (err) {
      console.error('Finalize extraction error:', err);
      alert('An error occurred while processing the images.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRemoteImport = async () => {
    if (!remoteUrl) return;
    setIsUploading(true);
    try {
      const response = await fetch(remoteUrl, {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const contentType = response.headers.get('content-type');

      // Handle Archive (CBZ/ZIP)
      if (contentType?.includes('application/zip') || contentType?.includes('application/x-cbz') || remoteUrl.toLowerCase().endsWith('.cbz') || remoteUrl.toLowerCase().endsWith('.zip')) {
        const blob = await response.blob();
        const file = new File([blob], remoteUrl.split('/').pop() || 'remote_archive.cbz', { type: blob.type });
        const pages = await extractZipPages(file);

        if (pages.length > 0) {
          setPendingArchive({
            name: file.name.replace(/\.[^/.]+$/, ""),
            author: '',
            genre: '',
            pages
          });
          setShowCreateModal(true);
          setShowRemoteConfig(false);
        }
        return;
      }

      // Handle JSON (Existing logic)
      const data = await response.json();

      if (data.pages && Array.isArray(data.pages)) {
        const pages: MangaPage[] = [];
        for (let i = 0; i < data.pages.length; i++) {
          try {
            const imgRes = await fetch(data.pages[i]);
            if (!imgRes.ok) continue;
            const blob = await imgRes.blob();
            if (blob.type.startsWith('image/')) {
              pages.push({
                id: `${i}`,
                name: `Page ${i + 1}`,
                data: blob
              });
            }
          } catch (e) {
            console.error(`Failed to fetch image at ${data.pages[i]}:`, e);
          }
        }

        if (pages.length === 0) {
          throw new Error('No valid images could be fetched from the remote source.');
        }

        setPendingArchive({
          name: data.title || 'Remote Manga',
          author: data.author || '',
          genre: Array.isArray(data.genre) ? data.genre.join(', ') : (data.genre || ''),
          pages
        });
        setShowCreateModal(true);
        setShowRemoteConfig(false);
      } else {
        alert('Invalid remote data format. Expected { title: string, pages: string[] } or a direct CBZ/ZIP file.');
      }
    } catch (err) {
      console.error('Remote import error:', err);
      alert(err instanceof Error ? err.message : 'Failed to fetch from remote source.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackup = async () => {
    const data = await getArchives();
    const backup = {
      version: 1,
      archives: await Promise.all(data.map(async a => ({
        ...a,
        pages: await Promise.all(a.pages.map(async p => ({
          ...p,
          data: await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(p.data);
          })
        })))
      })))
    };
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mangaflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      for (const a of backup.archives) {
        const archive: MangaArchive = {
          ...a,
          pages: a.pages.map((p: any) => ({
            ...p,
            data: (() => {
              const byteString = atob(p.data.split(',')[1]);
              const mimeString = p.data.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              return new Blob([ab], { type: mimeString });
            })()
          }))
        };
        await saveArchive(archive);
      }
      await loadArchives();
      alert('Restore complete!');
    } catch (err) {
      console.error('Restore error:', err);
      alert('Failed to restore backup.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleMetadataImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const config = JSON.parse(text);

      if (!config.catalogs || !Array.isArray(config.catalogs)) {
        throw new Error('Invalid config format. Expected { catalogs: [...] }');
      }

      const currentArchives = await getArchives();
      let updatedCount = 0;
      let createdCount = 0;

      for (const entry of config.catalogs) {
        // Try to match by archive filename or title
        const match = currentArchives.find(a =>
          a.name.toLowerCase() === entry.title?.toLowerCase() ||
          a.name.toLowerCase() === entry.archiveFile?.replace(/\.[^/.]+$/, "").toLowerCase()
        );

        if (match) {
          await updateArchiveMetadata(match.id, {
            author: entry.author,
            genre: entry.genre,
            description: entry.description,
            series: entry.series,
            volume: entry.volume
          });
          updatedCount++;
        } else if (entry.pages && Array.isArray(entry.pages)) {
          // Create new catalog from URLs
          const pages: MangaPage[] = [];
          for (let i = 0; i < entry.pages.length; i++) {
            try {
              const imgRes = await fetch(entry.pages[i]);
              if (!imgRes.ok) continue;
              const blob = await imgRes.blob();
              if (blob.type.startsWith('image/')) {
                pages.push({ id: `${i}`, name: `Page ${i + 1}`, data: blob });
              }
            } catch (e) {
              console.error(`Failed to fetch image for ${entry.title}:`, e);
            }
          }

          if (pages.length > 0) {
            const archive: MangaArchive = {
              id: crypto.randomUUID(),
              name: entry.title || 'Imported Manga',
              author: entry.author,
              genre: entry.genre,
              description: entry.description,
              pages,
              createdAt: Date.now(),
            };
            await saveArchive(archive);
            createdCount++;
          }
        }
      }

      await loadArchives();
      alert(`Import complete! Updated ${updatedCount} and created ${createdCount} catalogs.`);
    } catch (err) {
      console.error('Metadata import error:', err);
      alert('Failed to import. Check console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportCBZ = async (e: React.MouseEvent, manga: MangaArchive) => {
    e.stopPropagation();
    const zip = new JSZip();
    manga.pages.forEach((page, i) => {
      if (page.data) {
        const ext = page.data.type.split('/')[1] || 'jpg';
        zip.file(`${String(i + 1).padStart(3, '0')}.${ext}`, page.data);
      } else if (page.url) {
        // For remote images, we'd need to fetch them first to include in CBZ
        // For now, we just skip them to avoid crashing
        console.warn(`Skipping remote image in CBZ export: ${page.url}`);
      }
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${manga.name}.cbz`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUrlImport = async () => {
    if (!importUrl) return;
    setIsUploading(true);
    try {
      const urls = importUrl.split(',').map(u => u.trim()).filter(Boolean);
      const files: File[] = [];

      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;

          const contentType = response.headers.get('content-type');
          const blob = await response.blob();
          const fileName = url.split('/').pop() || 'downloaded_file';
          const file = new File([blob], fileName, { type: blob.type });
          files.push(file);
        } catch (e) {
          console.error(`Failed to fetch URL: ${url}`, e);
        }
      }

      if (files.length > 0) {
        await processFiles(files);
        setShowUrlImportModal(false);
        setImportUrl('');
      } else {
        alert('No valid files could be downloaded from the provided URL(s).');
      }
    } catch (err: any) {
      if (err.message !== 'PASSWORD_REQUIRED') {
        console.error('URL import error:', err);
        alert('Failed to import from URL. Make sure it is a direct link to an image or archive.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, manga: MangaArchive) => {
    e.stopPropagation();
    setMangaToEdit(manga);
    setEditForm({
      name: manga.name,
      author: manga.author || '',
      genre: manga.genre?.join(', ') || '',
      description: manga.description || '',
      series: manga.series || '',
      volume: manga.volume || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!mangaToEdit) return;

    const updatedMetadata = {
      name: editForm.name,
      author: editForm.author,
      genre: editForm.genre.split(',').map(g => g.trim()).filter(Boolean),
      description: editForm.description,
      series: editForm.series,
      volume: editForm.volume
    };

    await updateArchiveMetadata(mangaToEdit.id, updatedMetadata);
    await loadArchives();
    setShowEditModal(false);
    setMangaToEdit(null);
  };

  const handleAddImagesToEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !mangaToEdit) return;

    setIsUploading(true);
    try {
      const fileList = Array.from(files) as File[];
      const newPages: MangaPage[] = [];

      for (const file of fileList) {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.zip') || fileName.endsWith('.cbz') || fileName.endsWith('.coz')) {
          const pages = await extractZipPages(file);
          pages.forEach(p => newPages.push({ id: crypto.randomUUID(), name: p.name, data: p.data }));
        } else if (fileName.endsWith('.cbr')) {
          const pages = await extractRarPages(file);
          pages.forEach(p => newPages.push({ id: crypto.randomUUID(), name: p.name, data: p.data }));
        } else if (file.type.startsWith('image/')) {
          newPages.push({
            id: crypto.randomUUID(),
            name: file.name,
            data: file as Blob
          });
        }
      }

      if (newPages.length > 0) {
        const updatedPages = [...mangaToEdit.pages, ...newPages];
        await updateArchiveMetadata(mangaToEdit.id, { pages: updatedPages });
        const updatedManga = { ...mangaToEdit, pages: updatedPages };
        setMangaToEdit(updatedManga);
        await loadArchives();
      }
    } catch (err) {
      console.error('Error adding images:', err);
      alert('Failed to add some files. Make sure they are valid images or archives.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddUrlImagesToEdit = async (urlInput?: string) => {
    const finalUrlInput = urlInput || editUrlInput;
    if (!finalUrlInput || !mangaToEdit) return;
    setIsUploading(true);
    try {
      const urls = finalUrlInput.split(',').map(u => u.trim()).filter(Boolean);
      const newPages: MangaPage[] = [];

      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const blob = await response.blob();
          if (blob.type.startsWith('image/')) {
            newPages.push({
              id: crypto.randomUUID(),
              name: url.split('/').pop() || 'remote_image',
              data: blob
            });
          }
        } catch (e) {
          console.error(`Failed to fetch image: ${url}`, e);
        }
      }

      if (newPages.length > 0) {
        const updatedPages = [...mangaToEdit.pages, ...newPages];
        await updateArchiveMetadata(mangaToEdit.id, { pages: updatedPages });
        const updatedManga = { ...mangaToEdit, pages: updatedPages };
        setMangaToEdit(updatedManga);
        setEditUrlInput('');
        await loadArchives();
      }
    } catch (err) {
      console.error('Error adding URL images:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePageFromEdit = async (pageId: string) => {
    if (!mangaToEdit) return;

    const updatedPages = mangaToEdit.pages.filter(p => p.id !== pageId);
    await updateArchiveMetadata(mangaToEdit.id, { pages: updatedPages });
    const updatedManga = { ...mangaToEdit, pages: updatedPages };
    setMangaToEdit(updatedManga);
    await loadArchives();
  };

  const filteredArchives = archives.filter(archive => {
    const query = searchQuery.toLowerCase();
    return (
      archive.name.toLowerCase().includes(query) ||
      archive.author?.toLowerCase().includes(query) ||
      archive.genre?.some(g => g.toLowerCase().includes(query)) ||
      archive.series?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <header className="p-6 border-b border-zinc-800 flex flex-col gap-4 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white italic">MangaFlow</h1>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-bold">Pocket Library</p>
            </div>
          </div>
          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setShowRemoteConfig(true)}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full transition-all active:scale-95"
            >
              <Settings size={20} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 p-3 rounded-full transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                title="Add Manga"
              >
                <Plus size={24} className={cn("transition-transform duration-300", showAddMenu && "rotate-45")} />
              </button>

              <AnimatePresence>
                {showAddMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowAddMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute right-0 mt-3 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-2xl z-30"
                    >
                      <label className="flex items-center gap-3 w-full p-3 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer text-zinc-300 hover:text-white">
                        <Upload size={18} className="text-emerald-500" />
                        <span className="text-sm font-medium">Local Device</span>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept=".zip,.cbz,.cbr,.coz,image/*"
                          onChange={(e) => {
                            handleFileChange(e);
                            setShowAddMenu(false);
                          }}
                          disabled={isUploading}
                        />
                      </label>
                      <button
                        onClick={() => {
                          setShowUrlImportModal(true);
                          setShowAddMenu(false);
                        }}
                        className="flex items-center gap-3 w-full p-3 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-300 hover:text-white"
                      >
                        <Link size={18} className="text-emerald-500" />
                        <span className="text-sm font-medium">Import from URL</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Search by title, author, or genre..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <AnimatePresence>
          {showMultiDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => setShowMultiDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Delete {selectedIds.size} Catalogs?</h3>
                  <p className="text-sm text-zinc-400 mb-8">
                    Are you sure you want to delete the selected collections? This action cannot be undone.
                  </p>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => setShowMultiDeleteConfirm(false)}
                      className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmMultiDelete}
                      className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Password Modal */}
        <AnimatePresence>
          {showPasswordModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6"
              onClick={() => { setShowPasswordModal(false); setPendingArchiveFile(null); }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Protected Archive</h3>
                    <p className="text-xs text-zinc-500">This file requires a password</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Password</label>
                    <input
                      type="password"
                      placeholder="Enter password..."
                      value={archivePassword}
                      onChange={e => setArchivePassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                      autoFocus
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => { setShowPasswordModal(false); setPendingArchiveFile(null); }}
                      className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePasswordSubmit}
                      disabled={!archivePassword}
                      className="flex-1 py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      Unlock
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* URL Import Modal */}
        <AnimatePresence>
          {showUrlImportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6"
              onClick={() => setShowUrlImportModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                    <Link size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Import from URL</h3>
                    <p className="text-xs text-zinc-500">Direct link to image or archive</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/manga.cbz"
                      value={importUrl}
                      onChange={e => setImportUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
                      autoFocus
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowUrlImportModal(false)}
                      className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUrlImport}
                      disabled={!importUrl || isUploading}
                      className="flex-1 py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {isUploading ? 'Downloading...' : 'Import'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mangaToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => setMangaToDelete(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Delete Collection?</h3>
                  <p className="text-sm text-zinc-400 mb-8">
                    Are you sure you want to delete <span className="text-white font-semibold">"{mangaToDelete.name}"</span>? This action cannot be undone.
                  </p>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => setMangaToDelete(null)}
                      className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Catalog Modal */}
        <AnimatePresence>
          {showEditModal && mangaToEdit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => { setShowEditModal(false); setMangaToEdit(null); }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                      <Pencil size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Edit Catalog</h3>
                      <p className="text-xs text-zinc-500">{mangaToEdit.pages.length} pages in collection</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowEditModal(false); setMangaToEdit(null); }}
                    className="p-2 text-zinc-500 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Catalog Title</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Author</label>
                        <input
                          type="text"
                          value={editForm.author}
                          onChange={e => setEditForm({ ...editForm, author: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Genres</label>
                        <input
                          type="text"
                          value={editForm.genre}
                          onChange={e => setEditForm({ ...editForm, genre: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Series</label>
                      <input
                        type="text"
                        value={editForm.series}
                        onChange={e => setEditForm({ ...editForm, series: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Description</label>
                      <textarea
                        rows={3}
                        value={editForm.description}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Manage Pages</h4>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 bg-zinc-800/20 rounded-2xl no-scrollbar border border-zinc-800/50">
                        {mangaToEdit.pages.map((page, idx) => (
                          <div key={page.id} className="relative aspect-[3/4] bg-zinc-800 rounded-lg overflow-hidden group/page">
                            <img
                              src={createUrl(page.data || page.url)}
                              alt={page.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/page:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePageFromEdit(page.id);
                                }}
                                className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                title="Delete Page"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 px-1">
                              <span className="text-[8px] text-white/70 block text-center truncate">{idx + 1}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Add More Images</h4>
                      <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-dashed border-zinc-700 rounded-2xl hover:bg-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer group">
                          <Upload size={18} className="text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                          <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-300 uppercase tracking-wider">Upload from Device</span>
                          <input
                            type="file"
                            multiple
                            accept=".zip,.cbz,.cbr,.coz,image/*"
                            className="hidden"
                            onChange={handleAddImagesToEdit}
                          />
                        </label>
                        <div className="space-y-2">
                          <div className="relative">
                            <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <input
                              type="text"
                              placeholder="Paste image URL here..."
                              value={editUrlInput}
                              onChange={e => setEditUrlInput(e.target.value)}
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                          </div>
                          <button
                            onClick={() => handleAddUrlImagesToEdit()}
                            disabled={!editUrlInput || isUploading}
                            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-emerald-500 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors disabled:opacity-50 border border-emerald-500/20"
                          >
                            {isUploading ? 'Adding...' : 'Add from URL'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                      <button
                        onClick={() => { setShowEditModal(false); setMangaToEdit(null); }}
                        className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Catalog Modal */}
        <AnimatePresence>
          {showCreateModal && pendingArchive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => { setShowCreateModal(false); setPendingArchive(null); }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Create Catalog</h3>
                    <p className="text-xs text-zinc-500">{pendingArchive.pages.length} images selected</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Catalog Title</label>
                    <input
                      type="text"
                      placeholder="Enter title..."
                      value={pendingArchive.name}
                      onChange={e => setPendingArchive({ ...pendingArchive, name: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Author</label>
                      <input
                        type="text"
                        placeholder="Author name..."
                        value={pendingArchive.author}
                        onChange={e => setPendingArchive({ ...pendingArchive, author: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Genres</label>
                      <input
                        type="text"
                        placeholder="Action, Fantasy..."
                        value={pendingArchive.genre}
                        onChange={e => setPendingArchive({ ...pendingArchive, genre: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                      <p className="text-[8px] text-zinc-600 mt-1 uppercase font-bold">Comma separated</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => { setShowCreateModal(false); setPendingArchive(null); }}
                      className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePending}
                      className="flex-1 py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Remote Config Modal */}
        <AnimatePresence>
          {showRemoteConfig && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => setShowRemoteConfig(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Settings & Utilities</h3>
                  <button onClick={() => setShowRemoteConfig(false)} className="text-zinc-500 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Backup & Restore */}
                  <section className="bg-zinc-800/30 rounded-2xl p-4 border border-zinc-800/50">
                    <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">Library Management</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={handleBackup}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        <Download size={14} /> Backup
                      </button>
                      <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer">
                        <Upload size={14} /> Restore
                        <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
                      </label>
                      <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer">
                        <FileCode size={14} /> Metadata
                        <input type="file" accept=".json" className="hidden" onChange={handleMetadataImport} />
                      </label>
                    </div>
                  </section>

                  {/* Accordion Sections */}
                  <div className="space-y-2">
                    {/* Web Image Extractor Accordion */}
                    <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setActiveAccordion(activeAccordion === 'web' ? null : 'web')}
                        className={cn(
                          "w-full flex items-center justify-between p-4 transition-colors",
                          activeAccordion === 'web' ? "bg-emerald-500/10" : "hover:bg-zinc-800/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Wand2 size={18} className={activeAccordion === 'web' ? "text-emerald-500" : "text-zinc-500"} />
                          <span className={cn("text-xs font-bold uppercase tracking-widest", activeAccordion === 'web' ? "text-emerald-500" : "text-zinc-300")}>
                            Web Image Extractor
                          </span>
                        </div>
                        {activeAccordion === 'web' ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                      </button>

                      <AnimatePresence>
                        {activeAccordion === 'web' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 space-y-4">
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-1.5 block">Website URL</label>
                                  <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                    <input
                                      type="url"
                                      placeholder="https://example.com/gallery"
                                      value={webExtractorUrl}
                                      onChange={e => setWebExtractorUrl(e.target.value)}
                                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-1.5 block">Filter Rules (Keywords)</label>
                                  <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                    <input
                                      type="text"
                                      placeholder="chapter, page, img"
                                      value={webExtractorRule}
                                      onChange={e => setWebExtractorRule(e.target.value)}
                                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                  </div>
                                </div>
                                <button
                                  onClick={handleWebExtract}
                                  disabled={!webExtractorUrl || isExtracting}
                                  className="w-full py-3 bg-emerald-500 text-zinc-950 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                >
                                  {isExtracting ? 'Scanning...' : 'Scan Website'}
                                </button>
                              </div>

                              {extractedImages.length > 0 && (
                                <div className="pt-4 border-t border-zinc-800 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                                      Found {extractedImages.length} Images
                                    </h5>
                                    <button
                                      onClick={() => {
                                        if (selectedExtractedUrls.size === extractedImages.length) {
                                          setSelectedExtractedUrls(new Set());
                                        } else {
                                          setSelectedExtractedUrls(new Set(extractedImages));
                                        }
                                      }}
                                      className="text-[10px] text-emerald-500 font-bold uppercase hover:underline"
                                    >
                                      {selectedExtractedUrls.size === extractedImages.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 no-scrollbar">
                                    {extractedImages.map((url, idx) => (
                                      <div
                                        key={idx}
                                        onClick={() => {
                                          const next = new Set(selectedExtractedUrls);
                                          if (next.has(url)) next.delete(url);
                                          else next.add(url);
                                          setSelectedExtractedUrls(next);
                                        }}
                                        className={cn(
                                          "aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer relative group",
                                          selectedExtractedUrls.has(url) ? "border-emerald-500" : "border-zinc-800 hover:border-zinc-700"
                                        )}
                                      >
                                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        {selectedExtractedUrls.has(url) && (
                                          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                            <CheckCircle2 size={16} className="text-emerald-500 fill-zinc-950" />
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  <button
                                    onClick={handleFinalizeExtraction}
                                    disabled={selectedExtractedUrls.size === 0 || isExtracting}
                                    className="w-full py-3 bg-zinc-100 text-zinc-950 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                                  >
                                    {isExtracting ? 'Downloading...' : `Create Catalog (${selectedExtractedUrls.size} images)`}
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* JSON Editor Accordion */}
                    <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setActiveAccordion(activeAccordion === 'json' ? null : 'json')}
                        className={cn(
                          "w-full flex items-center justify-between p-4 transition-colors",
                          activeAccordion === 'json' ? "bg-emerald-500/10" : "hover:bg-zinc-800/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <FileCode size={18} className={activeAccordion === 'json' ? "text-emerald-500" : "text-zinc-500"} />
                          <span className={cn("text-xs font-bold uppercase tracking-widest", activeAccordion === 'json' ? "text-emerald-500" : "text-zinc-300")}>
                            JSON Catalog Author
                          </span>
                        </div>
                        {activeAccordion === 'json' ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                      </button>

                      <AnimatePresence>
                        {activeAccordion === 'json' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 space-y-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold block">Source JSON</label>
                                  <button
                                    onClick={() => setJsonEditorContent(SAMPLE_JSON)}
                                    className="text-[10px] text-emerald-500 font-bold uppercase hover:underline"
                                  >
                                    Load Sample
                                  </button>
                                </div>
                                <textarea
                                  value={jsonEditorContent}
                                  onChange={e => setJsonEditorContent(e.target.value)}
                                  placeholder={SAMPLE_JSON}
                                  className="w-full h-64 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors resize-none no-scrollbar"
                                />
                                <button
                                  onClick={handleJsonImport}
                                  className="w-full py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-[0.98]"
                                >
                                  Create from JSON
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Cloud Import Accordion */}
                    <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setActiveAccordion(activeAccordion === 'cloud' ? null : 'cloud')}
                        className={cn(
                          "w-full flex items-center justify-between p-4 transition-colors",
                          activeAccordion === 'cloud' ? "bg-emerald-500/10" : "hover:bg-zinc-800/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Download size={18} className={activeAccordion === 'cloud' ? "text-emerald-500" : "text-zinc-500"} />
                          <span className={cn("text-xs font-bold uppercase tracking-widest", activeAccordion === 'cloud' ? "text-emerald-500" : "text-zinc-300")}>
                            Cloud Import
                          </span>
                        </div>
                        {activeAccordion === 'cloud' ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                      </button>

                      <AnimatePresence>
                        {activeAccordion === 'cloud' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 space-y-4">
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-1.5 block">Source URL (JSON or CBZ)</label>
                                  <input
                                    type="url"
                                    placeholder="https://example.com/manga.cbz"
                                    value={remoteUrl}
                                    onChange={e => setRemoteUrl(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-1.5 block">API Key (Optional)</label>
                                  <input
                                    type="password"
                                    placeholder="Your API Key"
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                  />
                                </div>
                                <button
                                  onClick={handleRemoteImport}
                                  disabled={!remoteUrl || isUploading}
                                  className="w-full py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                >
                                  {isUploading ? 'Importing...' : 'Import from Cloud'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {(isUploading || isExtracting) && (
          <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-4 animate-pulse">
            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
              <Clock className="text-zinc-500 animate-spin" size={20} />
            </div>
            <div>
              <p className="font-medium text-zinc-200">{isExtracting ? 'Extracting images...' : 'Processing files...'}</p>
              <p className="text-xs text-zinc-500">{isExtracting ? 'Scanning website and downloading images' : 'Extracting images and preparing your library'}</p>
            </div>
          </div>
        )}

        {filteredArchives.length === 0 && !isUploading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 opacity-50">
            <Book size={64} strokeWidth={1} className="mb-4" />
            <p className="text-sm">No manga found. Add some to start reading!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredArchives.map((manga) => (
              <div
                key={manga.id}
                onClick={() => handleCardClick(manga)}
                onMouseDown={() => startLongPress(manga.id)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(manga.id)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                className={cn(
                  "group relative bg-zinc-900 rounded-2xl overflow-hidden border transition-all active:scale-[0.98] cursor-pointer",
                  isSelectionMode && selectedIds.has(manga.id) ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className="aspect-[3/4] bg-zinc-800 relative">
                  {manga.pages[0]?.url ? (
                    <img
                      src={manga.pages[0].url}
                      alt={manga.name}
                      className={cn(
                        "w-full h-full object-cover transition-transform duration-500",
                        isSelectionMode && selectedIds.has(manga.id) ? "scale-105 opacity-50" : "group-hover:scale-105"
                      )}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="text-zinc-700" size={32} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                  {isSelectionMode ? (
                    <div className="absolute top-2 right-2">
                      {selectedIds.has(manga.id) ? (
                        <CheckCircle2 className="text-emerald-500 fill-zinc-950" size={24} />
                      ) : (
                        <Circle className="text-zinc-500" size={24} />
                      )}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => handleEditClick(e, manga)}
                        className="absolute top-2 right-10 p-2 bg-black/40 backdrop-blur-md rounded-full text-zinc-400 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit Catalog"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={(e) => handleDeleteClick(e, manga)}
                        className="absolute top-2 right-2 p-2 bg-black/40 backdrop-blur-md rounded-full text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Catalog"
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        onClick={(e) => handleExportCBZ(e, manga)}
                        className="absolute top-2 left-2 p-2 bg-black/40 backdrop-blur-md rounded-full text-zinc-400 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download size={16} />
                      </button>
                    </>
                  )}

                  <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                    <FileArchive size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      {manga.pages.length} Pages
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-zinc-100 truncate leading-tight">
                    {manga.name}
                  </h3>
                  {manga.author && (
                    <div className="flex items-center gap-1 mt-1 text-zinc-500">
                      <User size={10} />
                      <span className="text-[10px] truncate">{manga.author}</span>
                    </div>
                  )}
                  {manga.genre && manga.genre.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {manga.genre.slice(0, 2).map(g => (
                        <span key={g} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[8px] rounded uppercase font-bold tracking-tighter">
                          {g}
                        </span>
                      ))}
                      {manga.genre.length > 2 && (
                        <span className="text-[8px] text-zinc-600 font-bold">+{manga.genre.length - 2}</span>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-tighter">
                    Added {new Date(manga.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 z-50 flex items-center justify-between shadow-2xl"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedIds(new Set());
                }}
                className="p-3 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <span className="text-sm font-bold text-white uppercase tracking-widest">
                {selectedIds.size} Selected
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedIds(new Set(archives.map(a => a.id)))}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => setShowMultiDeleteConfirm(true)}
                disabled={selectedIds.size === 0}
                className="px-6 py-3 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
