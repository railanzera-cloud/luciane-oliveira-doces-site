// Local-only test routes. Remove before builds or packaging. No production client.
import { cp, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const routes=['crm-qa','crm-qa-mobile'];
if(process.argv.includes('--clean')) {
 for(const name of routes) await rm(new URL('../app/'+name,import.meta.url),{recursive:true,force:true});
} else {
 const status=execFileSync('git',['status','--porcelain'],{encoding:'utf8'});
 if(routes.some(name=>status.includes('app/'+name+'/'))) throw new Error('QA routes already exist; clean them explicitly first.');
 for(const [index,name] of routes.entries()) {
  await mkdir(new URL('../app/'+name,import.meta.url),{recursive:true});
  await cp(new URL('../tests/fixtures/'+(index?'crm-assisted-mobile':'crm-assisted-browser')+'.tsx',import.meta.url), new URL('../app/'+name+'/page.tsx',import.meta.url),{errorOnExist:true,force:false});
 }
 console.log('Local QA routes: /crm-qa and /crm-qa-mobile. Run this script with --clean BEFORE building.');
}
