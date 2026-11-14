import{readFile,access}from'node:fs/promises';import{resolve,dirname}from'node:path';
for(const path of ['README.md','CHANGELOG.md','docs/near-contract.md','docs/near-demo.md','ASSETS.md']){const text=await readFile(path,'utf8');if(!text.trim())throw Error('Empty documentation: '+path);for(const match of text.matchAll(/\]\(([^)]+)\)/g)){const target=match[1];if(/^(https?:|#|mailto:)/.test(target))continue;await access(resolve(dirname(path),target.split('#')[0]));}}
console.log('Documentation files and relative links validated.');
