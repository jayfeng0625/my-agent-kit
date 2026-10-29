---
tags: [skill-creator]
max_turns: 200
timeout_seconds: 3600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash, Agent]
---

/hillclimb Cut the peak memory (max RSS) of `node src/cli.js --summary ../big.json` in the invoicer repo by at least 30%. Make the invoice with `node -e 'const lines=[];for(let i=0;i<60000;i++)lines.push({sku:"SKU-"+i,description:"Item "+i,qty:1+(i%5),unitPrice:+(1+(i%997)/100).toFixed(2)});console.log(JSON.stringify({customer:"Warehouse",region:"TX",lines}))' > ../big.json`.
