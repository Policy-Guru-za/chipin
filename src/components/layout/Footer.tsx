export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-text-muted">
        <span className="font-medium text-text">ChipIn</span>
        <p>
          A joyful, secure way to pool gifts for birthdays and celebrations.
        </p>
        <span>© {new Date().getFullYear()} ChipIn. All rights reserved.</span>
      </div>
    </footer>
  );
}
