import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { renderToString } from 'react-dom/server';

try {
  const svg = renderToString(
    <QRCodeSVG 
      value="https://test.com" 
      size={160}
      level="H"
      imageSettings={{
        src: "/apple-touch-icon.png",
        x: undefined,
        y: undefined,
        height: 32,
        width: 32,
        excavate: true,
      }}
    />
  );
  console.log("SUCCESS:", svg.substring(0, 50));
} catch(e) {
  console.error("ERROR in QRCodeSVG:", e);
}
