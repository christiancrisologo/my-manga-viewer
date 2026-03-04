import React, { useState, useMemo } from 'react';
import { MangaArchive, MangaPage } from '../types';
import { saveArchive } from '../services/storage';
import { useArchives } from '../hooks/useArchives';
import { useFileDiscovery } from '../hooks/useFileDiscovery';
import { useWebExtraction } from '../hooks/useWebExtraction';

// Components
import { LibraryHeader } from './library/LibraryHeader';
import { ArchiveGrid } from './library/ArchiveGrid';
import { AddArchiveMenu } from './library/AddArchiveMenu';

// Modals
import { EditArchiveModal } from './library/modals/EditArchiveModal';
import { UrlImportModal } from './library/modals/UrlImportModal';
import { CreateArchiveModal } from './library/modals/CreateArchiveModal';
import { DeleteConfirmModal } from './library/modals/DeleteConfirmModal';
import { PasswordModal } from './library/modals/PasswordModal';
import { WebExtractionModal } from './library/modals/WebExtractionModal';
import { JsonImportModal } from './library/modals/JsonImportModal';

interface LibraryProps {
  onSelectManga: (manga: MangaArchive) => void;
}

export default function Library({ onSelectManga }: LibraryProps) {
  // Hooks
  const { archives, isLoading: isArchivesLoading, loadArchives, handleDeleteArchive, handleUpdateMetadata } = useArchives();
  const { isProcessing: isFilesProcessing, processFiles } = useFileDiscovery();
  const { isExtracting, extractImagesFromUrl } = useWebExtraction();

  // Search and Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modals Visibility
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUrlImportModal, setShowUrlImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMultiDeleteConfirm, setShowMultiDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showWebExtractor, setShowWebExtractor] = useState(false);
  const [showJsonImport, setShowJsonImport] = useState(false);

  // Modal Data
  const [mangaToEdit, setMangaToEdit] = useState<MangaArchive | null>(null);
  const [mangaToDelete, setMangaToDelete] = useState<MangaArchive | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [pendingArchive, setPendingArchive] = useState<{ name: string; pages: MangaPage[] } | null>(null);
  const [pendingArchiveFile, setPendingArchiveFile] = useState<File | null>(null);
  const [archivePassword, setArchivePassword] = useState('');

  // Edit Modal Specific
  const [editUrlInput, setEditUrlInput] = useState('');
  const [editJsonContent, setEditJsonContent] = useState('');
  const [importJsonContent, setImportJsonContent] = useState('');
  const [isJsonMode, setIsJsonMode] = useState(false);

  // Web Extractor Modal Specific
  const [webUrl, setWebUrl] = useState('');
  const [webRule, setWebRule] = useState('');
  const [webHostname, setWebHostname] = useState('');
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [selectedExtractedUrls, setSelectedExtractedUrls] = useState<Set<string>>(new Set());
  const [webExtractTitle, setWebExtractTitle] = useState('');

  // Filtering
  const filteredArchives = useMemo(() => {
    return archives.filter(a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.author?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [archives, searchQuery]);

  // Handlers
  const handleAddOption = (option: string) => {
    if (option === 'local') {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.zip,.cbz,.cbr,.coz,image/*';
      input.onchange = (e) => handleFileInputChange(e as any);
      input.click();
    } else if (option === 'url') {
      setShowUrlImportModal(true);
    } else if (option === 'web') {
      setShowWebExtractor(true);
    } else if (option === 'json') {
      setShowJsonImport(true);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const { pages, name } = await processFiles(Array.from(files));
      setPendingArchive({ name, pages });
      setShowCreateModal(true);
    } catch (err: any) {
      if (err.message === 'PASSWORD_REQUIRED') {
        setPendingArchiveFile(files[0]);
        setShowPasswordModal(true);
      }
    }
  };

  const handlePasswordConfirm = async () => {
    if (!pendingArchiveFile) return;
    try {
      const { pages, name } = await processFiles([pendingArchiveFile], archivePassword);
      setPendingArchive({ name, pages });
      setShowCreateModal(true);
      setShowPasswordModal(false);
      setArchivePassword('');
    } catch (err) {
      alert('Failed to unlock archive. Please check password.');
    }
  };

  const handleCreateArchive = async () => {
    if (!pendingArchive) return;
    await saveArchive({
      id: crypto.randomUUID(),
      name: pendingArchive.name,
      pages: pendingArchive.pages,
      createdAt: Date.now()
    });
    await loadArchives();
    setShowCreateModal(false);
    setPendingArchive(null);
  };

  const handleSaveEdit = async (formData: any) => {
    if (!mangaToEdit) return;
    if (isJsonMode) {
      try {
        const parsed = JSON.parse(editJsonContent);
        await handleUpdateMetadata(mangaToEdit.id, parsed);
      } catch (err) {
        alert('Invalid JSON format');
        return;
      }
    } else {
      await handleUpdateMetadata(mangaToEdit.id, formData);
    }
    setShowEditModal(false);
  };

  const handleMultiDelete = async () => {
    for (const id of selectedIds) {
      await handleDeleteArchive(id);
    }
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setShowMultiDeleteConfirm(false);
  };

  const handleWebExtract = async () => {
    const imgs = await extractImagesFromUrl(webUrl, webRule, webHostname);
    setExtractedImages(imgs);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <LibraryHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSelectionMode={isSelectionMode}
        setIsSelectionMode={setIsSelectionMode}
        selectedCount={selectedIds.size}
        onMultiDelete={() => setShowMultiDeleteConfirm(true)}
        onAddClick={() => setShowAddMenu(!showAddMenu)}
        showAddMenu={showAddMenu}
      />

      <div className="relative">
        <AddArchiveMenu
          isOpen={showAddMenu}
          onClose={() => setShowAddMenu(false)}
          onOptionSelect={handleAddOption}
        />
      </div>

      <ArchiveGrid
        archives={filteredArchives}
        selectedIds={selectedIds}
        isSelectionMode={isSelectionMode}
        onSelectManga={onSelectManga}
        onToggleSelection={(id) => {
          const next = new Set(selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setSelectedIds(next);
        }}
        onDeleteArchive={(manga) => { setMangaToDelete(manga); setShowDeleteConfirm(true); }}
        onEditArchive={(manga) => {
          setMangaToEdit(manga);
          setEditJsonContent(JSON.stringify(manga, null, 2));
          setShowEditModal(true);
        }}
      />

      <EditArchiveModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        manga={mangaToEdit}
        onSave={handleSaveEdit}
        isUploading={isFilesProcessing}
        urlInput={editUrlInput}
        setUrlInput={setEditUrlInput}
        jsonContent={editJsonContent}
        setJsonContent={setEditJsonContent}
        isJsonMode={isJsonMode}
        setIsJsonMode={setIsJsonMode}
        onDeletePage={async (pageIndex) => {
          if (!mangaToEdit) return;
          const nextPages = mangaToEdit.pages.filter((_, i) => i !== pageIndex);
          await handleUpdateMetadata(mangaToEdit.id, { pages: nextPages });
          setMangaToEdit({ ...mangaToEdit, pages: nextPages });
        }}
        onAddUrlPages={async () => {
          if (!mangaToEdit || !editUrlInput) return;
          const newPage = { id: crypto.randomUUID(), name: `URL Page ${mangaToEdit.pages.length + 1}`, url: editUrlInput };
          const nextPages = [...mangaToEdit.pages, newPage];
          await handleUpdateMetadata(mangaToEdit.id, { pages: nextPages });
          setMangaToEdit({ ...mangaToEdit, pages: nextPages });
          setEditUrlInput('');
        }}
        onAddFiles={async (files) => {
          if (!mangaToEdit) return;
          const { pages } = await processFiles(Array.from(files));
          const nextPages = [...mangaToEdit.pages, ...pages];
          await handleUpdateMetadata(mangaToEdit.id, { pages: nextPages });
          setMangaToEdit({ ...mangaToEdit, pages: nextPages });
        }}
      />

      <UrlImportModal
        isOpen={showUrlImportModal}
        onClose={() => setShowUrlImportModal(false)}
        url={importUrl}
        setUrl={setImportUrl}
        onImport={async () => {
          try {
            const response = await fetch(importUrl);
            const blob = await response.blob();
            const file = new File([blob], importUrl.split('/').pop() || 'downloaded', { type: blob.type });
            const { pages, name } = await processFiles([file]);
            setPendingArchive({ name, pages });
            setShowUrlImportModal(false);
            setShowCreateModal(true);
          } catch (err) {
            alert('Failed to import from URL');
          }
        }}
        isUploading={isFilesProcessing}
      />

      <CreateArchiveModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={pendingArchive?.name || ''}
        setTitle={(val) => setPendingArchive(p => p ? { ...p, name: val } : null)}
        pageCount={pendingArchive?.pages.length || 0}
        onConfirm={handleCreateArchive}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (mangaToDelete) {
            handleDeleteArchive(mangaToDelete.id);
            setShowDeleteConfirm(false);
          }
        }}
        itemName={mangaToDelete?.name}
      />

      <DeleteConfirmModal
        isOpen={showMultiDeleteConfirm}
        onClose={() => setShowMultiDeleteConfirm(false)}
        onConfirm={handleMultiDelete}
        isMultiple
      />

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        password={archivePassword}
        setPassword={setArchivePassword}
        onConfirm={handlePasswordConfirm}
      />

      <WebExtractionModal
        isOpen={showWebExtractor}
        onClose={() => setShowWebExtractor(false)}
        url={webUrl}
        setUrl={setWebUrl}
        rule={webRule}
        setRule={setWebRule}
        hostname={webHostname}
        setHostname={setWebHostname}
        onExtract={handleWebExtract}
        isExtracting={isExtracting}
        extractedImages={extractedImages}
        selectedUrls={selectedExtractedUrls}
        toggleUrlSelection={(url) => {
          const next = new Set(selectedExtractedUrls);
          if (next.has(url)) next.delete(url);
          else next.add(url);
          setSelectedExtractedUrls(next);
        }}
        selectAll={() => setSelectedExtractedUrls(new Set(extractedImages))}
        extractTitle={webExtractTitle}
        setExtractTitle={setWebExtractTitle}
        onCreateCatalog={async () => {
          const pages = Array.from(selectedExtractedUrls).map((url, i) => ({
            id: crypto.randomUUID(),
            name: `Page ${i + 1}`,
            url: url as string
          }));
          await saveArchive({
            id: crypto.randomUUID(),
            name: webExtractTitle || 'Web Collection',
            pages,
            createdAt: Date.now()
          });
          await loadArchives();
          setShowWebExtractor(false);
        }}
      />

      <JsonImportModal
        isOpen={showJsonImport}
        onClose={() => setShowJsonImport(false)}
        content={importJsonContent}
        setContent={setImportJsonContent}
        onImport={async () => {
          try {
            const parsed = JSON.parse(importJsonContent);
            if (!parsed.name || !parsed.pages) throw new Error('Invalid format');

            await saveArchive({
              id: crypto.randomUUID(),
              name: parsed.name,
              author: parsed.author,
              genre: parsed.genre,
              description: parsed.description,
              pages: parsed.pages.map((p: any) => ({
                ...p,
                id: p.id || crypto.randomUUID()
              })),
              createdAt: Date.now()
            });
            await loadArchives();
            setShowJsonImport(false);
            setImportJsonContent('');
          } catch (err) {
            alert('Invalid JSON format. Please ensure it has "name" and "pages" fields.');
          }
        }}
      />

      {(isFilesProcessing || isArchivesLoading) && (
        <div className="fixed bottom-8 right-8 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl z-50 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">Processing</p>
            <p className="text-[10px] text-zinc-500 font-medium">Please wait a moment...</p>
          </div>
        </div>
      )}
    </div>
  );
}
