import { mysqlPool } from '../src/db/mysql.js'
import { ensureMembershipSchema, runMembershipJobs } from '../src/services/membership.js'

await ensureMembershipSchema()
const result = await runMembershipJobs()
console.log('membership schema synced')
console.log(result)
await mysqlPool.end()
