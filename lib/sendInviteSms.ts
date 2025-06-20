export async function sendInviteSms(msisdn: string, message: string) {
  const token = process.env.EXPO_PUBLIC_GATEWAY_API_TOKEN;
  if (!token) {
    throw new Error('EXPO_PUBLIC_GATEWAY_API_TOKEN is required');
  }
  const payload = {
    sender: 'ExampleSMS',
    message,
    recipients: [
      { msisdn }
    ]
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

  return resp.json();
}
