import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-black mb-4">AMKA Medical System</h1>
      <p className="text-muted mb-8">Le serveur est opérationnel.</p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
      >
        Accéder au Tableau de Bord
      </Link>
    </div>
  );
}
