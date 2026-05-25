"use client";

import { useEffect, useState } from "react";
import { BulkAssignBar } from "./BulkAssignBar";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  agents: Agent[];
}

/**
 * Controller léger pour la sélection multiple dans la table des commandes.
 * Fonctionne avec les checkboxes ayant l'attribut data-order-id.
 */
export function BulkSelectController({ agents }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      "input[data-order-id]"
    );

    const handlers: Array<{ el: HTMLInputElement; fn: () => void }> = [];

    checkboxes.forEach((cb) => {
      const fn = () => {
        const orderId = cb.dataset.orderId!;
        setSelected((prev) =>
          cb.checked ? [...prev, orderId] : prev.filter((id) => id !== orderId)
        );
      };
      cb.addEventListener("change", fn);
      handlers.push({ el: cb, fn });
    });

    // Select all
    const selectAll = document.querySelector<HTMLInputElement>(
      "input[data-select-all]"
    );
    const allFn = selectAll
      ? () => {
          const ids: string[] = [];
          checkboxes.forEach((cb) => {
            cb.checked = !!selectAll?.checked;
            if (selectAll?.checked) ids.push(cb.dataset.orderId!);
          });
          setSelected(ids);
        }
      : null;
    if (selectAll && allFn) selectAll.addEventListener("change", allFn);

    return () => {
      handlers.forEach(({ el, fn }) => el.removeEventListener("change", fn));
      if (selectAll && allFn) selectAll.removeEventListener("change", allFn);
    };
  }, []);

  const handleClear = () => {
    setSelected([]);
    document.querySelectorAll<HTMLInputElement>(
      "input[data-order-id], input[data-select-all]"
    ).forEach((cb) => { cb.checked = false; });
  };

  return (
    <BulkAssignBar orderIds={selected} agents={agents} onClear={handleClear} />
  );
}
