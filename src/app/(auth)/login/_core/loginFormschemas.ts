import { z } from "zod"

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "El email o usuario es obligatorio"),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria"),
})

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "El nombre de usuario es obligatorio")
      .min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z
      .string()
      .min(1, "El email es obligatorio")
      .regex(emailRegex, "Email inválido"),
    password: z
      .string()
      .min(1, "La contraseña es obligatoria")
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z
      .string()
      .min(1, "Debes confirmar la contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
