import Link from "next/link"
import LoginForm from "./login-form"

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Iniciar sesión</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Accede a tu cuenta de Lexia</p>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-6">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
