const TICKER = 'btcusdt';
const PRICE_THRESHOLD = 1500; // usdt
const QUANTITY_THRESHOLD = 0.1; // btc
const WALL_THRESHOLD = 10; // btc

const UI = {
  ticker: document.getElementById('ticker'),
  bids: document.getElementById('bids'),
  asks: document.getElementById('asks'),
};

const wsStream = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${TICKER}@ticker`);

let price = undefined;

wsStream.onerror = (event) => {
  console.log(event);
};

wsStream.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.stream.endsWith('@ticker')) {
    price = parseFloat(data.data.c);

    ticker.innerHTML = `${TICKER.toUpperCase()} $${price}`;
  }
};

const wsDepth = new WebSocket(`wss://stream.binance.com:9443/ws/${TICKER}@depth`);

let asks = [];
let bids = [];

function renderDepth(entries, color, element) {
  const max = Math.max.apply(Math, entries.map((obj) => obj[0] * obj[1]));

  let html = '';

  if (entries && entries.length) {

    for (let [price, quantity] of entries) {
      const total = price * quantity;
      const perc = Math.round((total / max) * 100);
      const size = 100 - perc;

      if (quantity >= WALL_THRESHOLD) {
        html = `<p style="font-weight:bolder;margin:0;padding:0;background:linear-gradient(90deg, #fff ${size}%, #f5f5f5 ${size}%);"><span style="color:${color};">$${price}</span><span style="float:right;">${quantity}</span></p>` + html;
      }

      html += `<p style="font-weight:lighter;margin:0;padding:0;background:linear-gradient(90deg, #fff ${size}%, #f5f5f5 ${size}%);"><span style="color:${color};">$${price}</span><span style="float:right;">${quantity}</span></p>`;
    }
  }

  element.innerHTML = html;
}

function replaceDepth(source, entries) {
  const min = Math.min.apply(Math, entries.map((obj) => obj[0]));
  const max = Math.max.apply(Math, entries.map((obj) => obj[0]));

  return source;
}

wsDepth.onerror = (event) => {
  console.log(event);
};

wsDepth.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (!price) {
    return;
  }

  // Define boundaries for price replacement
  const minAsks = parseFloat(data.a[0][0]);
  const maxAsks = parseFloat(data.a[data.a.length - 1][0]);
  const minBids = parseFloat(data.b[data.b.length - 1][0]);
  const maxBids = parseFloat(data.b[0][0]);

  const newAsks = data.a.reverse().map((obj) => [parseFloat(obj[0]), parseFloat(obj[1])]);
  const newBids = data.b.map((obj) => [parseFloat(obj[0]), parseFloat(obj[1])]);

  // Red (asks)
  asks = asks.concat(newAsks).filter((obj) => {
    if (obj[0] < minAsks || obj[0] > maxAsks) {
      return false;
    }

    if (obj[1] > QUANTITY_THRESHOLD && obj[0] > price && obj[0] < (price + PRICE_THRESHOLD)) {
      return true;
    }

    return false;
  }).sort((a, b) => a[0] - b[0]);

  // Green (bids)
  bids = bids.concat(newBids).filter((obj) => {
    if (obj[0] < minBids || obj[0] > maxBids) {
      return false;
    }

    if (obj[1] > QUANTITY_THRESHOLD && obj[0] < price && obj[0] > (price - PRICE_THRESHOLD)) {
      return true;
    }

    return false;
  }).sort((a, b) => a[0] - b[0]);

  // Render price entries
  renderDepth(asks, 'red', UI.asks);
  renderDepth(bids.reverse(), 'green', UI.bids);
};
