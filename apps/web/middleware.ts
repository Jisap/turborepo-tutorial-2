import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server';


const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const isOrgFreeRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/org-selection(.*)',
]);

export default clerkMiddleware(async(auth, req) => {
  const { userId, orgId } = await auth();

  if (!isPublicRoute(req)) {  // Si el usuario no está autenticado, redirige al login : sign-in configurado en .env
    await auth.protect()      // Si si esta autenticado, redirige a la ruta principal : "/" -> app/layout.tsx -> app/(dashboard)/layout -> <AuthGuard> -> page.tsx
  }                      

  if(
    userId &&                 // Si tenemos un usuario autenticado
    !orgId &&                 // pero no es parte de una organización
    !isOrgFreeRoute(req)      // y la ruta a la que se está intentando acceder no es ni login ni de selección de organización
  ){
    
      const searchParams = new URLSearchParams({ redirectUrl: req.url}); // Guardamos la url a la que el usuario queria acceder en un parámetro llamado redirectUrl

      const orgSelection = new URL(                                      // Creamos la url de la página de selección de organización
        `/org-selection?${searchParams.toString()}`,
        req.url
      );

      return NextResponse.redirect(orgSelection)                         // Y redirigimos al usuario a esa página
    }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

// Flujo de autenticación:
// 1º Un usuario inicia sesión correctamente.
// 2º Intenta acceder a "/dashboard/projects".
// 3º El middleware se activa:
//    - userId existe. ✅
//    - orgId no existe. ✅
//    - La ruta "/dashboard/projects" no está en isOrgFreeRoute. ✅
// 4º El middleware lo redirige a "/org-selection?redirectUrl =.../dashboard/projects".
// 5º En la página "/org-selection", el usuario elige una organización.
// 6º Una vez seleccionada, la lógica de esa página puede leer el parámetro redirectUrl y enviar al usuario finalmente a "/dashboard/projects".