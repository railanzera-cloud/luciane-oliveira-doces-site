// Parser sem texto nem midia: somente IDs, direcao, telefone e timestamp.
// Nenhum dado da mensagem privada e mantido no banco.
const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const safePhone = (v) => typeof v === "string" && /^[+0-9]{10,20}$/.test(v.trim()) ? v.trim() : null;
const safeMessageId = (v) => typeof v === "string" && /^wamid\.[A-Za-z0-9=+/_-]{3,290}$/.test(v) ? v : null;
const safeTimestamp = (v) => {
  const n=Number(v);
  return Number.isSafeInteger(n) && n>=1700000000 && n<=4102444800
    ? new Date(n*1000).toISOString() : null;
};

export function extractOfficialMessageEvents(payload, expectedPhoneNumberId) {
  if (object(payload).object !== "whatsapp_business_account" || !expectedPhoneNumberId) return [];
  const events=[];
  for (const entry of Array.isArray(payload.entry)?payload.entry.slice(0,15):[]) {
    for (const change of Array.isArray(entry.changes)?entry.changes.slice(0,15):[]) {
      const value=object(change.value);
      if (String(object(value.metadata).phone_number_id||"") !== String(expectedPhoneNumberId)) continue;
      let messages=[];
      let direction="";
      if (change.field === "messages") {
        messages=Array.isArray(value.messages)?value.messages:[];
        direction="inbound";
      } else if (change.field === "smb_message_echoes") {
        messages=Array.isArray(value.message_echoes)?value.message_echoes:[];
        direction="app_echo";
      } else continue;
      for (const raw of messages.slice(0,100)) {
        const message=object(raw);
        const id=safeMessageId(message.id);
        const phone=safePhone(direction==="inbound"?message.from:message.to);
        const occurred_at=safeTimestamp(message.timestamp);
        if (!id || !phone || !occurred_at) continue;
        events.push({message_id:id,phone,direction,occurred_at});
      }
    }
  }
  return events.slice(0,100);
}
