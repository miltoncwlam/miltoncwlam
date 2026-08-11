export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        body > header,
        body > footer {
          display: none !important;
        }
        body {
          background: #fff;
        }
      `}</style>
      {children}
    </>
  );
}
