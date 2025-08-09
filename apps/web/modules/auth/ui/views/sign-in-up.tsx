"use client"

import { SignUp } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { useTheme } from 'next-themes'

// Clerk usa las carpetas [[...]] internamente para ofrecer sus páginas por defecto,
// pero usando routing="hash" permite que el usuario pueda navegar a ellas directamente

export const SignUpView = () => {
  const { resolvedTheme } = useTheme()
  return (
    <SignUp 
      routing="hash" 
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined
      }} 
    />
  )
}
