import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, FolderOpen, Plus } from 'lucide-react';
import {
  useCollections,
  useCreateCollection,
  useUpdateCollection,
  useArchiveCollection,
  Collection,
} from '@/hooks/collection/useCollections';
import CollectionCard from '@/components/collection/CollectionCard';
import CollectionFormDialog from '@/components/collection/CollectionFormDialog';
import CollectionShareDialog from '@/components/collection/CollectionShareDialog';

const PAGE_SIZE = 12;

const CollectionsListPage = () => {
  const { data: collections, isLoading } = useCollections();
  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const archiveMutation = useArchiveCollection();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<Collection | null>(null);
  const [page, setPage] = useState(0);

  // Pagination
  const totalPages = Math.max(1, Math.ceil((collections?.length || 0) / PAGE_SIZE));
  const visibleCollections = useMemo(
    () => (collections || []).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [collections, page],
  );

  const handleEdit = (c: Collection) => {
    setEditing(c);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: { name: string; description: string }) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, name: data.name, description: data.description || null },
        { onSuccess: () => { setFormOpen(false); setEditing(null); } },
      );
    } else {
      createMutation.mutate(
        { name: data.name, description: data.description },
        { onSuccess: () => setFormOpen(false) },
      );
    }
  };

  const handleArchiveConfirm = () => {
    if (archiveTarget) {
      archiveMutation.mutate(archiveTarget, {
        onSuccess: () => setArchiveTarget(null),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Link
          to="/garden"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mi jardín
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FolderOpen className="h-8 w-8 text-primary" />
              Mis Colecciones
            </h1>
            <p className="text-muted-foreground mt-1">
              Organiza tus plantas en colecciones temáticas
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva colección
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : visibleCollections.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleCollections.map((c) => (
                <CollectionCard
                  key={c.id}
                  collection={c}
                  onEdit={handleEdit}
                  onArchive={setArchiveTarget}
                  onShare={setShareTarget}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin colecciones</h3>
              <p className="text-muted-foreground mb-6">
                Crea tu primera colección para organizar tus plantas
              </p>
              <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primera colección
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />

      {/* Form dialog */}
      <CollectionFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        collection={editing}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Archive confirmation */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar colección?</AlertDialogTitle>
            <AlertDialogDescription>
              La colección se archivará y ya no será visible. Las plantas no se verán afectadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm}>
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share dialog */}
      {shareTarget && (
        <CollectionShareDialog
          collectionId={shareTarget.id}
          collectionName={shareTarget.name}
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
        />
      )}
    </div>
  );
};

export default CollectionsListPage;
