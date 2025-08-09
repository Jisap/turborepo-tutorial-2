"use client"

import { SignIn } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { useTheme } from 'next-themes'

// Clerk usa las carpetas [[...]] internamente para ofrecer sus páginas por defecto,
// pero usando routing="hash" permite que el usuario pueda navegar a ellas directamente

export const SignInView = () => {
  const { resolvedTheme } = useTheme()

  return (
    <SignIn 
      routing="hash" 
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined
      }}
    />
  )
}
