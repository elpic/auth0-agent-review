import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { Button } from "@/components/ui/button";
import { GitPullRequest, ScrollText } from "lucide-react";

export async function Navbar() {
  const session = await auth0.getSession();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <GitPullRequest className="h-5 w-5 text-indigo-600" />
          <span>CodeReview Agent</span>
        </Link>

        {/* Nav links (only shown when authenticated) */}
        {user && (
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link
              href="/dashboard"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            >
              Dashboard
            </Link>
            <Link
              href="/audit"
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            >
              <ScrollText className="h-4 w-4" />
              Audit Trail
            </Link>
          </nav>
        )}

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
                {user.email ?? user.name}
              </span>
              <Button variant="outline" size="sm" asChild>
                <a href="/auth/logout">Sign out</a>
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <a href="/auth/login">Sign in</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
