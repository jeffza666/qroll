type Props = {
  children: React.ReactNode;
  className?: string;
};

// Shared sticky page header for all (app) pages.
// pl-16 below lg leaves room for the fixed hamburger (left-3, ~44px wide).
// At lg+, the sidebar is visible and the hamburger is hidden, so padding
// collapses back to the original px-10.
export default function PageHeader({ children, className }: Props) {
  return (
    <header
      className={`sticky top-0 z-10 flex h-20 shrink-0 items-center border-b border-slate-200 bg-white/85 pl-16 pr-4 backdrop-blur-md sm:pr-6 lg:px-10 ${className ?? ""}`}
    >
      {children}
    </header>
  );
}
