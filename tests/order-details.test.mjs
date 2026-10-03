import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';

const source=readFileSync(new URL('../app/pedido/page.tsx',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
const token='a'.repeat(48);
function render(order) {
 let index=0;
 const values=[token,order,false,'',''];
 const icon=props=>React.createElement('svg',props);
 const dependencies={
  'react':{useState:()=>[values[index++],()=>{}],useRef:()=>({current:0}),useEffect:()=>{},useCallback:fn=>fn},
  'react/jsx-runtime':jsx,
  'lucide-react':{Check:icon,Clock3:icon,LoaderCircle:icon,MessageCircle:icon,RefreshCw:icon,ShoppingBag:icon},
  'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
  '@/components/tintim-contact-link':{TintimContactLink:({message,children})=>React.createElement('a',{'data-contact-message':message},children)},
  '@/components/ui/button':{Button:({children,asChild,variant,...props})=>asChild?children:React.createElement('button',props,children)},
  '@/app/catalog':{DELIVERY_TIME_ESTIMATE:'Preparo e entrega: em média, 15 a 20 minutos.'},
  '@/app/order-checkout':{formatOrderMoney:value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value)},
  '@/lib/site-order':{sitePaymentLabel:method=>method==='manual_pix'?'Pix manual':'Dinheiro',loadPublicOrderStatus:()=>{},rememberOrder:()=>{},lastOrderToken:()=>token},
 };
 const exports={};
 new Function('require','exports',outputText)(name=>{assert.ok(name in dependencies,name);return dependencies[name];},exports);
 const previousWindow=globalThis.window;
 globalThis.window={location:{origin:'https://fixture.invalid'}};
 try {return renderToStaticMarkup(React.createElement(exports.default));}
 finally {if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;}
}
for(const [payment_method,card_mode,amount] of [['manual_pix',null,30],['cash',null,30],['card_on_delivery','credit_single',30.95],['card_on_delivery','debit',30.18]]) {
 test(`order details preserve items, payment, receiving and total — ${card_mode??payment_method}`,()=>{
  for(const fulfillment_type of ['pickup','delivery']) {
   const html=render({order_number:1025,payment_method,card_mode,card_fee:amount-30,payment_status:'pending',order_status:'new',fulfillment_type,total:amount,updated_at:'2026-10-01T12:00:00Z',items:[{name:'Chocolate com Morango',size_label:null,option_names:['Com calda de chocolate'],quantity:1}],sales_channel:'whatsapp'});
   assert.match(html,/Detalhes do pedido/); assert.match(html,/Pedido #1025/);
   assert.match(html,/Chocolate com Morango/); assert.match(html,/Com calda de chocolate/);
   assert.match(html,/Pagamento informado/); assert.ok(html.includes(fulfillment_type==='pickup'?'Retirada':'Entrega'));
   assert.ok(html.includes(new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(amount)));
   assert.match(html,/Último status informado pela loja/); assert.match(html,/Atualização registrada/);
   assert.match(html,/Para confirmar ou saber o andamento do pedido, fale com a loja pelo WhatsApp/);
   assert.match(html,/Falar com a loja/); assert.match(html,/Copiar link do pedido/); assert.match(html,/Atualizar detalhes/);
   assert.ok(html.includes(`/pedido?token=${token}`));
   assert.doesNotMatch(html,/Acompanhe|em tempo real|Situação atual|Envie a mensagem pelo WhatsApp e aguarde/);
  }
 });
}
