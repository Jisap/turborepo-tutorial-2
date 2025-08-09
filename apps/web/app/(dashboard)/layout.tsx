import { AuthGuard } from "@/modules/auth/ui/components/auth-guard"
import { OrganizationGuard } from "@/modules/auth/ui/components/organization-guard"


const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthGuard>
      {/*
        Flujo de Protección de Doble Capa:

        1. Middleware (Servidor):
           - `auth().protect()`: Redirige a los usuarios no autenticados a /sign-in.
           - `if (!orgId)`: Redirige a los usuarios autenticados pero sin organización a /org-selection.

        2. Guards (Cliente):
           - `AuthGuard`: Muestra la UI de login si el estado de autenticación cambia en el cliente.
           - `OrganizationGuard`: Muestra el selector de organización si el estado de la organización cambia en el cliente.
      */}
      <OrganizationGuard>
        {children}
      </OrganizationGuard>
    </AuthGuard>
  )
}

export default Layout