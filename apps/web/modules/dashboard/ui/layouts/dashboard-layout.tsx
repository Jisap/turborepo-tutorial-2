import { AuthGuard } from "@/modules/auth/ui/components/auth-guard"
import { OrganizationGuard } from "@/modules/auth/ui/components/organization-guard"
import { SidebarProvider } from "@workspace/ui/components/sidebar"
import { cookies } from "next/headers"
import { DashboardSidebar } from "../components/dashboard-sidebar"
import { Provider } from "jotai/react"

{/*
        Flujo de Protección de Doble Capa:

        1. Middleware (Servidor):
           - `auth().protect()`: Redirige a los usuarios no autenticados a /sign-in.
           - `if (!orgId)`: Redirige a los usuarios autenticados pero sin organización a /org-selection.

        2. Guards (Cliente):
           - `AuthGuard`: Muestra la UI de login si el estado de autenticación cambia en el cliente.
           - `OrganizationGuard`: Muestra el selector de organización si el estado de la organización cambia en el cliente.
*/}


export const DashboardLayout = async({ children }: { children: React.ReactNode }) => {

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar-open")?.value !== "false"; // Por defecto, abierto, a menos que esté explícitamente cerrado.

  return (
    <AuthGuard>
      <OrganizationGuard>
        <Provider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <DashboardSidebar />
            <main className="flex flex-1 flex-col">
              {children}
            </main>
          </SidebarProvider>
        </Provider>
      </OrganizationGuard>
    </AuthGuard>
  )
}