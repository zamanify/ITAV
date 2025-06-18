import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const gatewayKey = Deno.env.get('GATEWAY_API_KEY')!;
const gatewaySecret = Deno.env.get('GATEWAY_API_SECRET')!;

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
      const message = `Hej ${invite.receiverFirstName},\n${senderFirstName} vill bjuda in dig till att anv\u00e4nda It Takes A Village appen. En plats d\u00e4r alla hj\u00e4lper varandra. L\u00e4s mer i l\u00e4nken nedan.\n/OZOZ\n\nhttps://gatewayapi.com/docs/apis/simple/`;

      // GatewayAPI expects the msisdn without a leading '+'
      const msisdn = invite.phoneNumber.replace(/\D/g, '');

      const payload = {
        sender: 'OZOZ',
        message,
        recipients: [{ msisdn }]
      };

      const auth = 'Basic ' + btoa(`${gatewayKey}:${gatewaySecret}`);
      let status = 'failed';
      try {
        const smsRes = await fetch('https://gatewayapi.com/rest/mtsms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': auth
          },
          body: JSON.stringify(payload)
        });

        const smsResult = await smsRes.text();
        status = smsRes.ok ? 'sent' : 'failed';
        console.log('GatewayAPI response', smsRes.status, smsResult);
      } catch (err) {
        console.error('GatewayAPI fetch error', err);
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
