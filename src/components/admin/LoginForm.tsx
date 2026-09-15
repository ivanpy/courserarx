'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from '@/app/login/actions';

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-900 p-8 shadow-lg">
      <div>
        <h1 className="text-lg font-semibold text-white">Constructor de backlog.ia</h1>
        <p className="text-sm text-slate-400">Acceso Admin / TPM</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="passphrase" className="block text-sm font-medium text-slate-300">
          Passphrase
        </label>
        <input
          type="password"
          id="passphrase"
          name="passphrase"
          required
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-slate-500"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-white py-2 text-sm font-medium text-slate-900 disabled:opacity-60"
      >
        {pending ? 'Verificando…' : 'Entrar'}
      </button>
    </form>
  );
}
