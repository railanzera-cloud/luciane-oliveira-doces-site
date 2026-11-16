// stdin JSON: normalized episode + order/availability/permission snapshots.
// Outputs decisions only; no phone, conversation key, chat body or credentials.
import { evaluateRecoveryShadow } from '../supabase/functions/_shared/recovery-shadow.mjs';
let input = '';
try {
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > 1048576) throw new Error('input_limit');
  }
  const snapshot = JSON.parse(input);
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) ||
      !Array.isArray(snapshot.events) || snapshot.events.length > 1000) throw new Error('input_invalid');
  process.stdout.write(JSON.stringify(evaluateRecoveryShadow(snapshot))+'\n');
} catch {
  process.stderr.write('Shadow replay rejected input; no data or messages written.\n');
  process.exitCode = 1;
}
