import Link from "next/link";
import UserNav from "@/components/layout/UserNav";

export default function Navbar() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-zinc-50"
        >
          August<span className="text-cyan-400">Digital</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400">
          <Link href="/" className="hover:text-zinc-100 transition-colors">
            Home
          </Link>
        </nav>

        <UserNav />
      </div>
    </header>
  );
}
