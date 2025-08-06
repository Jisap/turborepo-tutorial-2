# `shadcn/ui` Monorepo Template

Este template está diseñado para crear un monorepo que integre **[shadcn/ui](https://ui.shadcn.com/)** en un entorno organizado por paquetes.

---

## 📦 Uso Básico

Inicializa el proyecto ejecutando:

```bash
pnpm dlx shadcn@latest init
```

---

## ➕ Añadir Componentes

Para añadir componentes a tu aplicación web:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Esto colocará los componentes UI en el directorio:

```
packages/ui/src/components
```

---

## 🎨 Tailwind CSS

La configuración de `tailwind.config.ts` y `globals.css` ya está preparada para consumir componentes desde el paquete `ui`.

---

## 🧩 Uso de Componentes

Para utilizar un componente en tu aplicación, impórtalo directamente desde el paquete `ui`:

```tsx
import { Button } from "@workspace/ui/components/button"
```

---

## ⚙️ Integración con el Backend (Convex)

Este monorepo incluye un paquete de backend (`@workspace/backend`) basado en **[Convex](https://www.convex.dev/)** para gestionar la base de datos y la lógica del servidor.

### 1. Dependencias de Paquetes

Las apps `web` y `widget` incluyen estas dependencias para interactuar con el backend:

```jsonc
// apps/web/package.json o apps/widget/package.json
{
  "dependencies": {
    "@workspace/backend": "workspace:*",
    "convex": "1.25.4"
    // ... otras dependencias
  }
}
```

El paquete `packages/backend` también incluye su propio `package.json`:

```jsonc
// packages/backend/package.json
{
  "name": "@workspace/backend",
  "type": "module",
  "scripts": {
    "dev": "convex dev",
    "setup": "convex dev --until-success"
  },
  "dependencies": {
    "convex": "1.25.4"
  }
}
```

---

### 2. Configuración de TypeScript

Para permitir importaciones limpias y con alias desde el backend, los archivos `tsconfig.json` de las apps `web` y `widget` han sido actualizados:

```jsonc
// apps/web/tsconfig.json o apps/widget/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@workspace/backend/*": ["../../packages/backend/convex/*"]
      // ... otros alias
    }
  }
}
```

---

### 3. Uso del Backend en el Frontend

Una vez configurado, puedes hacer uso de las funciones de Convex directamente en tus componentes React:

```tsx
// apps/web/app/page.tsx
"use client"

import { useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"

export default function Page() {
  const users = useQuery(api.users.getMany)

  return (
    <div>
      {/* Renderiza los usuarios aquí */}
    </div>
  )
}
```

---

### 4. Variables de Entorno

Para conectar con tu backend de Convex, asegúrate de definir la variable `NEXT_PUBLIC_CONVEX_URL` en cada aplicación:

```dotenv
// apps/web/.env.local
NEXT_PUBLIC_CONVEX_URL=https://<YOUR_CONVEX_URL>
```

Puedes obtener esta URL desde tu [dashboard de Convex](https://dashboard.convex.dev/) o ejecutando:

```bash
pnpm --filter @workspace/backend dev
```