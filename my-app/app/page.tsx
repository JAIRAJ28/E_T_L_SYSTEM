import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Job Import Admin</h1>
      <p className="mt-2 text-sm text-slate-700">
        Go to import history to view runs, totals, and failures.
      </p>

      <div className="mt-4">
        <Link
          href="/import-history"
          className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm text-white hover:bg-sky-600"
        >
          Open Import History →
        </Link>
      </div>
    </div>
  );
}
