'use server';

interface FetchPriceResult {
    success: boolean;
    price?: number;
    error?: string;
}

export async function fetchTokenPrice(tokenId: string, date: string): Promise<FetchPriceResult> {
    if (!tokenId || !date) {
        return { success: false, error: 'Token ID e data são obrigatórios.' };
    }

    try {
        // CoinGecko API requires date in dd-mm-yyyy format
        const [year, month, day] = date.split('-');
        const formattedDate = `${day}-${month}-${year}`;

        const apiKey = process.env.COINGECKO_API_KEY;
        let url = `https://api.coingecko.com/api/v3/coins/${tokenId}/history?date=${formattedDate}&localization=false`;
        
        if (apiKey) {
            // For Demo plan keys, the parameter is x_cg_demo_api_key
            url += `&x_cg_demo_api_key=${apiKey}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('CoinGecko API Error:', {status: response.status, data: errorData, tokenId, date: formattedDate, apiKeyUsed: !!apiKey});

            if (response.status === 401) {
                return { success: false, error: 'Chave de API inválida. Verifique a chave no arquivo .env do projeto.' };
            }
            if (response.status === 404) {
                return { success: false, error: `ID de token "${tokenId}" não foi encontrado. Verifique o ID na página do token no CoinGecko.` };
            }
             if (response.status === 400) {
                 return { success: false, error: `Requisição inválida. Verifique se a data "${date}" é válida e não está no futuro.` };
            }
            if (response.status === 429) {
                return { success: false, error: 'Limite de requisições da API do CoinGecko atingido. Tente novamente mais tarde.' };
            }
            if (response.status >= 500) {
                return { success: false, error: `O serviço de preços (CoinGecko) parece estar com problemas (Erro ${response.status}). Tente novamente mais tarde.` };
            }

            return { success: false, error: `Falha ao buscar preço: ${errorData.error || `Erro ${response.status}`}` };
        }

        const data = await response.json();

        if (data.market_data && data.market_data.current_price && data.market_data.current_price.usd) {
            return { success: true, price: data.market_data.current_price.usd };
        } else {
            return { success: false, error: `Preço não encontrado para "${tokenId}" em ${formattedDate}. A API pode não ter dados para este dia.` };
        }
    } catch (error) {
        console.error('Erro ao buscar preço do token:', error);
        return { success: false, error: 'Ocorreu um erro de rede ou o serviço está indisponível.' };
    }
}


interface FetchRealtimePricesResult {
    success: boolean;
    prices?: Record<string, number>;
    error?: string;
}

export async function fetchRealtimeTokenPrices(tokenIds: string[]): Promise<FetchRealtimePricesResult> {
    if (!tokenIds || tokenIds.length === 0) {
        return { success: true, prices: {} };
    }

    const uniqueTokenIds = [...new Set(tokenIds)];
    const idsParam = uniqueTokenIds.join(',');

    try {
        const apiKey = process.env.COINGECKO_API_KEY;
        let url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`;
        
        if (apiKey) {
            url += `&x_cg_demo_api_key=${apiKey}`;
        }
        
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 60 } // Cache for 60 seconds
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('CoinGecko Real-time API Error:', {status: response.status, data: errorData, ids: idsParam, apiKeyUsed: !!apiKey});
            if (response.status === 429) {
                return { success: false, error: 'Limite de requisições da API do CoinGecko atingido. Tente novamente mais tarde.' };
            }
            if (response.status >= 500) {
                return { success: false, error: `O serviço de preços (CoinGecko) parece estar com problemas (Erro ${response.status}). Tente novamente mais tarde.` };
            }
            return { success: false, error: `Falha ao buscar preços em tempo real: Erro ${response.status}` };
        }

        const data = await response.json();
        
        const prices: Record<string, number> = {};
        for (const id in data) {
            if (data[id] && data[id].usd) {
                prices[id] = data[id].usd;
            }
        }
        
        uniqueTokenIds.forEach(id => {
            if (!prices[id]) {
                console.warn(`Real-time price not found for token ID: ${id}`);
            }
        });

        return { success: true, prices };

    } catch (error) {
        console.error('Erro ao buscar preços em tempo real:', error);
        return { success: false, error: 'Ocorreu um erro de rede ou o serviço de preços está indisponível.' };
    }
}