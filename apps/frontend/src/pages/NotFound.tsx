export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-5xl font-extrabold text-white">404</h1>
      <p className="mt-4 text-gray-300">The page you're looking for doesn't exist.</p>
      <a href="/" className="mt-6 inline-block btn-primary">Go Home</a>
    </div>
  );
}
