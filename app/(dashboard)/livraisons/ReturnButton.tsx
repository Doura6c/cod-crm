"use client";

import { XCircle } from "lucide-react";
import { updateDeliveryStatusAction } from "./actions";

export function ReturnButton({ deliveryId, orderId }: { deliveryId: string; orderId: string }) {
  return (
    <form
      action={updateDeliveryStatusAction}
      onSubmit={(e) => {
        if (!confirm("Confirmer le retour de cette commande ?")) e.preventDefault();
      }}
      className="flex-1"
    >
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="status" value="RETOURNE" />
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-3 rounded-lg transition text-sm"
      >
        <XCircle className="w-5 h-5" /> Retour — non livré ❌
      </button>
    </form>
  );
}
