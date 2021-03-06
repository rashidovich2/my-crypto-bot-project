const config = require('./config.json');
const Client = require('./index');
const { logger, updateConfig } = require('./log');


const binance = new Client(config.apiKey, config.apiSecret);
// BUY
const UPWARD_TREND_THRESHOLD = 1.5;
const DIP_THRESHOLD = -2.25;
// SELL
const PROFIT_THRESHOLD = 1.25;
const STOP_LOSS_THRESHOLD = -2.00;

let isNextOperationBuy = binance.operation.BUY;
let lastOpPrice = config.lastPrice;


const attemptToMakeTrade = async () => {
    const promises = await Promise.all([binance.getMarketPrice('ETHBTC'), binance.getOperationDetails(), binance.priceInUSD('ETHBTC')]);
    const currentPrice = promises[0];
    const openTrades = promises[1];
    const usdPrice = promises[2];

    // lastOpPrice = Promise.resolve(lastOpPrice) ? await lastOpPrice : lastOpPrice;

    if (Promise.resolve(lastOpPrice)) {
        lastOpPrice = await lastOpPrice;
        updateConfig(config, lastOpPrice);
    } else {
        lastOpPrice = config.lastPrice;
    }

    let percentageDiff = (Number(currentPrice.price) - Number(lastOpPrice)) / Number(lastOpPrice) * 100;
    // console.log(+lastOpPrice)
    // console.log(+percentageDiff)
    // console.log(+currentPrice.price)
    // console.log(typeof lastOpPrice)
    // console.log(typeof percentageDiff)
    // console.log(typeof currentPrice.price)
    // console.log(typeof (+currentPrice.price - +lastOpPrice) / +lastOpPrice * 100)
    // console.log(`(Number(currentPrice.price) ${Number(currentPrice.price * usdPrice)} - Number(lastOpPrice) ${Number(lastOpPrice * usdPrice)}) / Number(lastOpPrice) ${Number(lastOpPrice * usdPrice)} * 100 = ${percentageDiff}`);

    if (openTrades.length > 0) {
        logger('SYSTEM', `There is an open order... orderId: ${openTrades[0].orderId}`, 'info');
        logger('SYSTEM', `Recheck trades...`, 'info');
        logger('SYSTEM', `NUMBER OF OPEN TRADES : ${openTrades.length}`, 'info');
        return;
    } else if (isNextOperationBuy) {
        tryToBuy(percentageDiff);
        logger('TRY-TO-BUY', `lastOpPrice => '${await lastOpPrice} = $${(await lastOpPrice * usdPrice).toFixed(2)}'`, 'INFO');
        logger('TRY-TO-BUY', `isNextOperationBuy => '${isNextOperationBuy}'`, 'INFO');
    } else {
        tryToSell(percentageDiff);
        logger('TRY-TO-SELL', `lastOpPrice => '${await lastOpPrice} = $${(await lastOpPrice * usdPrice).toFixed(2)}'`, 'INFO');
        logger('TRY-TO-SELL', `isNextOperationBuy => '${isNextOperationBuy}'`, 'INFO');
    }
};

const tryToBuy = (percentageDiff) => {

    logger('LOGIC', 'UPWARD_TREND_THRESHOLD = ' + UPWARD_TREND_THRESHOLD, 'debug');
    logger('LOGIC', 'DIP_THRESHOLD = ' + DIP_THRESHOLD, 'debug');
    logger('LOGIC', `${(percentageDiff >= UPWARD_TREND_THRESHOLD || percentageDiff <= DIP_THRESHOLD)}`, 'debug');
    
    if (percentageDiff >= UPWARD_TREND_THRESHOLD ||
        percentageDiff <= DIP_THRESHOLD) {
            lastOpPrice = binance.placeBuyOrder('ETHBTC');
            isNextOperationBuy = binance.operation.SELL;
            logger('TRY-TO-BUY', `percentageDiff => '${percentageDiff}'`, 'INFO');
            return lastOpPrice;
        }
    logger('LOGIC', 'Can\'t place order...', 'debug');
};

const tryToSell = (percentageDiff) => {
    
    logger('LOGIC', 'PROFIT_THRESHOLD = ' + PROFIT_THRESHOLD, 'debug');
    logger('LOGIC', 'STOP_LOSS_THRESHOLD = ' + STOP_LOSS_THRESHOLD, 'debug');
    logger('LOGIC', `${(percentageDiff >= PROFIT_THRESHOLD || percentageDiff <= STOP_LOSS_THRESHOLD)}`, 'debug');
    
    if (percentageDiff >= PROFIT_THRESHOLD ||
        percentageDiff <= STOP_LOSS_THRESHOLD) {
            lastOpPrice = binance.placeSellOrder('ETHBTC');
            isNextOperationBuy = binance.operation.BUY;
            logger('TRY-TO-SELL', `percentageDiff => '${percentageDiff}'`, 'INFO');
            return lastOpPrice;
        }
    logger('LOGIC', 'Can\'t place order...', 'debug');
};

const startBot = async () => {
    logger('SYSTEM', `######## Starting BOT ########`, 'info');

    while (binance) {
        try {
            // logger('SYSTEM', `Looking for trade...`, 'info');
            await attemptToMakeTrade();
            // logger('SYSTEM', `Sleeping for 30 sec...`, 'info');
            await binance.sleep(30000);
        } catch (critical) {
            logger('SYSTEM', `BOT failed, FATAL ERROR => '${critical}'`, 'CRITICAL');
        }
    }
};

startBot();