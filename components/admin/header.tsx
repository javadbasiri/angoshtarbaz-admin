type AdminHeaderProps = {
  title: string;
};

export function AdminHeader({ title }: AdminHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-secondary bg-white/70 px-6">
      <h1 className="text-base font-semibold text-primary">{title}</h1>
      <span className="text-xs text-muted">اسکلت ANG-A0</span>
    </header>
  );
}
