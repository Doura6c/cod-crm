"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface SendGuideButtonProps {
  boutiqueId: string;
  defaultEmail?: string;
}

export function SendGuideButton({ boutiqueId, defaultEmail = "" }: SendGuideButtonProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSend() {
    if (!email.trim()) return;
    setStatus("sending");
    setMessage("");

    try {
      const res = await fetch(`/api/boutiques/${boutiqueId}/send-guide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message ?? "Guide envoyé avec succès !");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Erreur lors de l'envoi.");
      }
    } catch {
      setStatus("error");
      setMessage("Erreur réseau. Vérifiez votre connexion.");
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="w-5 h-5 text-sky-600" />
        <h2 className="text-lg font-semibold text-slate-800">Envoyer le guide au développeur</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Envoyez par email le guide complet d'intégration avec la clé webhook, l'URL et un exemple de code JavaScript prêt à intégrer.
      </p>

      {status === "success" ? (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="font-semibold text-emerald-800 text-sm">Guide envoyé !</div>
            <div className="text-emerald-700 text-xs mt-0.5">{message}</div>
          </div>
          <button
            onClick={() => { setStatus("idle"); setMessage(""); }}
            className="ml-auto text-xs text-emerald-600 hover:text-emerald-800 underline"
          >
            Renvoyer
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="email@developpeur.com"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              disabled={status === "sending"}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!email.trim() || status === "sending"}
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm whitespace-nowrap"
          >
            {status === "sending" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
            ) : (
              <><Send className="w-4 h-4" /> Envoyer le guide</>
            )}
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{message}</span>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-3">
        📧 L'email contiendra : URL webhook, clé secrète, code JS d'intégration et tableau des champs requis.
      </p>
    </div>
  );
}
