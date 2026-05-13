import Link from "next/link"
import RegisterForm from "../login/register-form"

export default function RegisterPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Crear cuenta</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Regístrate en Lexia gratis</p>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
