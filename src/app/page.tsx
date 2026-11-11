import Image from "next/image";
import AccountPanel from "./account-panel";
import AppGate from "./app-gate";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center gap-10 px-6 py-24 text-center sm:items-start sm:text-left">
        <div className="flex flex-col gap-3">
          <h1 className="flex items-center gap-3 text-4xl font-bold tracking-tight text-brand">
            <Image src="/logo-mark.png" alt="" width={48} height={50} aria-hidden="true" />
            Scrubtree
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Surgeon preferences, equipment setup, and procedure steps - all in
            one place for the theatre.
          </p>
        </div>

        <AccountPanel />

        <AppGate
          loggedOut={
            <p className="max-w-md text-zinc-600 dark:text-zinc-400">
              Sign in or create an account above to get started.
            </p>
          }
        >
          <div className="flex flex-col gap-2 text-left">
            <h2 className="text-lg font-semibold">Welcome back</h2>
            <p className="max-w-md text-zinc-600 dark:text-zinc-400">
              Use the links above to get to the surgeon directory, the
              procedure library, or your billing details.
            </p>
          </div>
        </AppGate>
      </main>
    </div>
  );
}
