import React, { useState, useMemo, useEffect } from 'react';
import { MangaArchive, MangaPage } from '../types';
import { saveArchive, saveArchives } from '../services/storage';
import { useArchives } from '../hooks/useArchives';
import { useFileDiscovery } from '../hooks/useFileDiscovery';
import { useWebExtraction } from '../hooks/useWebExtraction';
import { useUrlImport } from '../hooks/useUrlImport';
import { useAppConfig } from '../hooks/useAppConfig';

// Components
import { LibraryHeader } from './library/LibraryHeader';
import { ArchiveGrid } from './library/ArchiveGrid';
import { ArchiveCard } from './library/ArchiveCard';
import { AddArchiveMenu } from './library/AddArchiveMenu';
import { LibraryManagementMenu } from './library/LibraryManagementMenu';
import { GroupCard } from './library/GroupCard';
import { GroupDetailView } from './library/GroupDetailView';

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
  const { config } = useAppConfig();
  const { archives, isLoading: isArchivesLoading, loadArchives, handleDeleteArchive, handleUpdateMetadata } = useArchives();
  const { isProcessing: isFilesProcessing, processFiles } = useFileDiscovery();
  const { isExtracting, extractImagesFromUrl } = useWebExtraction();

  // Search and Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'groups'>('all');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Modals Visibility
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUrlImportModal, setShowUrlImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMultiDeleteConfirm, setShowMultiDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showWebExtractor, setShowWebExtractor] = useState(false);
  const [showLibraryMenu, setShowLibraryMenu] = useState(false);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [isBulkImport, setIsBulkImport] = useState(false);

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

  // Compute Groups
  const groupedArchives = useMemo(() => {
    const groups: Record<string, MangaArchive[]> = {};
    const ungrouped: MangaArchive[] = [];

    filteredArchives.forEach(archive => {
      if (archive.catalogGroupId) {
        if (!groups[archive.catalogGroupId]) {
          groups[archive.catalogGroupId] = [];
        }
        groups[archive.catalogGroupId].push(archive);
      } else {
        ungrouped.push(archive);
      }
    });

    return { groups, ungrouped };
  }, [filteredArchives]);

  // URL Param Import
  useUrlImport({
    processFiles,
    onArchiveReady: (name, pages) => {
      setPendingArchive({ name, pages });
      setShowCreateModal(true);
    },
    onPasswordRequired: (file) => {
      setPendingArchiveFile(file);
      setShowPasswordModal(true);
    }
  });
  const handleAddOption = (option: string) => {
    if (option === 'local') {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      const acceptExts = config.supportedUploadableFiles.map(ext =>
        ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext) ? `image/${ext}` : `.${ext}`
      ).join(',');
      input.accept = acceptExts || '.zip,.cbz,.cbr,.coz,image/*';
      input.onchange = (e) => handleFileInputChange(e as any);
      input.click();
    } else if (option === 'url') {
      setShowUrlImportModal(true);
    } else if (option === 'web') {
      setShowWebExtractor(true);
    } else if (option === 'json') {
      setIsBulkImport(false);
      setShowJsonImport(true);
    }
  };

  const handleLibraryOption = (option: string) => {
    if (option === 'export_library') {
      handleExportLibrary();
    } else if (option === 'import_library') {
      setIsBulkImport(true);
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

  const handleExportLibrary = () => {
    if (archives.length === 0) {
      alert('Your library is empty. Nothing to export.');
      return;
    }

    const dataStr = JSON.stringify(archives, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `manga-library-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleWebExtract = async () => {
    const imgs = await extractImagesFromUrl(webUrl, webRule);
    setExtractedImages(imgs);
    // Auto-select all extracted images
    setSelectedExtractedUrls(new Set(imgs));
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
        onDeselectAll={() => setSelectedIds(new Set())}
        onAddClick={() => {
          setShowAddMenu(!showAddMenu);
          setShowLibraryMenu(false);
        }}
        showAddMenu={showAddMenu}
        onLibraryClick={() => {
          setShowLibraryMenu(!showLibraryMenu);
          setShowAddMenu(false);
        }}
        showLibraryMenu={showLibraryMenu}
        viewMode={viewMode}
        setViewMode={(mode) => {
          setViewMode(mode);
          setActiveGroupId(null);
        }}
      />

      <div className="relative">
        <AddArchiveMenu
          isOpen={showAddMenu}
          onClose={() => setShowAddMenu(false)}
          onOptionSelect={handleAddOption}
        />
        <LibraryManagementMenu
          isOpen={showLibraryMenu}
          onClose={() => setShowLibraryMenu(false)}
          onOptionSelect={handleLibraryOption}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {activeGroupId ? (
          <GroupDetailView
            groupId={activeGroupId}
            archives={groupedArchives.groups[activeGroupId] || []}
            selectedIds={selectedIds}
            isSelectionMode={isSelectionMode}
            onBack={() => setActiveGroupId(null)}
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
        ) : viewMode === 'groups' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6 p-6">
            {(Object.entries(groupedArchives.groups) as [string, MangaArchive[]][]).map(([groupId, memberArchives]) => (
              <GroupCard
                key={groupId}
                groupId={groupId}
                archives={memberArchives}
                onClick={setActiveGroupId}
              />
            ))}
            {/* Show ungrouped catalogs too */}
            {groupedArchives.ungrouped.map(archive => (
              <ArchiveCard
                key={archive.id}
                archive={archive}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(archive.id)}
                onSelect={onSelectManga}
                onToggleSelection={(id) => {
                  const next = new Set(selectedIds);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  setSelectedIds(next);
                }}
                onDeleteIconClick={(manga) => { setMangaToDelete(manga); setShowDeleteConfirm(true); }}
                onEditIconClick={(manga) => {
                  setMangaToEdit(manga);
                  setEditJsonContent(JSON.stringify(manga, null, 2));
                  setShowEditModal(true);
                }}
              />
            ))}
          </div>
        ) : (
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
        )}
      </div>

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
        onDeletePage={async (pageId) => {
          if (!mangaToEdit) return;
          const nextPages = mangaToEdit.pages.filter((p) => p.id !== pageId);
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
          // Reset state so a new catalog can be extracted
          setWebUrl('');
          setWebRule('');
          setExtractedImages([]);
          setSelectedExtractedUrls(new Set());
          setWebExtractTitle('');
        }}
      />

      <JsonImportModal
        isOpen={showJsonImport}
        onClose={() => setShowJsonImport(false)}
        title={isBulkImport ? "Import Library" : "Import Catalog JSON"}
        description={isBulkImport ? "Merge a collection of catalogs" : "Import a single catalog entry"}
        content={importJsonContent}
        setContent={setImportJsonContent}
        onImport={async () => {
          try {
            const parsed = JSON.parse(importJsonContent);
            const items = Array.isArray(parsed) ? parsed : [parsed];

            // Map and validate items
            const toImport: MangaArchive[] = items
              .filter(item => item.name && item.pages)
              .map(item => ({
                id: item.id || crypto.randomUUID(),
                name: item.name,
                author: item.author,
                genre: item.genre,
                description: item.description,
                series: item.series,
                volume: item.volume,
                pages: item.pages.map((p: any) => ({
                  ...p,
                  id: p.id || crypto.randomUUID()
                })),
                createdAt: item.createdAt || Date.now()
              }));

            const { added, skipped } = await saveArchives(toImport);

            await loadArchives();
            setShowJsonImport(false);
            setImportJsonContent('');

            if (added > 0 || skipped > 0) {
              alert(`Import complete: ${added} added, ${skipped} skipped (already exists).`);
            }
          } catch (err) {
            console.error('Import error:', err);
            alert('Invalid JSON format. Please ensure it follows the catalog structure.');
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
