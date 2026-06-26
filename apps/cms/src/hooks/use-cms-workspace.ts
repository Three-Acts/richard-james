import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { mockCmsAdapter } from "../cms/mock-adapter";
import type { AssetField, CmsCollectionSummary, CmsRecord, CmsRecordValue, PublishStatus } from "../cms/types";
import type { CollectionGroup } from "../components/workspace";
import { getRecordTitle } from "../lib/records";
import { exportRecords } from "../lib/export-records";

const adapter = mockCmsAdapter;

export function useCmsWorkspace() {
  const [collections, setCollections] = useState<CmsCollectionSummary[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState("");
  const [records, setRecords] = useState<CmsRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [draftRecord, setDraftRecord] = useState<CmsRecord | null>(null);
  const [search, setSearch] = useState("");
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    adapter
      .listCollections()
      .then((nextCollections) => {
        if (!isMounted) {
          return;
        }

        setCollections(nextCollections);
        setIsLoadingRecords(true);
        setActiveCollectionId((current) => current || nextCollections[0]?.id || "");
      })
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => {
        if (isMounted) {
          setIsLoadingCollections(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeCollectionId) {
      return;
    }

    let isMounted = true;

    adapter
      .listRecords(activeCollectionId)
      .then((nextRecords) => {
        if (isMounted) {
          setRecords(nextRecords);
        }
      })
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => {
        if (isMounted) {
          setIsLoadingRecords(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCollectionId]);

  useEffect(() => {
    if (!selectedRecordId || !activeCollectionId) {
      return;
    }

    let isMounted = true;

    adapter
      .getRecord(activeCollectionId, selectedRecordId)
      .then((record) => {
        if (isMounted) {
          setDraftRecord(record);
        }
      })
      .catch((nextError: Error) => setError(nextError.message));

    return () => {
      isMounted = false;
    };
  }, [activeCollectionId, selectedRecordId]);

  const activeCollection = collections.find((collection) => collection.id === activeCollectionId) ?? collections[0];

  const filteredRecords = useMemo(() => {
    if (!activeCollection) {
      return [];
    }

    const query = search.trim().toLowerCase();

    if (!query) {
      return records;
    }

    return records.filter((record) => {
      const title = getRecordTitle(activeCollection, record).toLowerCase();
      const values = Object.values(record.values)
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");

      return title.includes(query) || values.includes(query);
    });
  }, [activeCollection, records, search]);

  const groups = useMemo<CollectionGroup[]>(() => {
    return collections.reduce<CollectionGroup[]>((acc, collection) => {
      const groupName = collection.group ?? "Collections";
      const group = acc.find((item) => item.group === groupName);

      if (group) {
        group.collections.push(collection);
      } else {
        acc.push({ group: groupName, collections: [collection] });
      }

      return acc;
    }, []);
  }, [collections]);

  function handleSelectCollection(collectionId: string) {
    setIsLoadingRecords(true);
    setSelectedRecordId(null);
    setDraftRecord(null);
    setSearch("");
    setError(null);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setActiveCollectionId(collectionId);
  }

  function toggleSelectionMode() {
    setSelectionMode((current) => !current);
    setSelectedIds(new Set());
  }

  function toggleRecordSelected(recordId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }

      return next;
    });
  }

  function toggleSelectAll(selected: boolean) {
    setSelectedIds(selected ? new Set(filteredRecords.map((record) => record.id)) : new Set());
  }

  async function handleDeleteRecords(ids: string[]) {
    if (!activeCollection || ids.length === 0) {
      return;
    }

    setError(null);

    try {
      for (const id of ids) {
        await adapter.deleteRecord(activeCollection.id, id);
      }

      const nextRecords = await adapter.listRecords(activeCollection.id);
      setRecords(nextRecords);
      setCollections((currentCollections) =>
        currentCollections.map((collection) => (collection.id === activeCollection.id ? { ...collection, count: nextRecords.length } : collection))
      );
      setSelectedIds(new Set());

      if (selectedRecordId && ids.includes(selectedRecordId)) {
        setSelectedRecordId(null);
        setDraftRecord(null);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to delete records.");
    }
  }

  async function handleImportRecords(rows: Array<Record<string, CmsRecordValue>>) {
    if (!activeCollection) {
      return;
    }

    setError(null);

    try {
      await adapter.importRecords(activeCollection.id, rows);
      const nextRecords = await adapter.listRecords(activeCollection.id);
      setRecords(nextRecords);
      setCollections((currentCollections) =>
        currentCollections.map((collection) => (collection.id === activeCollection.id ? { ...collection, count: nextRecords.length } : collection))
      );
      setIsImportOpen(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to import records.");
    }
  }

  function handleExport(recordsToExport: CmsRecord[]) {
    if (!activeCollection) {
      return;
    }

    exportRecords(activeCollection, recordsToExport);
  }

  async function handleCreateRecord() {
    if (!activeCollection) {
      return;
    }

    setError(null);

    try {
      const record = await adapter.createRecord(activeCollection.id);
      const nextRecords = await adapter.listRecords(activeCollection.id);
      setRecords(nextRecords);
      setCollections((currentCollections) =>
        currentCollections.map((collection) => (collection.id === activeCollection.id ? { ...collection, count: nextRecords.length } : collection))
      );
      setSelectedRecordId(record.id);
      setDraftRecord(record);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create record.");
    }
  }

  async function handleSaveRecord(nextStatus?: PublishStatus) {
    if (!activeCollection || !draftRecord) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const recordToSave = nextStatus ? { ...draftRecord, publishStatus: nextStatus } : draftRecord;
      const savedRecord = await adapter.saveRecord(activeCollection.id, recordToSave);
      setDraftRecord(savedRecord);
      setRecords((currentRecords) => currentRecords.map((record) => (record.id === savedRecord.id ? savedRecord : record)));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save record.");
    } finally {
      setIsSaving(false);
    }
  }

  function updateDraftValue(fieldKey: string, value: CmsRecordValue) {
    setDraftRecord((record) => {
      if (!record) {
        return record;
      }

      return {
        ...record,
        values: {
          ...record.values,
          [fieldKey]: value
        }
      };
    });
  }

  async function handleAssetUpload(field: AssetField, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!activeCollection || !file) {
      return;
    }

    setUploadingField(field.key);
    setError(null);

    try {
      const result = await adapter.uploadAsset(activeCollection.id, field.key, file);
      updateDraftValue(field.key, result.url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to upload asset.");
    } finally {
      setUploadingField(null);
      event.target.value = "";
    }
  }

  return {
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
  };
}
