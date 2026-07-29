import { signIn } from "@/app/admin/actions";

export function LoginForm({ errorMessage }: { errorMessage?: string }) {
  return (
    <form
      action={signIn}
      className="mx-auto mt-16 max-w-md border border-[#e3e0d8] p-8"
    >
      <p className="font-mono text-[11px] tracking-[0.18em] text-[#6d6759]">
        TEACHER LOGIN
      </p>
      <h1 className="mt-3 font-display text-3xl font-normal">Admin access</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#3f3b33]">
        Sign in to manage equipment inventory and site settings. Only registered
        teachers can access this area.
      </p>

      <label className="mt-8 block text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-2 w-full border border-[#d8d4c9] px-3 py-2.5 outline-none focus:border-[#141414]"
        />
      </label>
      <label className="mt-4 block text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-2 w-full border border-[#d8d4c9] px-3 py-2.5 outline-none focus:border-[#141414]"
        />
      </label>

      {errorMessage && (
        <p className="mt-4 text-sm text-[#c8102e]">{errorMessage}</p>
      )}

      <button
        type="submit"
        className="mt-6 w-full bg-[#141414] px-4 py-3 text-sm text-white"
      >
        Sign in
      </button>
    </form>
  );
}
