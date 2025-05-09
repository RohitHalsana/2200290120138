const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Test Server API URL
const TEST_SERVER_API_URL = 'http://20.244.56.144/evaluation-service/stocks';

// Helper function to fetch stock price history
async function fetchStockPriceHistory(ticker, minutes) {
    const response = await axios.get(`${TEST_SERVER_API_URL}/${ticker}?minutes=${minutes}`);
    return response.data;
}

// API to get average stock price in the last "m" minutes
app.get('/stocks/:ticker', async (req, res) => {
    const { ticker } = req.params;
    const minutes = req.query.minutes;

    try {
        const priceHistory = await fetchStockPriceHistory(ticker, minutes);
        const averageStockPrice = calculateAverage(priceHistory);
        
        res.json({
            averageStockPrice,
            priceHistory
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// API to get correlation of price movement between 2 stocks in the last "m" minutes
app.get('/stockcorrelation', async (req, res) => {
    const { minutes, ticker1, ticker2 } = req.query;

    if (!ticker1 || !ticker2) {
        return res.status(400).json({ error: 'Both ticker1 and ticker2 are required' });
    }

    try {
        const [priceHistory1, priceHistory2] = await Promise.all([
            fetchStockPriceHistory(ticker1, minutes),
            fetchStockPriceHistory(ticker2, minutes)
        ]);

        const averagePrice1 = calculateAverage(priceHistory1);
        const averagePrice2 = calculateAverage(priceHistory2);
        const correlation = calculateCorrelation(priceHistory1, priceHistory2);

        res.json({
            correlation,
            stocks: {
                [ticker1]: {
                    averagePrice: averagePrice1,
                    priceHistory: priceHistory1
                },
                [ticker2]: {
                    averagePrice: averagePrice2,
                    priceHistory: priceHistory2
                }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Helper function to calculate average price
function calculateAverage(prices) {
    const total = prices.reduce((sum, price) => sum + price.price, 0);
    return prices.length ? total / prices.length : 0;
}

// Helper function to calculate correlation
function calculateCorrelation(prices1, prices2) {
    const values1 = prices1.map(price => price.price);
    const values2 = prices2.map(price => price.price);
    return pearsonCorrelation(values1, values2);
}

// Helper function to calculate Pearson correlation
function pearsonCorrelation(x, y) {
    const n = x.length;
    if (n === 0) return 0; // Avoid division by zero

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});