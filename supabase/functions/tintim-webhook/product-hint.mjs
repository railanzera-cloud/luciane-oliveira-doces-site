// Detecção efêmera de mencões EXPLÍCITAS a fatias na mensagem recebida.
 // O texto nunca é salvo/retornado. Uma menção não comprova compra nem opt-in.
const simplify=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const flavors=[
 ["fatia-chocolate-morango",/\bchocolate com morango\b/],
 ["fatia-ninho-morango",/\bninho com morango\b/],
 ["fatia-prestigio",/\bprestigio\b/],
 ["fatia-chocolate-maracuja",/\bchocolate com maracuja\b/],
 ["fatia-chocolatudo",/\bchocolatudo\b/],
 ["fatia-coco-cremoso-morango",/\bcoco cremoso(?: com morango)?\b/],
 ["fatia-chocolate-cenoura",/\bchocolate com cenoura\b|\bcenoura com chocolate\b/],
];
export function extractTintimProductMention(payload){
 if(!payload||typeof payload!=="object"||Array.isArray(payload))
  return {ignored:true,reason:"invalid_payload"};
 const type=simplify(payload.event_type??payload["event-type"]??payload.eventType??payload.type??payload.event);
 if(type!=="message create"||payload.from_me!==false&&payload.from_me!=="false")
   return {ignored:true,reason:"not_verified_inbound"};
 // Neste tenant homologado, message string significa texto; não inferir de anexos/objetos.
 if(typeof payload.message!=="string"||payload.message.length<2||payload.message.length>1200)
  return {ignored:true,reason:"not_plain_text"};
 const content=simplify(payload.message);
 if(!content||/\bhttps?\b|\bwww\b/.test(content))
  return {ignored:true,reason:"not_customer_statement"};
 const found=flavors.filter(([,regex])=>regex.test(content));
 if(found.length!==1)return {ignored:true,reason:found.length?"multiple_flavors":"no_flavor"};
 const product_id=found[0][0];
 const negation=/\b(?:nao quero|nao gostaria|nao tenho interesse|nao vou querer|desisti|cancela|cancelar)\b/.test(content);
 // "não quero X, mas quero Y" e mensagens contraditórias ficam fora da heurística.
 if(/\b(?:mas|porem|so que)\b/.test(content)&&negation)
  return {ignored:true,reason:"mixed_intent"};
 if(negation)return {ignored:false,action:"clear",product_id};
 // Requer sinal de pergunta/pedido sobre produto, não apenas menção casual ao nome.
 const context=/\b(?:quero|queria|tem|teria|tens|preco|valor|gostaria|comprar|pedido|pedir|levar|pegar|disponivel|quanto|posso|pode|me ve|me manda|separa)\b/.test(content);
 if(!context)return {ignored:true,reason:"context_missing"};
 return {ignored:false,action:"set",product_id};
}
