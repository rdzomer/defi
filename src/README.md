# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

---

## Ponto de Salvamento: Versão Estável

Esta seção marca uma versão funcional e estável do aplicativo, conforme solicitado.

**Funcionalidades Implementadas:**

*   **Autenticação de Usuário:** Login com Google via Firebase Authentication.
*   **Gerenciamento de Pools:**
    *   Criação, edição e exclusão de pools de liquidez.
    *   Listagem de todos os pools no dashboard.
*   **Registros Diários:**
    *   Criação, edição e exclusão de entradas diárias para cada pool.
    *   Tabela com histórico de registros por pool.
*   **Dashboard Global:**
    *   KPIs (Key Performance Indicators) para o valor total, taxas acumuladas, taxas sacadas e rentabilidade líquida.
    *   Gráficos de evolução do valor total e taxas sacadas ao longo do tempo.
*   **Cotação de Câmbio Centralizada:**
    *   Um campo na tela principal para definir a taxa de conversão USD para BRL, que é salva por usuário e aplicada em todo o app.
*   **Página de Detalhes do Pool:**
    *   Visão detalhada para cada pool com estatísticas e gráficos específicos.
*   **Tecnologias:**
    *   Next.js com App Router.
    *   React com Hooks.
    *   Firebase (Firestore para banco de dados, Authentication para login).
    *   ShadCN/UI para componentes de interface.
    *   Tailwind CSS para estilização.
*   **Sugestão com IA:**
    *   Uso de IA (Genkit com Gemini) para sugerir valores de taxas acumuladas com base no histórico.

### Publicação (Deployment)

Para publicar esta aplicação em serviços como Netlify ou Vercel, você precisará configurar as seguintes variáveis de ambiente nas configurações do seu site:

**Firebase (Obrigatório):**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

**APIs Externas (Obrigatório):**
- `COINGECKO_API_KEY`: Sua chave de API do CoinGecko para buscar preços de tokens.
- `GOOGLE_API_KEY`: Sua chave de API do Google AI Studio para a funcionalidade de sugestão com IA.
