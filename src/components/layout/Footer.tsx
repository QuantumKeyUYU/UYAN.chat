import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="border-t border-white/5 bg-bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-text-tertiary sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-medium text-text-secondary">Интернет без шума создаём вместе</p>
          <p className="text-xs text-text-tertiary/80">© {new Date().getFullYear()} UYAN.chat — пространство тёплых мыслей</p>
        </div>
        <div className="flex gap-4">
          <Link href="/support" className="transition hover:text-text-primary">
            Откликнуться
          </Link>
          <Link href="/write" className="transition hover:text-text-primary">
            Поделиться мыслью
          </Link>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-text-primary"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};
