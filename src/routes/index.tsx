import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Redireciona a página principal (raiz) direto para o painel admin
    throw redirect({
      to: '/admin',
    })
  },
  component: () => null, // Não renderiza nada pois já redirecionou
})
