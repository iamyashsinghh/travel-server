import { NextResponse } from 'next/server';

export async function GET() {
  const sendExpoPushNotification = async (token, title, message) => {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title: title,
        body: message,
        priority: 'high',
        useFcmV1: true,
        channelId: "default",
      }),
    });
    return response.json();
  };

  const tokens = [
    'ExponentPushToken[GwcCpSLerpY7FZdjyJajSV]',
    'ExponentPushToken[UdBDFaPmlaOCHjOjfDD92K]',
  ];

  const title = 'Test Notification';
  const message = 'This is a test notification';

  for (const token of tokens) {
    await sendExpoPushNotification(token, title, message);
  }

  return NextResponse.json({ success: true });

}

