const https = require('https');

const token = 'EAAeS17NO3pMBRfiYt9OsuMq5WZAZBEA9yv7cS8obXULeBOQfffBugZCCD0v5iZBJKyuf9ZBdhiUAQAYnNbVIrmN5vAGeTqDC16xiYRWWqMdkJZBoVGICLs67R2KrvoQ4CdvNlvRRtj6YDNqCeyJHVwy4X0QlBgCDjTPZCy3Yi342W8jPXP4R3BScOc8JjZCTAwZDZD';
const pageId = '1143247968865489';
const url = `https://graph.facebook.com/v20.0/${pageId}?fields=instagram_business_account&access_token=${token}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log(data);
  });
}).on('error', (err) => {
  console.error(err);
});
