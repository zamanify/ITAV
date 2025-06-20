async function sendSMS() {
  const token = process.env.GATEWAY_API_TOKEN;
  if (!token) {
    throw new Error('GATEWAY_API_TOKEN environment variable is required');
  }
  const payload = {
    sender: 'ExampleSMS',
    message: 'Hello World',
    recipients: [
      { msisdn: 4512345678 },
    ],
  };

  const resp = await fetch(
    'https://gatewayapi.com/rest/mtsms',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
    },
  );

  console.log(await resp.json());
}

sendSMS().catch(err => {
  console.error(err);
});
