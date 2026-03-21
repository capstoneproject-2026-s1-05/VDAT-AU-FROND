export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h1 className="text-4xl font-bold font-heading text-destructive mb-2">404</h1>
      <p className="text-xl text-muted-foreground mb-6">Page Not Found</p>
      <a href="/" className="text-primary hover:underline">Return to Home</a>
    </div>
  );
}
