import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const gatewayToken = Deno.env.get('GATEWAY_API_TOKEN')!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface Invite {
  id: string;
  phoneNumber: string;
  receiverFirstName: string;
}

serve(async (req) => {
  try {
    const { invites, senderFirstName } = await req.json();
    if (!Array.isArray(invites) || invites.length === 0) {
      return new Response(JSON.stringify({ error: 'No invites provided' }), { status: 400 });
    }

    for (const invite of invites as Invite[]) {
      const message = `Hej ${invite.receiverFirstName},\n${senderFirstName} vill bjuda in dig till att använda It Takes A Village appen. En plats där alla hjälper varandra. Läs mer i länken nedan.\n/OZOZ\n\nLINK`;

      let msisdn = invite.phoneNumber.replace(/\D/g, '');
      if (msisdn.startsWith('00')) msisdn = msisdn.slice(2);
      if (msisdn.startsWith('0')) msisdn = '46' + msisdn.slice(1);
      if (!msisdn.startsWith('46')) msisdn = '46' + msisdn;

      const payload = {
        sender: 'ExampleSMS',
        message,
        recipients: [{ msisdn }]
      };

      let status = 'failed';
      try {
        const smsRes = await fetch('https://gatewayapi.com/rest/mtsms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${gatewayToken}`,
          },
          body: JSON.stringify(payload)
        });
        status = smsRes.ok ? 'sent' : 'failed';
      } catch (e) {
        console.error('GatewayAPI error', e);
      }

      await supabase
        .from('villager_invite')
        .update({ sms_sent_at: new Date().toISOString(), sms_status: status })
        .eq('id', invite.id);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('send-invite-sms error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
