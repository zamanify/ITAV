import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioApiKey = Deno.env.get('TWILIO_API_KEY_SID');
const twilioApiSecret = Deno.env.get('TWILIO_API_KEY_SECRET');
const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret || !twilioFromNumber) {
  throw new Error('Twilio environment variables are not configured');
}

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
      const message = `Hej,\n${senderFirstName} vill bjuda in dig att anv\u00e4nda It Takes A Village. En plats f\u00f6r oss som hj\u00e4lps \u00e5t. L\u00e4s mer p\u00e5 ittakesavillage.se.\n\n/OZOZ`;

      // Format number to E.164 (+46...) similar to frontend logic
      let to = invite.phoneNumber.replace(/[^+\d]/g, '');
      if (to.startsWith('+')) {
        to = to.slice(1);
      } else if (to.startsWith('00')) {
        to = to.slice(2);
      } else if (to.startsWith('0')) {
        to = '46' + to.slice(1);
      }
      if (!to.startsWith('46')) {
        to = '46' + to;
      }
      to = '+' + to;

      const form = new URLSearchParams({
        To: to,
        From: twilioFromNumber!,
        Body: message
      });

      console.log('Sending SMS', form.toString());

      const auth = 'Basic ' + btoa(`${twilioApiKey}:${twilioApiSecret}`);
      let status = 'failed';
      try {
        const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': auth
          },
          body: form.toString()
        });

        const smsResult = await smsRes.text();
        status = smsRes.ok ? 'sent' : 'failed';
        console.log('Twilio response', smsRes.status, smsResult);
      } catch (err) {
        console.error('Twilio fetch error', err);
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
