# **App Name**: DeFi Liquidity Tracker

## Core Features:

- Pool Registration: Pool Registration: Allows users to register their DeFi liquidity pools by providing details such as platform, name, tokens, and fee tier.
- Daily Entry: Daily Entry: Enables users to record daily yields for each pool, including position value, accumulated fees, withdrawn fees, token prices, and USD to BRL exchange rate.
- Global Dashboard: Global Dashboard: Displays aggregated data across all pools, including a line chart of total position value, a bar chart of withdrawn fees, and KPI cards for total invested value, accumulated fees, withdrawn fees, and profitability percentage.
- Pool Dashboard: Individual Pool Dashboard: Provides detailed data for a specific pool, including a line chart of position value, an area chart or bar chart of accumulated fees, and an editable table of daily entries.
- Data Persistence: Data Persistence: Uses localStorage or Firestore (if Firebase is configured) to store pool and daily entry data, ensuring data is saved between sessions.
- User Interface: User Interface: Provides a dark mode layout, rounded buttons, soft shadows, smooth transitions, and form validation with Zod, enhancing the user experience.
- Suggested Entries: Suggest daily entry: Given historical yields of similar pools and current market conditions, suggest values of feesAccumulatedUSD as a tool, helping the user input correct information faster.

## Style Guidelines:

- Primary color: Deep purple (#624CAB) to convey stability and innovation.
- Background color: Dark gray (#212121) for a modern dark mode aesthetic, creating contrast with the primary color.
- Accent color: Electric blue (#7DF9FF) to highlight key elements and CTAs.
- Headline font: 'Space Grotesk' (sans-serif) for titles, as well as short chunks of body text; body text: 'Inter' (sans-serif) for body, offering a tech-inspired yet readable pairing.
- Use simple, geometric icons to represent different DeFi platforms and metrics.
- Employ a grid-based layout with clear spacing and padding to ensure readability and visual appeal.
- Use subtle Framer Motion animations for modal entrances and chart updates to provide a smooth user experience.