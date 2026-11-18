import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createRecoveryDueHandler} from "../_shared/recovery-due-handler.mjs";
// Candidate only. Deploy with verify_jwt=true; no API for caller-supplied scope.
Deno.serve(createRecoveryDueHandler({env:(name:string)=>Deno.env.get(name),
 log:(tag:string,summary:string)=>console.info(tag,summary)}));
