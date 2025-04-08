export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-full max-w-[350px] mx-auto">
        {children}
      </div>
    </div>
  );
}
