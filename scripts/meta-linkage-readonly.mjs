// Run only in an authorized local/server environment. Never paste tokens into chat.
// Configuration values are never echoed. All network requests are GET + redirect:error.
export async function verifyMetaLinkage(config,{fetchImpl=fetch}={}) {
  const {userToken,appToken,appId,wabaId,phoneId,callback,version}=config ?? {};
  if (![appId,wabaId,phoneId].every(v => /^\d+$/.test(v ?? '')) ||
    !/^v\d{2}\.\d+$/.test(version ?? '') || !userToken || !callback)
    return {ok:false,reason:'audit_configuration_missing'};
  const get = async (path,token) => {
    const r=await fetchImpl(`https://graph.facebook.com/${version}/${path}`,{
      method:'GET',headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(10000)});
    if (!r.ok) throw Error('read_unavailable');
    return r.json();
  };
  try {
    const p=await get(`${phoneId}?fields=id,is_on_biz_app,platform_type`,userToken);
    const numbers=await get(`${wabaId}/phone_numbers?fields=id&limit=100`,userToken);
    const apps=await get(`${wabaId}/subscribed_apps`,userToken);
    const subscriptions=appToken ? await get(`${appId}/subscriptions`,appToken) : {data:[]};
    // Truncated listings cannot prove linkage, and paging URLs may contain tokens.
    const complete=!numbers.paging?.next && !apps.paging?.next && !subscriptions.paging?.next;
    const subscription=subscriptions.data?.find(s => s.object==='whatsapp_business_account');
    const fields=(subscription?.fields ?? []).map(f => typeof f==='string' ? f : f.name);
    const result={complete,phone_matches:p.id===phoneId,
      phone_in_waba:numbers.data?.some(n=>n.id===phoneId)===true,
      app_in_waba:apps.data?.some(a=>(a.whatsapp_business_api_data?.id ?? a.id)===appId)===true,
      coexistence:p.is_on_biz_app===true && p.platform_type==='CLOUD_API',
      app_configuration_checked:Boolean(appToken),callback_matches:subscription?.callback_url===callback,
      messages_subscribed:fields.includes('messages'),echoes_subscribed:fields.includes('smb_message_echoes')};
    return {ok:complete && result.phone_matches && result.phone_in_waba && result.app_in_waba &&
      result.coexistence && result.callback_matches && result.messages_subscribed,...result};
  } catch {return {ok:false,reason:'authenticated_meta_read_failed'};}
}

if (process.argv[1] && import.meta.url===new URL(process.argv[1],'file://').href) {
  const e=process.env;
  const r=await verifyMetaLinkage({userToken:e.META_AUDIT_USER_TOKEN,appToken:e.META_AUDIT_APP_TOKEN,
    appId:e.META_AUDIT_APP_ID,wabaId:e.META_AUDIT_WABA_ID,phoneId:e.META_AUDIT_PHONE_ID,
    callback:e.META_AUDIT_CALLBACK,version:e.META_AUDIT_VERSION});
  process.stdout.write(JSON.stringify(r)+'\n');process.exitCode=r.ok ? 0 : 1;
}
