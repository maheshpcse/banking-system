/**
 * Mirror of banking-system-server seed. Prefer running from the API repo:
 *   npm run seed:admin
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('Set MONGODB_URI before seeding.');
  let User;
  try {
    User = require('../src/models/User');
  } catch {
    User = require('../../src/models/User');
  }
  const email = String(process.env.ADMIN_EMAIL || 'admin@novabank.local').toLowerCase().trim();
  const username = String(process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const password = String(process.env.ADMIN_PASSWORD || 'Admin@12345');
  const role = String(process.env.ADMIN_ROLE || 'admin').toLowerCase().trim();
  if (!['admin', 'manager'].includes(role)) throw new Error('ADMIN_ROLE must be admin or manager');
  await mongoose.connect(uri);
  let user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    user = await User.create({
      fullName: role === 'admin' ? 'NovaBank Super Admin' : 'NovaBank Manager',
      username, email, password, role,
      isSuperAdmin: role === 'admin',
      staffStatus: 'active',
      accountNumber: null,
      accountStatus: 'active',
      balance: 0,
      avatar: { style: 'slate', initials: 'NB', image: null }
    });
    console.log(`Created ${role}: ${username}`);
  } else {
    user.role = role;
    user.password = password;
    user.staffStatus = 'active';
    if (role === 'admin') user.isSuperAdmin = true;
    await user.save();
    console.log(`Updated ${role}: ${username}`);
  }
  await mongoose.disconnect();
}
main().catch(async (e) => { console.error(e); try { await mongoose.disconnect(); } catch {} process.exit(1); });
