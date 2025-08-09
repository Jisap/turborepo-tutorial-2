import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'


const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware(async(auth, req) => {
  if(!isPublicRoute(req)){
    await auth.protect() // Si el usuario no está autenticado, redirige al login : sign-in configurado en .env
  }                      // Si si esta autenticado, redirige a la ruta principal : "/" -> app/layout.tsx -> app/(dashboard)/layout -> <AuthGuard> -> page.tsx
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}