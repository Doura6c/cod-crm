import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { updateAvatarAction, updatePhoneAction, removeAvatarAction } from "./actions";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { User, Camera, Palette, Phone, Mail, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Superviseur",
  AGENT: "Agent de confirmation",
  LIVREUR: "Livreur",
};

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  const { success, error } = await searchParams;

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  return (
    <div>
      <PageHeader title="Mon profil" />
      <div className="p-6 max-w-2xl space-y-6">

        {/* Messages */}
        {success === "avatar" && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl">
            ✅ Photo de profil mise à jour avec succès.
          </div>
        )}
        {success === "phone" && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl">
            ✅ Téléphone mis à jour avec succès.
          </div>
        )}
        {error === "size" && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-xl">
            ❌ Image trop grande. Maximum 2 MB.
          </div>
        )}

        {/* Photo de profil */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 dark:text-white">Photo de profil</span>
          </div>
          <div className="px-6 py-6">
            <div className="flex items-center gap-6">
              {/* Avatar actuel */}
              <div className="relative flex-shrink-0">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-sky-100 dark:ring-sky-900"
                  />
                ) : (
                  <div className="w-24 h-24 bg-sky-500 rounded-full flex items-center justify-center text-white text-2xl font-black ring-4 ring-sky-100 dark:ring-sky-900">
                    {initials}
                  </div>
                )}
              </div>

              {/* Upload + supprimer */}
              <div className="flex-1 space-y-3">
                <form action={updateAvatarAction} encType="multipart/form-data">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Choisir une nouvelle photo
                  </label>
                  <div className="flex gap-3 items-center flex-wrap">
                    <input
                      type="file"
                      name="avatar"
                      accept="image/jpeg,image/png,image/webp"
                      required
                      className="text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                    />
                    <button
                      type="submit"
                      className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
                    >
                      Enregistrer
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG ou WEBP · Max 2 MB</p>
                </form>

                {user.avatarUrl && (
                  <form action={removeAvatarAction}>
                    <button
                      type="submit"
                      className="text-xs text-red-500 hover:text-red-700 underline"
                    >
                      Supprimer la photo
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Thème */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 dark:text-white">Thème de l'interface</span>
          </div>
          <div className="px-6 py-6">
            <ThemeSwitcher />
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 dark:text-white">Informations personnelles</span>
          </div>
          <div className="px-6 py-6 space-y-4">
            {/* Nom & Prénom — lecture seule */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Prénom</label>
                <div className="input opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-700">{user.firstName}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Nom</label>
                <div className="input opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-700">{user.lastName}</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 -mt-2">Le nom et prénom sont gérés par l&apos;administrateur.</p>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input value={user.email} disabled className="input opacity-50 cursor-not-allowed" readOnly />
            </div>

            {/* Rôle */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Rôle
              </label>
              <div className="input opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-700">
                {ROLE_LABEL[user.role] ?? user.role}
              </div>
            </div>

            {/* Téléphone — modifiable */}
            <form action={updatePhoneAction} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Téléphone
                </label>
                <input name="phone" defaultValue={user.phone ?? ""} className="input" placeholder="Ex: 224620000000" />
              </div>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl transition"
              >
                💾 Enregistrer le téléphone
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
