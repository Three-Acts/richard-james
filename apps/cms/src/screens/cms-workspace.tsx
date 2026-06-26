import { cn } from "@three-acts/template";
import type { AuthUser } from "../auth/auth-context";
import { singularize } from "../lib/format";
import { useCmsWorkspace } from "../hooks/use-cms-workspace";
import { CollectionSidebar, RecordListPane, RecordsToolbar, RecordTable, TopBar } from "../components/workspace";
import { RecordEditor } from "../components/editor";
import { ImportDialog } from "../components/import";

export function CmsWorkspace({ onSignOut, user }: { onSignOut: () => Promise<void>; user: AuthUser }) {
  const {
    activeCollection,
    activeCollectionId,
    draftRecord,
    error,
    filteredRecords,
    groups,
    handleAssetUpload,
    handleCreateRecord,
    handleDeleteRecords,
    handleExport,
    handleImportRecords,
    handleSaveRecord,
    handleSelectCollection,
    isImportOpen,
    isLoadingCollections,
    isLoadingRecords,
    isSaving,
    records,
    search,
    selectedIds,
    selectedRecordId,
    selectionMode,
    setIsImportOpen,
    setSearch,
    setSelectedRecordId,
    toggleRecordSelected,
    toggleSelectAll,
    toggleSelectionMode,
    updateDraftValue,
    uploadingField
  } = useCmsWorkspace();

  const selectedRecords = filteredRecords.filter((record) => selectedIds.has(record.id));

  return (
    <div className="flex h-screen flex-col bg-cms-bg text-[11px] text-cms-text">
      <TopBar onSignOut={onSignOut} user={user} />
      <div className="flex min-h-0 flex-1">
        <CollectionSidebar activeCollectionId={activeCollectionId} groups={groups} isLoading={isLoadingCollections} onSelectCollection={handleSelectCollection} />

        {activeCollection ? (
          <main className="relative flex min-h-0 min-w-0 flex-1">
            <section
              className={cn("flex min-h-0 flex-col border-r border-cms-raised", selectedRecordId ? "w-[250px] shrink-0" : "min-w-0 flex-1")}
              aria-label={`${activeCollection.label} records`}
            >
              {selectedRecordId ? (
                <RecordListPane collection={activeCollection} onSelectRecord={setSelectedRecordId} records={filteredRecords} selectedRecordId={selectedRecordId} />
              ) : (
                <>
                  <RecordsToolbar
                    newLabel={singularize(activeCollection.label)}
                    onCreate={handleCreateRecord}
                    onDeleteSelected={() => handleDeleteRecords([...selectedIds])}
                    onExportAll={() => handleExport(filteredRecords)}
                    onExportSelected={() => handleExport(selectedRecords)}
                    onImport={() => setIsImportOpen(true)}
                    onSearchChange={setSearch}
                    onToggleSelectionMode={toggleSelectionMode}
                    search={search}
                    selectedCount={selectedRecords.length}
                    selectionMode={selectionMode}
                    title={activeCollection.label}
                  />
                  <RecordTable
                    collection={activeCollection}
                    isLoading={isLoadingRecords}
                    onSelectRecord={setSelectedRecordId}
                    onToggleSelectAll={toggleSelectAll}
                    onToggleSelected={toggleRecordSelected}
                    records={filteredRecords}
                    selectedIds={selectedIds}
                    selectionMode={selectionMode}
                  />
                  <footer className="flex h-7 shrink-0 items-center border-t border-cms-raised px-3 text-[11px] text-cms-muted">
                    Showing {filteredRecords.length ? `1-${filteredRecords.length}` : "0"} of {records.length}
                  </footer>
                </>
              )}
            </section>

            {selectedRecordId && draftRecord ? (
              <RecordEditor
                collection={activeCollection}
                draftRecord={draftRecord}
                isSaving={isSaving}
                onAssetUpload={handleAssetUpload}
                onBack={() => setSelectedRecordId(null)}
                onChangeStatus={(status) => handleSaveRecord(status)}
                onDelete={() => handleDeleteRecords([draftRecord.id])}
                onSave={() => handleSaveRecord()}
                onUpdateValue={updateDraftValue}
                uploadingField={uploadingField}
              />
            ) : null}

            {error ? (
              <div className="absolute bottom-3.5 right-3.5 max-w-sm rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[11px] text-red-100 shadow-2xl shadow-black/40" role="alert">
                {error}
              </div>
            ) : null}
          </main>
        ) : (
          <main className="flex-1 p-4 text-[11px] text-cms-muted">No collections configured.</main>
        )}
      </div>

      {isImportOpen && activeCollection ? (
        <ImportDialog collection={activeCollection} onClose={() => setIsImportOpen(false)} onImport={handleImportRecords} />
      ) : null}
    </div>
  );
}
