import { useState } from "react";
import { FacebookHeader } from "./components/FacebookHeader";
import { FacebookTable } from "./components/FacebookTable";
import { AddAccountModal } from "./components/AddAccountModal";
import { SyncAccountsModal } from "./components/SyncAccountsModal";
import { UpdateTokenModal } from "./components/UpdateTokenModal";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { useFacebookAccounts } from "@/hooks/useFacebookAccounts";
import { toast } from "sonner";
import type { FacebookAccountAPI } from "@/services/integrations";

export default function FacebookAdsPage() {
  const {
    accounts, isLoading, addAccount, bulkAddAccounts,
    removeAccount, removeAccounts, syncAccounts, updateToken,
  } = useFacebookAccounts();

  const [modalOpen, setModalOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncTarget, setSyncTarget] = useState<{ token: string; businessId: string }>({ token: "", businessId: "" });
  const [deleteTargets, setDeleteTargets] = useState<FacebookAccountAPI[]>([]);
  const [updateTokenTargets, setUpdateTokenTargets] = useState<FacebookAccountAPI[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);
  const [prefillToken, setPrefillToken] = useState<string | undefined>();

  const openAddModal = () => {
    setPrefillToken(undefined);
    setModalOpen(true);
  };

  const openDuplicateModal = (account: FacebookAccountAPI) => {
    setPrefillToken(account.access_token);
    setModalOpen(true);
  };

  const handleAdd = async (label: string, accountId: string, accessToken: string, businessId?: string) => {
    try {
      setIsAdding(true);
      await addAccount(label, accountId, accessToken, businessId);
      setModalOpen(false);
    } catch {
      toast.error("Erro ao adicionar conta Facebook");
    } finally {
      setIsAdding(false);
    }
  };

  const handleBulkAdd = async (
    items: { label: string; account_id: string }[],
    accessToken: string,
    businessId?: string
  ) => {
    try {
      setIsAdding(true);
      await bulkAddAccounts(items, accessToken, businessId);
      setModalOpen(false);
    } catch {
      toast.error("Erro ao adicionar contas Facebook");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClick = (account: FacebookAccountAPI) => setDeleteTargets([account]);
  const handleDeleteGroupClick = (group: FacebookAccountAPI[]) => setDeleteTargets(group);

  const handleConfirmDelete = async () => {
    if (!deleteTargets.length) return;
    try {
      setIsDeleting(true);
      if (deleteTargets.length === 1) {
        await removeAccount(deleteTargets[0].id);
      } else {
        await removeAccounts(deleteTargets.map((a) => a.id));
      }
      setDeleteTargets([]);
    } catch {
      toast.error("Erro ao excluir conta(s) Facebook");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncGroup = (token: string, businessId: string | null) => {
    setSyncTarget({ token, businessId: businessId ?? "" });
    setSyncOpen(true);
  };

  const handleUpdateToken = (group: FacebookAccountAPI[]) => {
    setUpdateTokenTargets(group);
  };

  const handleConfirmUpdateToken = async (accessToken: string) => {
    try {
      setIsUpdatingToken(true);
      // Atualiza todas as contas do grupo (mesmo token)
      await Promise.all(updateTokenTargets.map((a) => updateToken(a.id, accessToken)));
      setUpdateTokenTargets([]);
      toast.success("Token atualizado com sucesso!");
    } catch {
      toast.error("Erro ao atualizar token");
    } finally {
      setIsUpdatingToken(false);
    }
  };

  const deleteLabel = deleteTargets[0]?.label ?? "";
  const deleteDescription = deleteTargets.length > 1
    ? `Tem certeza que deseja excluir as ${deleteTargets.length} contas de "${deleteLabel}"? Esta ação não pode ser desfeita.`
    : `Tem certeza que deseja excluir a conta "${deleteLabel}"? Esta ação não pode ser desfeita.`;

  return (
    <div className="flex flex-col gap-6 p-6">
      <FacebookHeader onAddAccount={openAddModal} />
      <FacebookTable
        accounts={accounts}
        isLoading={isLoading}
        onDelete={handleDeleteClick}
        onDeleteGroup={handleDeleteGroupClick}
        onDuplicate={openDuplicateModal}
        onSync={handleSyncGroup}
        onUpdateToken={handleUpdateToken}
      />
      <AddAccountModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAdd={handleAdd}
        onBulkAdd={handleBulkAdd}
        isLoading={isAdding}
        prefillToken={prefillToken}
      />
      <SyncAccountsModal
        open={syncOpen}
        onOpenChange={setSyncOpen}
        onSync={syncAccounts}
        prefillToken={syncTarget.token}
        prefillBusinessId={syncTarget.businessId}
      />
      <UpdateTokenModal
        open={updateTokenTargets.length > 0}
        onOpenChange={(open) => !open && setUpdateTokenTargets([])}
        onUpdate={handleConfirmUpdateToken}
        accountLabel={updateTokenTargets[0]?.label ?? ""}
        isLoading={isUpdatingToken}
      />
      <ConfirmDeleteModal
        open={deleteTargets.length > 0}
        onOpenChange={(open) => !open && setDeleteTargets([])}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Excluir conta Facebook"
        description={deleteDescription}
      />
    </div>
  );
}
