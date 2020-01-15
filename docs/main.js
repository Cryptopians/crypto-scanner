const ASSET_A = 'btc';
const ASSET_B = 'usdt';
const TICKER = `${ASSET_A}${ASSET_B}`;

const DEPTH_SNAPSHOT_URL = `https://www.binance.com/api/v1/depth?symbol=${TICKER.toUpperCase()}&limit=1000`;

const UI = {
  ticker: document.getElementById('ticker'),
  bids: document.getElementById('bids'),
  asks: document.getElementById('asks'),
  currentPrices: $('.current-price'),
  sellWalls: document.getElementById('sell-walls'),
  buyWalls: document.getElementById('buy-walls'),
};

let WALL_THRESHOLD = 25; // btc
let MAX_ORDERS_TO_RENDER = 50;

let wsStream;
let wsDepth;
let currentPrice;
let lastUpdateId;
let sells = {};
let buys = {};

function Order(price, quantity) {
  this.price = price;
  this.quantity = quantity;
}

function init() {
  initForm();

  fetch(DEPTH_SNAPSHOT_URL, {
    mode: 'no-cors'
  }).then((res) => {
    console.log(res);
  }).catch((err) => console.log(err));

  initStream();
  initDepth();
}

function initForm() {
  
}

function initStream() {
  wsStream = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${TICKER}@ticker`);

  wsStream.onerror = (event) => {
    console.log(event);
  };

  wsStream.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.stream.endsWith('@ticker')) {
      const close = parseFloat(data.data.c);

      // Update ticker
      if (currentPrice && close > currentPrice) {
        ticker.innerHTML = `<span class="buy">$${close}&#9650;</span>`;
      } else if (currentPrice && close < currentPrice) {
        ticker.innerHTML = `<span class="sell">$${close}&#9660;</span>`;
      } else {
        ticker.innerHTML = `$${close}`;
      }

      // Update browser title
      document.title = `${TICKER.toUpperCase()} | $${close}`;

      // Update prices
      UI.currentPrices.html(`$${close}`);

      // Cache current price in memory
      currentPrice = close;
    }
  };
}

function initDepth() {
  wsDepth = new WebSocket(`wss://stream.binance.com:9443/ws/${TICKER}@depth`);

  wsDepth.onerror = (event) => {
    console.log(event);
  };

  wsDepth.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // Drop any event where u is <= lastUpdateId in the snapshot
    if (lastUpdateId && data.u <= lastUpdateId) {
      return;
    }

    // Update lastUpdateId
    lastUpdateId = data.u;

    // Update bid(s) in order book
    for (const bid of data.b) {
      const order = new Order(parseFloat(bid[0]), parseFloat(bid[1]))

      // If the quantity is 0, remove the price level
      if (order.quantity === 0) {
        delete buys[order.price];
      } else {
        buys[order.price] = order;
      }
    }

    // Update ask(s) in order book
    for (const ask of data.a) {
      const order = new Order(parseFloat(ask[0]), parseFloat(ask[1]))

      // If the quantity is 0, remove the price level
      if (order.quantity === 0) {
        delete sells[order.price];
      } else {
        sells[order.price] = order;
      }

      // Update the dom
      render();
    }
  }
}

function renderWalls(orderBook, element, className, label, reversed) {
  let sortedOrders = Object.values(orderBook).sort((a, b) => a.price - b.price);

  if (reversed) {
    sortedOrders = sortedOrders.reverse();
  }

  let walls = sortedOrders.filter((obj) => {
    return obj.quantity >= WALL_THRESHOLD;
  });

  if (walls.length > 5) {
    walls = walls.slice(0, 5);
  }

  let html = ``;

  walls.forEach((obj) => {
    html += `
      <p>
        <span class="price">$${obj.price}</span>
        <span class="quantity">${obj.quantity} ${ASSET_B.toUpperCase()}</span>
      </p>
    `;
  });

  if (html.length) {
    element.innerHTML = `
      <div class="alert ${className}">
        <h5 class="alert-heading">
          Closest ${label} wall(s)
        </h5>
        ${html}
      </div>
    `;
  }
}

function renderOrders(orderBook, className, element, reversed) {
  let sortedOrders = Object.values(orderBook).sort((a, b) => a.price - b.price);

  if (reversed) {
    sortedOrders = sortedOrders.reverse();
  }

  let html = '';

  if (sortedOrders.length > MAX_ORDERS_TO_RENDER) {
    sortedOrders = sortedOrders.slice(0, MAX_ORDERS_TO_RENDER);
  }

  let highestOrderQuantity = Math.max.apply(Math, sortedOrders.map((obj) => obj.quantity));

  sortedOrders.forEach((obj) => {
    const percentage = Math.round((obj.quantity / highestOrderQuantity) * 100);
    const size = 100 - percentage;

    if (obj.quantity >= WALL_THRESHOLD) {
      html += `<p class="order bold" style="background:linear-gradient(90deg, #off34 ${size}%, #f5f5f5 ${size}%);"><span class="${className}">$${obj.price}</span><span class="quantity">${obj.quantity}</span></p>`;      
    } else {
      html += `<p class="order" style="background:linear-gradient(90deg, #fff ${size}%, #f5f5f5 ${size}%);"><span class="${className}">$${obj.price}</span><span class="quantity">${obj.quantity}</span></p>`;
    }
  });

  element.innerHTML = html;
}

function render() {
  // Sell orders
  renderWalls(sells, UI.sellWalls, 'alert-danger', 'sell', false);
  renderOrders(sells, 'text-danger', UI.bids, false);

  // Buy orders
  renderWalls(buys, UI.buyWalls, 'alert-success', 'buy', true);
  renderOrders(buys, 'text-success', UI.asks, true);
}

init();
