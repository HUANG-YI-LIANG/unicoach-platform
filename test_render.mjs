import React from 'react';
import { renderToString } from 'react-dom/server';
import PromotionCard from './components/PromotionCard.js';

try {
  const html = renderToString(<PromotionCard user={{ promotion_code: 'TEST12', wallet_balance: 100 }} />);
  console.log("Success:", html.substring(0, 50));
} catch(e) {
  console.error("Error:", e);
}
