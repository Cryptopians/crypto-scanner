const TICKER = 'btcusdt';

const UI = {
  ticker: document.getElementById('ticker'),
  bids: document.getElementById('bids'),
  asks: document.getElementById('asks'),
};

const wsStream = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${TICKER}@ticker`);

wsStream.onerror = (event) => {
  console.log(event);
};

wsStream.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.stream.endsWith('@ticker')) {
    const close = parseFloat(data.data.c);

    ticker.innerHTML = `${TICKER.toUpperCase()} $${close}`;
  }
};

const wsDepth = new WebSocket(`wss://stream.binance.com:9443/ws/${TICKER}@depth20@100ms`);

function renderDepth(entries, color, element) {
  let html = '';

  if (entries && entries.length) {
    for (const [price, quantity] of entries) {
      html += `<span style="color:${color};">$${parseFloat(price)}</span><span>${quantity}</span><br />`;
    }
  }

  element.innerHTML = html;
}

wsDepth.onerror = (event) => {
  console.log(event);
};

wsDepth.onmessage = (event) => {
  const data = JSON.parse(event.data);
  const bids = data.bids;
  const asks = data.asks;

  renderDepth(bids, 'green', UI.bids);
  renderDepth(asks, 'red', UI.asks);
};
