// Final manual Pages ZIP. Run a connected build and build-crm-commercial-core first.
// The media base is verified and contributes only unchanged approved media.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const mediaBase=path.resolve(process.argv[2] || '');
const sha=b=>createHash('sha256').update(b).digest('hex');
const mediaBaseSha='43c0edfbecfdab3bc670900db8143e59f2259270db3e7e70be9c8777e73e936f';
if(sha(await readFile(mediaBase))!==mediaBaseSha)throw new Error('Approved media-base ZIP hash mismatch');
const output=path.join(root,'outputs/checkout-clarity-V4.7.15');
await rm(output,{recursive:true,force:true});
await cp(path.join(root,'outputs/crm-commercial-core-NOT-PUBLISH'),output,{recursive:true});
execFileSync('python3',['-c',`
import pathlib,sys,zipfile
dest=pathlib.Path(sys.argv[2]).resolve()
with zipfile.ZipFile(sys.argv[1]) as z:
 if z.testzip():raise RuntimeError('Media base CRC failure')
 for f in z.infolist():
  if f.is_dir() or not f.filename.lower().endswith(('.webp','.jpeg','.jpg','.png','.avif','.svg','.woff','.woff2','.ttf')):continue
  target=(dest/f.filename).resolve()
  if not target.is_relative_to(dest):raise RuntimeError('Unsafe media path')
  b=z.read(f)
  if target.exists() and target.read_bytes()!=b:raise RuntimeError('Conflicting approved media: '+f.filename)
  target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b)
`,mediaBase,output]);
const files=[];
async function walk(dir){for(const d of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isDirectory())await walk(p);else files.push(path.relative(output,p));}}
await walk(output);
const manifest=JSON.parse(await readFile(path.join(output,'.vite/manifest.json'),'utf8'));
const references=new Set();
for(const value of Object.values(manifest))for(const file of [value.file,...value.css||[],...value.assets||[]])references.add(file);
for(const file of files){
 if(file.endsWith('.js'))execFileSync(process.execPath,['--check',path.join(output,file)]);
 if(!/\.(?:js|css|html)$/.test(file))continue;
 const text=await readFile(path.join(output,file),'utf8');
 for(const match of text.matchAll(/['"`]((?:\/|assets\/|\.\/)[^'"`\s?]+\.(?:js|css|webp|avif|jpe?g|png|svg|woff2?))['"`]/g)){
  const ref=match[1];references.add(ref.startsWith('./')?path.join(path.dirname(file),ref):ref.replace(/^\//,''));
 }
}
for(const ref of references)await readFile(path.join(output,ref));
for(const route of ['index.html','admin/index.html','pedido/index.html','informacoes-da-empresa/index.html','politica-de-privacidade/index.html','termos-de-uso/index.html','exclusao-de-dados/index.html','_worker.js','_headers','_routes.json'])await readFile(path.join(output,route));
const homeModule=await readFile(path.join(output,manifest['app/page.tsx'].file),'utf8');
if(!homeModule.includes('Ver pedido'))throw new Error('Contextual action absent from built home');
const data={release:'V4.7.15',purpose:'checkout clarity; manual Cloudflare Pages upload',source_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base_sha:'2f47d9b2e398aefba62179c3e3beb1bf066fd0c3',media_base_sha256:mediaBaseSha,production_deployment_id:null,published:false,files:[]};
for(const file of files.sort()){const b=await readFile(path.join(output,file));data.files.push({path:file,bytes:b.length,sha256:sha(b)});}
await writeFile(path.join(output,'RELEASE-MANIFEST.json'),JSON.stringify(data,null,2)+'\n');
const archive=path.join(root,'outputs/LUCIANE_DOCES_V4_7_15_CHECKOUT_CLAREZA_CLOUDFLARE.zip');
await rm(archive,{force:true});execFileSync('zip',['-q','-r',archive,'.'],{cwd:output});
execFileSync('python3',['-c','import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert len(z.namelist())==len(set(z.namelist()))',archive]);
const result={archive,sha256:sha(await readFile(archive)),files:files.length+1,media:files.filter(f=>/\.(webp|jpeg|jpg|png|svg|avif|woff2?)$/.test(f)).length,references:references.size,source_sha:data.source_sha};
await writeFile(path.join(root,'outputs/CHECKOUT_CLAREZA_INTEGRIDADE.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
