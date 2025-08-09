"use client"

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react"
import { AuthLayout } from "../layouts/auth-layout"
import { SignInView } from "../views/sign-in-view"


// Su objetivo esproteger rutas y mostrar contenido diferente dependiendo del estado 
// de autenticación del usuario.

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AuthLoading>
        <AuthLayout>
          <p>
            Loading...
          </p>
        </AuthLayout>
      </AuthLoading>
      
      <Authenticated>
        {children}
      </Authenticated>

      <Unauthenticated>
        <AuthLayout>
          <SignInView />
        </AuthLayout>
      </Unauthenticated>

    </>
  )
}



