import { Wordmark } from "@/components/wordmark";

/** Layout for pages subscribers see: unsubscribe, preferences, confirmation. */
export function PublicShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Wordmark className="text-4xl" />
        </div>

        <div className="card p-7">
          <h1 className="mb-4 font-display text-xl font-bold">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
