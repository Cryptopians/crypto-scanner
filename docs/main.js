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

const wsDepth = new WebSocket(`wss://stream.binance.com:9443/ws/${TICKER}@depth`);

function renderDepth(entries, color, element) {
  const max = Math.max.apply(Math, entries.map((obj) => parseFloat(obj[0]) * parseFloat(obj[1])));

  let html = '';

  if (entries && entries.length) {
    for (const [price, quantity] of entries) {
      const total = parseFloat(price) * parseFloat(quantity);
      const perc = Math.round((total / max) * 100);
      const size = 100 - perc;

      html += `<p style="margin:0;padding:0;background:linear-gradient(90deg, #fff ${size}%, #f5f5f5 ${size}%);"><span style="color:${color};">$${parseFloat(price)}</span><span style="float:right;">${quantity}</span></p>`;
    }
  }

  element.innerHTML = html;
}

wsDepth.onerror = (event) => {
  console.log(event);
};

wsDepth.onmessage = (event) => {
  const data = JSON.parse(event.data);
  const bids = data.b;
  const asks = data.a.reverse();

  renderDepth(bids, 'green', UI.bids);
  renderDepth(asks, 'red', UI.asks);
};
