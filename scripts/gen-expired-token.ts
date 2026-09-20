import { encodeInvoice } from '../src/lib/nerva/nlink'
const t = encodeInvoice({ v: 1, a: 'NVAjsQEK9kNHHGTzxStEeHC1scFhbB6gC4Q9Y8LkQ2yNmTX7ciTKR2DGiC1fv8b7BfmGCvRM9QJYVvgTBNAwkV3hLm7YEvWRcZ2EJBsHK7fhQ3mKTHrQaYq7cSgWcpF1CmVfY2', amt: '0', d: 'Paid but expired link', n: 'XelisVault test', pid: '2dd6929712e4e6ddf8e4069b2c2c93540476f2dcd9d756c36ee9c7832f518187', h: 4384833, exp: Math.floor(Date.now()/1000) - 3600 })
console.log(t)
